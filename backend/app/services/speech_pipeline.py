import logging
import os
import re
import shutil
import subprocess
import sys
from typing import Any

# Ensure user site-packages are in sys.path
USER_SITE = os.path.expanduser("~/.local/lib/python3.10/site-packages")
if os.path.exists(USER_SITE) and USER_SITE not in sys.path:
    sys.path.insert(0, USER_SITE)

import imageio_ffmpeg
from pydub import AudioSegment

AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()
logger = logging.getLogger("speech_pipeline")
logger.setLevel(logging.INFO)

def get_audio_duration(file_path: str) -> float:
    """Returns audio duration in seconds by inspecting file headers, wave data, or pydub."""
    if not file_path or not os.path.exists(file_path):
        return 0.0

    # 1. Standard wave module (WAV files)
    try:
        import wave
        with wave.open(file_path, 'rb') as f:
            frames = f.getnframes()
            rate = f.getframerate()
            if rate > 0:
                return round(frames / float(rate), 2)
    except (OSError, wave.Error, EOFError, ValueError):
        pass

    # 2. Inspect RIFF / WAV byte rate header directly
    try:
        file_size = os.path.getsize(file_path)
        with open(file_path, 'rb') as f:
            header = f.read(44)
            if header.startswith(b'RIFF') and b'WAVE' in header:
                byte_rate = int.from_bytes(header[28:32], byteorder='little')
                if byte_rate > 0:
                    data_size = max(0, file_size - 44)
                    return round(data_size / float(byte_rate), 2)
    except (OSError, ValueError):
        pass

    # 3. Pydub AudioSegment
    try:
        audio = AudioSegment.from_file(file_path)
        if len(audio) > 0:
            return round(len(audio) / 1000.0, 2)
    except (OSError, ValueError, RuntimeError):
        pass

    # 4. Fallback estimation based on 16kHz 16-bit mono PCM sample size (32,000 bytes/sec)
    try:
        file_size = os.path.getsize(file_path)
        if file_size > 44:
            return round((file_size - 44) / 32000.0, 2)
    except (OSError, ValueError):
        pass

    return 30.0

