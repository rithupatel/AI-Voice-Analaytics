import asyncio
import logging
import os
import shutil
import struct
import wave

from sqlalchemy import select, update

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import Recording
from app.services.alignment import generate_stage3_json
from app.services.llm_analytics import (
    analyze_speaker_emotion,
    analyze_speaker_emotion_from_audio,
    analyze_transcript_with_gpt4o_mini,
    get_pii_phrases_locally,
    scrub_pii_pytorch,
)
from app.services.speech_pipeline import (
    find_pii_timestamps,
    normalize_audio,
    run_mimo_asr,
    run_pyannote_diarization,
    split_audio_by_speaker,
)

logger = logging.getLogger("pipeline_service")

# --- Async DB Helpers for Sync Celery Task ---

async def _get_recording_db(recording_id: str):
    for attempt in range(5):
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Recording).where(Recording.id == recording_id))
            rec = result.scalars().first()
            if rec:
                return {
                    "id": rec.id,
                    "title": rec.title,
                    "file_path": rec.file_path,
                    "s3_key": rec.s3_key
                }
        await asyncio.sleep(1)
    return None

async def _update_recording_status(recording_id: str, status: str, duration: float | None = None, error_message: str | None = None):
    async with AsyncSessionLocal() as session:
        values = {"status": status}
        if duration is not None:
            values["duration_seconds"] = duration
        if error_message is not None:
            values["error_message"] = error_message
        await session.execute(update(Recording).where(Recording.id == recording_id).values(**values))
        await session.commit()

async def _update_recording_peaks(recording_id: str, peaks: list):
    async with AsyncSessionLocal() as session:
        await session.execute(update(Recording).where(Recording.id == recording_id).values(peaks_json=peaks))
        await session.commit()

async def _update_recording_transcripts(recording_id: str, status: str, speakers: list, transcripts: list):
    async with AsyncSessionLocal() as session:
        await session.execute(update(Recording).where(Recording.id == recording_id).values(
            status=status,
            speakers_json=speakers,
            transcripts_json=transcripts
        ))
        await session.commit()

async def _update_recording_word_timestamps(recording_id: str, word_timestamps: list):
    async with AsyncSessionLocal() as session:
        await session.execute(update(Recording).where(Recording.id == recording_id).values(
            word_timestamps_json=word_timestamps
        ))
        await session.commit()

async def _update_recording_analysis(recording_id: str, status: str, analysis: dict):
    async with AsyncSessionLocal() as session:
        await session.execute(update(Recording).where(Recording.id == recording_id).values(
            status=status,
            analysis_json=analysis
        ))
        await session.commit()

