import os
import json
import sys

# Ensure backend path is in sys.path so we can import from app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.config import settings
from app.services.speech_pipeline import find_pii_timestamps, beep_audio
from app.services.llm_analytics import get_pii_phrases_locally, scrub_pii_pytorch

def update_existing_recordings():
    json_dir = settings.JSON_STORAGE_DIR
    media_dir = os.path.join(settings.MEDIA_DIR, "processed")

    for fname in os.listdir(json_dir):
        if fname.startswith("rec_") and fname.endswith(".json"):
            rec_id = fname[4:-5]
            print(f"Processing recording {rec_id}...")

            rec_path = os.path.join(json_dir, fname)
            stage3_path = os.path.join(json_dir, f"stage3_{rec_id}.json")
            word_timestamps_path = os.path.join(json_dir, f"word_timestamps_{rec_id}.json")
            audio_path = os.path.join(media_dir, f"{rec_id}_16k.wav")

            if not os.path.exists(stage3_path) or not os.path.exists(word_timestamps_path) or not os.path.exists(audio_path):
                print(f"Skipping {rec_id} - Missing required files.")
                continue

            with open(rec_path, "r", encoding="utf-8") as f:
                rec_data = json.load(f)

            with open(stage3_path, "r", encoding="utf-8") as f:
                stage3_json = json.load(f)

            with open(word_timestamps_path, "r", encoding="utf-8") as f:
                asr_words = json.load(f)

            # 1. Beep audio and redact word timestamps
            full_raw_text = " ".join([item.get("text", "") for item in stage3_json.get("aligned_transcript", [])])
            pii_phrases = get_pii_phrases_locally(full_raw_text)

            if pii_phrases:
                print(f"  -> Found PII phrases: {pii_phrases}")
                redaction_ranges = find_pii_timestamps(asr_words, pii_phrases)
                if redaction_ranges:
                    print(f"  -> Beeping audio at {redaction_ranges}")
                    beep_audio(audio_path, redaction_ranges, audio_path)

                    # Redact words in word timestamps
                    for w in asr_words:
                        w_start = w.get("start_time", 0.0)
                        w_end = w.get("end_time", 0.0)
                        for r_start, r_end in redaction_ranges:
                            if w_start >= r_start - 0.1 and w_end <= r_end + 0.1:
                                w["word"] = "[REDACTED]"
                                break
                    
                    with open(word_timestamps_path, "w", encoding="utf-8") as f:
                        json.dump(asr_words, f, indent=2, ensure_ascii=False)
                    print(f"  -> Updated word timestamps.")

            # 2. Scrub segments in rec_data
            print("  -> Scrubbing transcript segments...")
            scrubbed_transcripts = []
            for entry in stage3_json.get("aligned_transcript", []):
                scrubbed_entry = entry.copy()
                scrubbed_entry["text"] = scrub_pii_pytorch(entry.get("text", ""))
                scrubbed_transcripts.append(scrubbed_entry)

            rec_data["transcripts"] = scrubbed_transcripts

            with open(rec_path, "w", encoding="utf-8") as f:
                json.dump(rec_data, f, indent=2, ensure_ascii=False)

            print(f"Successfully updated {rec_id}.\n")

if __name__ == "__main__":
    update_existing_recordings()