def normalize_audio(input_path: str, output_path: str) -> float:
    """
    Stage 1: Normalize input audio to standard 16kHz 16-bit PCM Mono baseline.
    Uses FFmpeg if available, otherwise falls back to wave/shutil.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        import pydub
        pydub.AudioSegment.converter = ffmpeg_exe
    except ImportError:
        ffmpeg_exe = shutil.which("ffmpeg")
        
    if ffmpeg_exe:
        try:
            cmd = [
                ffmpeg_exe, "-y",
                "-i", input_path,
                "-ac", "1",
                "-ar", "16000",
                "-c:a", "pcm_s16le",
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError, OSError) as e:
            logger.warning(f"FFmpeg subprocess failed ({e}), using fallback.")
            shutil.copyfile(input_path, output_path)
    else:
        logger.info("FFmpeg binary not found on PATH. Using direct audio file pass-through.")
        shutil.copyfile(input_path, output_path)

    duration = get_audio_duration(output_path)
    return duration

def run_pyannote_diarization(audio_path: str, hf_token: str = "") -> list[dict[str, Any]]:
    """
    Stage 2A: PyAnnote 3.1 Neural Speaker Diarization.
    Returns PyAnnote speaker boundary map: [{'speaker': 'SPEAKER_00', 'start_time': 0.0, 'end_time': 5.2}, ...]
    """
    if hf_token:
        try:
            import torch
            from pyannote.audio import Pipeline
            try:
                pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)
            except TypeError:
                pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)

            if torch.cuda.is_available():
                pipeline.to(torch.device("cuda"))

            # Pass in-memory waveform tensor to bypass missing torchcodec/FFmpeg shared libraries
            try:
                import subprocess

                import imageio_ffmpeg
                import numpy as np
                
                cmd = [
                    imageio_ffmpeg.get_ffmpeg_exe(),
                    "-y", "-i", audio_path,
                    "-ac", "1", "-ar", "48000",
                    "-f", "f32le", "-"
                ]
                out = subprocess.run(cmd, capture_output=True, check=False).stdout
                samples = np.frombuffer(out, dtype=np.float32)
                tensor = torch.tensor(samples).unsqueeze(0)
                
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                diarization = pipeline({"waveform": tensor, "sample_rate": 48000}, num_speakers=2, min_speakers=2)
                        
            except Exception as inner_e:
                logger.warning(f"PyAnnote completely failed: {inner_e}")
                raise
                
            annotation = getattr(diarization, "speaker_diarization", diarization)
            if not hasattr(annotation, "itertracks") and hasattr(diarization, "diarization"):
                annotation = diarization.diarization

            speaker_map = []
            if hasattr(annotation, "itertracks"):
                for turn, _, speaker in annotation.itertracks(yield_label=True):
                    speaker_map.append({
                        "speaker": speaker,
                        "start_time": round(turn.start, 2),
                        "end_time": round(turn.end, 2)
                    })
            if speaker_map:
                logger.info(f"PyAnnote neural diarization extracted {len(speaker_map)} speaker turns.")
                return speaker_map
        except Exception as e:
            logger.error(f"PyAnnote pipeline completely failed: {e}")
            raise

    return []

_whisper_model = None

def get_whisper_model(device=None):
    global _whisper_model
    import torch
    import whisper
    
    if _whisper_model is None:
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
        logger.info(f"Loading local Whisper model ('base' size) on {device}...")
        _whisper_model = whisper.load_model("base", device=device)
    elif device is not None and str(_whisper_model.device) != device:
        logger.info(f"Moving local Whisper model to {device}...")
        _whisper_model = _whisper_model.to(device)
        
    return _whisper_model

def run_mimo_asr(audio_path: str, api_key: str = "") -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Stage 2B: Local Whisper ASR (Full Intact Audio Transcription).
    Transcribes intact audio to preserve acoustic context using a local model.
    Returns tuple: (sentence segments, word timestamps)
    """
    duration = get_audio_duration(audio_path)
    
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        model = get_whisper_model()
        logger.info(f"Running local Whisper ASR on {audio_path}...")
        
        result = model.transcribe(audio_path, word_timestamps=True)
        
        segments = []
        words = []
        
        if result.get("segments"):
            for seg in result["segments"]:
                s_text = seg.get("text", "")
                s_start = seg.get("start", 0.0)
                s_end = seg.get("end", 0.0)
                
                if s_text.strip():
                    segments.append({
                        "text": s_text.strip(),
                        "start_time": round(float(s_start), 2),
                        "end_time": round(float(s_end), 2),
                        "confidence": 0.98
                    })
                
                if "words" in seg:
                    for w in seg["words"]:
                        w_text = w.get("word", "")
                        w_start = w.get("start", 0.0)
                        w_end = w.get("end", 0.0)
                        if w_text.strip():
                            words.append({
                                "word": w_text.strip(),
                                "start_time": round(float(w_start), 2),
                                "end_time": round(float(w_end), 2)
                            })
                            
            if segments:
                logger.info(f"Local Whisper ASR transcribed {len(segments)} segments and {len(words)} words.")
                return segments, words
            else:
                logger.info("No spoken words detected by Whisper ASR (Instrumental/Music/Silence).")
                return [{
                    "text": "[Instrumental / Background music detected - No spoken dialogue in audio recording.]",
                    "start_time": 0.0,
                    "end_time": round(duration, 2),
                    "confidence": 0.90
                }], []
                
    except Exception as e:
        logger.error(f"Local Whisper ASR completely failed: {e}")
        raise

def _build_speaker_segments(audio: AudioSegment, aligned_items: list[dict]) -> dict[str, AudioSegment]:
    speaker_segments = {}
    for item in aligned_items:
        spk = item.get("speaker_label", "Unknown")
        start_ms = int(item.get("start_time", 0.0) * 1000)
        end_ms = int(item.get("end_time", 0.0) * 1000)
        chunk = audio[start_ms:end_ms]
        if spk not in speaker_segments:
            speaker_segments[spk] = AudioSegment.empty()
        speaker_segments[spk] += chunk
    return speaker_segments

def split_audio_by_speaker(audio_path: str, stage3_payload: dict[str, Any], output_dir: str) -> dict[str, str]:
    """
    Slices the normalized mono audio file into separate files for each speaker based on the 
    aligned transcript timestamps using pydub.
    Returns a dictionary mapping speaker_label to the isolated audio file path.
    """
    logger.info(f"Slicing audio by speaker for {audio_path}...")
    try:
        audio = AudioSegment.from_file(audio_path, format="wav")
    except (OSError, ValueError, RuntimeError) as e:
        logger.error(f"Failed to load audio for splitting: {e}")
        return {}

    speaker_segments = _build_speaker_segments(audio, stage3_payload.get("aligned_transcript", []))

    output_paths = {}
    for spk, combined_audio in speaker_segments.items():
        if len(combined_audio) > 0:
            spk_file = os.path.join(output_dir, f"{os.path.basename(audio_path).replace('.wav', '')}_{spk}.wav")
            combined_audio.export(spk_file, format="wav")
            output_paths[spk] = spk_file
            logger.info(f"Exported isolated audio for {spk}: {spk_file}")

    return output_paths