def generate_waveform_peaks(wav_path: str, num_points: int = 800) -> list:
    try:
        if not os.path.exists(wav_path):
            return []
        with wave.open(wav_path, 'rb') as wf:
            nframes = wf.getnframes()
            sampwidth = wf.getsampwidth()
            chunk_size = max(1, nframes // num_points)
            peaks = []
            for _ in range(num_points):
                raw_data = wf.readframes(chunk_size)
                if not raw_data:
                    break
                if sampwidth == 2:
                    fmt = f'<{len(raw_data)//2}h'
                    samples = struct.unpack(fmt, raw_data)
                    peaks.append(max([abs(s) for s in samples]) if samples else 0)
                else:
                    peaks.append(0)
            if peaks:
                max_val = max(peaks)
                if max_val > 0:
                    return [round(p/max_val, 3) for p in peaks]
        return peaks
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Failed to generate waveform peaks: {e}")
        return []

def process_voice_analysis_pipeline(recording_id: str):
    """
    Background worker executing the complete 6-Stage AI Voice Analysis Pipeline.
    Stores all stage outputs, transcripts, and analytics strictly in SQLite Database (Single Source of Truth).
    """
    rec_data = asyncio.run(_get_recording_db(recording_id))
    if not rec_data:
        logger.error(f"Recording {recording_id} not found in database.")
        return

    try:
        asyncio.run(_update_recording_status(recording_id, "PREPROCESSING"))
        settings.reload_env()

        print("\n==================================================", flush=True)
        print(f"🚀 STARTING PIPELINE FOR RECORDING: {rec_data['title']} ({recording_id})", flush=True)
        print("==================================================", flush=True)
        
        file_path = rec_data.get("file_path")
        s3_key = rec_data.get("s3_key")
        
        if s3_key and (not file_path or not os.path.exists(file_path)):
            print(f"  [S3 DOWNLOAD] Downloading {s3_key} from S3...", flush=True)
            from app.services.s3_storage import download_file_from_s3
            if not file_path:
                file_ext = os.path.splitext(s3_key)[1]
                file_path = os.path.join(settings.MEDIA_DIR, "uploads", f"dl_{recording_id}{file_ext}")
            download_file_from_s3(s3_key, file_path)

        # Stage 1: Audio Normalization
        print("  [STAGE 1/6] 🎧 Normalizing audio to 16kHz 16-bit PCM Mono baseline...", flush=True)
        normalized_path = os.path.join(settings.MEDIA_DIR, "processed", f"{recording_id}_16k.wav")
        duration = normalize_audio(file_path, normalized_path)
        
        peaks_data = generate_waveform_peaks(normalized_path)
        asyncio.run(_update_recording_peaks(recording_id, peaks_data))
        
        asyncio.run(_update_recording_status(recording_id, "DIARIZING", duration=duration))
        print(f"  ✓ Stage 1 Complete: Audio normalized. Duration = {duration} seconds.", flush=True)

        # Stage 2A: Speaker Diarization
        print("  [STAGE 2A/6] 🗣️ Running PyAnnote Speaker Diarization...", flush=True)
        diarization_map = run_pyannote_diarization(normalized_path, settings.HF_TOKEN)
        asyncio.run(_update_recording_status(recording_id, "TRANSCRIBING"))
        print(f"  ✓ Stage 2A Complete: Extracted {len(diarization_map)} speaker turn intervals.", flush=True)

        # Stage 2B: Intact ASR Transcription
        print("  [STAGE 2B/6] 🎙️ Running MiMo-V2.5-ASR (Intact Transcription)...", flush=True)
        asr_segments, asr_words = run_mimo_asr(normalized_path, settings.OPENAI_API_KEY)
        asyncio.run(_update_recording_status(recording_id, "ALIGNING"))
        print(f"  ✓ Stage 2B Complete: Extracted {len(asr_segments)} intact sentence segments.", flush=True)

        # Stage 3: Alignment
        print("  [STAGE 3/6] 🔗 Executing Alignment Engine...", flush=True)
        stage3_json = generate_stage3_json(recording_id, duration, asr_segments, diarization_map)
        print(f"  ✓ Stage 3 Complete: Aligned {len(stage3_json.get('aligned_transcript', []))} transcript entries.", flush=True)
        
        # Stage 3B: Local Privacy Filter
        print("  [STAGE 3B/6] 🔒 Running Local Privacy Filter & Audio Redaction...", flush=True)
        try:
            full_raw_text = " ".join([item.get("text", "") for item in stage3_json.get("aligned_transcript", [])])
            pii_phrases = get_pii_phrases_locally(full_raw_text)
            
            if pii_phrases:
                redaction_ranges = find_pii_timestamps(asr_words, pii_phrases)
                if redaction_ranges:
                    for w in asr_words:
                        w_start = w.get("start_time", 0.0)
                        w_end = w.get("end_time", 0.0)
                        for r_start, r_end in redaction_ranges:
                            if w_start >= r_start - 0.1 and w_end <= r_end + 0.1:
                                w["word"] = "[REDACTED]"
                                break
        except Exception:
            logger.exception("Failed to execute OpenAI Privacy Filter:")

        asyncio.run(_update_recording_word_timestamps(recording_id, asr_words))

        try:
            mono_copy_path = os.path.join(settings.ROOT_DIR, "data", f"mono_{recording_id}.wav")
            shutil.copyfile(normalized_path, mono_copy_path)
        except Exception:  # noqa: BLE001, S110
            pass

        txt_file_path = os.path.join(settings.TRANSCRIPTS_DIR, f"transcript_{recording_id}.txt")
        with open(txt_file_path, "w", encoding="utf-8") as f:
            for entry in stage3_json.get("aligned_transcript", []):
                speaker = entry.get("display_name", entry.get("speaker_label", "Unknown"))
                ts_start = entry.get("start_time", 0.0)
                ts_end = entry.get("end_time", 0.0)
                text = entry.get("text", "")
                text = scrub_pii_pytorch(text)
                f.write(f"[{ts_start:05.2f} - {ts_end:05.2f}] {speaker}: {text}\n")

        # Stage 4: Store in DB
        print("  [STAGE 4/6] 💾 Saving Transcripts directly to DB (SOT)...", flush=True)
        scrubbed_transcripts = []
        for entry in stage3_json.get("aligned_transcript", []):
            scrubbed_entry = entry.copy()
            scrubbed_entry["text"] = scrub_pii_pytorch(entry.get("text", ""))
            scrubbed_transcripts.append(scrubbed_entry)

        asyncio.run(_update_recording_transcripts(recording_id, "ANALYZING", stage3_json.get("speakers", []), scrubbed_transcripts))
        
        # Stage 4B: Channel Separation
        print("  [STAGE 4B/6] ✂️  Isolating audio channels per speaker...", flush=True)
        isolated_paths = split_audio_by_speaker(normalized_path, stage3_json, os.path.join(settings.MEDIA_DIR, "processed"))

        # Stage 5: GPT-4o-mini Analytics
        print("  [STAGE 5/6] 🧠 Ingesting Clean Dialogue into GPT-4o-mini...", flush=True)
        llm_result, _clean_dialogue_text = analyze_transcript_with_gpt4o_mini(stage3_json, settings.OPENAI_API_KEY)

        dead_air_comments = []
        aligned_ts = stage3_json.get("aligned_transcript", [])
        if aligned_ts:
            sorted_ts = sorted(aligned_ts, key=lambda x: x.get("start_time", 0.0))
            last_end = 0.0
            for seg in sorted_ts:
                start = seg.get("start_time", 0.0)
                gap = start - last_end
                if gap > 120.0:
                    dead_air_comments.append(f"{round(gap / 60.0, 1)} mins")
                last_end = max(last_end, seg.get("end_time", 0.0))
            if duration - last_end > 120.0:
                dead_air_comments.append(f"{round((duration - last_end) / 60.0, 1)} mins")
                
        if dead_air_comments and llm_result:
            llm_result["call_summary"] += f"\n\nNote: Continuous dead air observed for {', '.join(dead_air_comments)}."

        # Stage 5B: Emotion Evaluation
        print("  [STAGE 5B/6] 🎭 Evaluating Speaker Emotions via OpenAI Audio Analyzer...", flush=True)
        emotion_results = {}
        for spk, iso_audio_path in isolated_paths.items():
            emo_data = analyze_speaker_emotion_from_audio(iso_audio_path, spk, settings.OPENAI_API_KEY)
            if not emo_data or emo_data.get("emotion") == "Unknown" or emo_data.get("confidence") == "LOW":
                spk_text = " ".join([item.get("text", "") for item in stage3_json.get("aligned_transcript", []) if item.get("speaker_label") == spk])
                fallback_emo = analyze_speaker_emotion(scrub_pii_pytorch(spk_text), spk, settings.OPENAI_API_KEY)
                if fallback_emo and fallback_emo.get("emotion") != "Unknown":
                    emo_data = fallback_emo
            emotion_results[spk] = emo_data

        if llm_result:
            for intent in llm_result.get("speaker_intents", []):
                spk_lbl = intent.get("speaker_label")
                if spk_lbl in emotion_results:
                    intent["emotional_state"] = emotion_results[spk_lbl].get("emotion", intent.get("emotional_state", "Unknown"))
                    intent["frustration_level"] = emotion_results[spk_lbl].get("frustration_level", "Unknown")
                    intent["calmness_level"] = emotion_results[spk_lbl].get("calmness_level", "Unknown")
                    intent["perplexity_level"] = emotion_results[spk_lbl].get("perplexity_level", "Unknown")

        asyncio.run(_update_recording_analysis(recording_id, "COMPLETED", llm_result))

        # Cleanup local file (SOT Media is S3)
        if s3_key:
            try:
                os.remove(file_path)
            except Exception:  # noqa: BLE001, S110
                pass

        print("==================================================", flush=True)
        print(f"🎉 PIPELINE COMPLETED SUCCESSFULLY FOR RECORDING: {rec_data['title']}", flush=True)
        print("==================================================\n", flush=True)

    except Exception as e:
        logger.exception(f"Pipeline failed for recording {recording_id}:")
        asyncio.run(_update_recording_status(recording_id, "FAILED", error_message=str(e)))

class PipelineService:
    @staticmethod
    def dispatch_pipeline_tasks(agent_name: str, original_file_name: str, uuid: str, checksum: str, s3_object_name: str | None = None):
        from app.celery_app import (
            log_upload_to_dbeaver_task,
            process_voice_analysis_pipeline_task,
        )
        log_upload_to_dbeaver_task.delay(
            agent_name=agent_name or "Unknown Agent",
            original_file_name=original_file_name,
            uuid=uuid,
            checksum=checksum,
            s3_object_name=s3_object_name
        )
        process_voice_analysis_pipeline_task.delay(uuid)

    @staticmethod
    def dispatch_reprocess_task(uuid: str):
        from app.celery_app import process_voice_analysis_pipeline_task
        process_voice_analysis_pipeline_task.delay(uuid)
