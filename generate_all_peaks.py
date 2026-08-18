import json
import os
import wave
import struct

ROOT_DIR = "/home/rithu/Desktop/AI Voice Analysis"
JSON_STORAGE_DIR = os.path.join(ROOT_DIR, "data", "json_records")
MEDIA_DIR = os.path.join(ROOT_DIR, "data", "media")

def generate_waveform_peaks(wav_path, out_path, num_points=800):
    try:
        if not os.path.exists(wav_path):
            return
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
                    peaks = [round(p/max_val, 3) for p in peaks]
            with open(out_path, 'w') as f:
                json.dump(peaks, f)
            print(f"Generated peaks for {os.path.basename(wav_path)}")
    except Exception as e:
        print(f"Failed to generate peaks for {wav_path}: {e}")

if os.path.exists(JSON_STORAGE_DIR):
    for fname in os.listdir(JSON_STORAGE_DIR):
        if fname.startswith("rec_") and fname.endswith(".json"):
            rec_id = fname.replace("rec_", "").replace(".json", "")
            peaks_path = os.path.join(JSON_STORAGE_DIR, f"peaks_{rec_id}.json")
            if not os.path.exists(peaks_path):
                # Try normalized path
                normalized_path = os.path.join(MEDIA_DIR, "processed", f"{rec_id}_16k.wav")
                if os.path.exists(normalized_path):
                    generate_waveform_peaks(normalized_path, peaks_path)
                else:
                    # Fallback to mono copy
                    mono_path = os.path.join(ROOT_DIR, "data", f"mono_{rec_id}.wav")
                    if os.path.exists(mono_path):
                        generate_waveform_peaks(mono_path, peaks_path)
                    else:
                        print(f"No valid wav found for {rec_id}")