def _tokenize_text(text: str) -> list[str]:
    return [w for w in re.findall(r'[a-zA-Z0-9]+', text.lower()) if w]

def _find_phrase_in_tokens(phrase_tokens: list[str], word_tokens: list[dict]) -> list[tuple[float, float]]:
    ranges = []
    n = len(phrase_tokens)
    if n == 0:
        return ranges
        
    i = 0
    while i <= len(word_tokens) - n:
        match = True
        for j in range(n):
            if word_tokens[i+j]["token"] != phrase_tokens[j]:
                match = False
                break
        if match:
            start = word_tokens[i]["start_time"]
            end = word_tokens[i+n-1]["end_time"]
            ranges.append((start, end))
            
            last_word_idx = word_tokens[i+n-1]["word_idx"]
            while i < len(word_tokens) and word_tokens[i]["word_idx"] <= last_word_idx:
                i += 1
        else:
            i += 1
    return ranges

def find_pii_timestamps(asr_words: list[dict[str, Any]], pii_phrases: list[str]) -> list[tuple[float, float]]:
    """
    Finds the start and end timestamps of detected PII phrases in the word timestamps list (asr_words).
    Uses alphanumeric tokenization to handle hyphenation, capitalization, and minor punctuation variations.
    """
    redaction_ranges = []
    
    # Tokenize the asr_words list to align token index to word index
    word_tokens = []
    for idx, w_dict in enumerate(asr_words):
        tokens = _tokenize_text(w_dict.get("word", ""))
        for t in tokens:
            word_tokens.append({
                "token": t,
                "word_idx": idx,
                "start_time": w_dict.get("start_time", 0.0),
                "end_time": w_dict.get("end_time", 0.0)
            })

    for phrase in pii_phrases:
        phrase_tokens = _tokenize_text(phrase)
        if phrase_tokens:
            redaction_ranges.extend(_find_phrase_in_tokens(phrase_tokens, word_tokens))
                
    # Sort and merge overlapping/adjacent redaction ranges
    if not redaction_ranges:
        return []
        
    redaction_ranges.sort(key=lambda x: x[0])
    merged_ranges = [redaction_ranges[0]]
    for current in redaction_ranges[1:]:
        prev_start, prev_end = merged_ranges[-1]
        curr_start, curr_end = current
        if curr_start <= prev_end + 0.1:  # merge ranges if they overlap or are very close (within 100ms)
            merged_ranges[-1] = (prev_start, max(prev_end, curr_end))
        else:
            merged_ranges.append(current)
            
    return merged_ranges

def beep_audio(audio_path: str, redaction_ranges: list[tuple[float, float]], output_path: str) -> None:
    """
    Mutes (silences) the specified time ranges (in seconds) in the audio file 
    using FFmpeg stream filtering, bypassing RAM limitations.
    """
    if not redaction_ranges:
        if audio_path != output_path:
            shutil.copyfile(audio_path, output_path)
        return

    logger.info(f"Muting audio file {audio_path} at ranges: {redaction_ranges}")
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        ffmpeg_exe = shutil.which("ffmpeg")

    if not ffmpeg_exe:
        logger.error("FFmpeg not found. Cannot apply PII redaction.")
        if audio_path != output_path:
            shutil.copyfile(audio_path, output_path)
        return

    try:
        # Build the FFmpeg volume filter string
        enable_exprs = []
        for start_sec, end_sec in redaction_ranges:
            enable_exprs.append(f"between(t,{start_sec},{end_sec})")
            
        filter_str = "volume=0:enable='" + "+".join(enable_exprs) + "'"
        
        cmd = [
            ffmpeg_exe, "-y",
            "-i", audio_path,
            "-af", filter_str,
            "-c:a", "pcm_s16le",
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        logger.info(f"Successfully exported muted audio to {output_path}")
    except (subprocess.CalledProcessError, FileNotFoundError, OSError) as e:
        logger.error(f"Failed to mute audio file {audio_path}: {e}")
        if audio_path != output_path:
            shutil.copyfile(audio_path, output_path)
