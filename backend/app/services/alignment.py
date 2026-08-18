from typing import Any


def generate_stage3_json(
    recording_id: str,
    total_duration: float,
    asr_segments: list[dict[str, Any]], 
    diarization_map: list[dict[str, Any]]
) -> dict[str, Any]:
    """
    Stage 3 Alignment Engine:
    Cross-references ASR sentence segments with PyAnnote speaker boundaries or applies
    Smart Semantic & Pause-Based Speaker Turn Identification to ensure accurate speaker attribution.
    """
    if not asr_segments:
        return {
            "recording_id": recording_id,
            "total_duration_seconds": round(total_duration, 2),
            "speaker_count": 0,
            "speakers": [],
            "aligned_transcript": []
        }

    # Check if neural diarization produced distinct multiple acoustic speakers
    unique_diar_speakers = {d["speaker"] for d in diarization_map if "speaker" in d}
    has_valid_neural_diar = len(unique_diar_speakers) > 1

    assigned_speakers = []

    if has_valid_neural_diar:
        # 1. Strictly Acoustic Overlap Alignment (Trusting PyAnnote's Neural Engine)
        for i, segment in enumerate(asr_segments):
            seg_start = segment["start_time"]
            seg_end = segment["end_time"]
            
            best_speaker = None
            max_overlap = 0.0
            
            for d_turn in diarization_map:
                d_start = d_turn["start_time"]
                d_end = d_turn["end_time"]
                overlap = min(seg_end, d_end) - max(seg_start, d_start)
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_speaker = d_turn["speaker"]
            
            if not best_speaker:
                best_speaker = assigned_speakers[-1] if assigned_speakers else "SPEAKER_00"

            assigned_speakers.append(best_speaker)

        # 2. Fragmented Speaker Interpolation
        # If PyAnnote produces fragmented speakers (SPEAKER_02+), merge them dynamically 
        # into the core 2 speakers based on conversational turn-taking context.
        main_speakers = ["SPEAKER_00", "SPEAKER_01"]
        for i, spk in enumerate(assigned_speakers):
            if spk not in main_speakers:
                prev_main = None
                for j in range(i - 1, -1, -1):
                    if assigned_speakers[j] in main_speakers:
                        prev_main = assigned_speakers[j]
                        break
                        
                next_main = None
                for j in range(i + 1, len(assigned_speakers)):
                    if assigned_speakers[j] in main_speakers:
                        next_main = assigned_speakers[j]
                        break
                        
                if prev_main and next_main and prev_main == next_main:
                    # If surrounded by Speaker A, this fragment is clearly Speaker B interrupting or answering
                    assigned_speakers[i] = "SPEAKER_01" if prev_main == "SPEAKER_00" else "SPEAKER_00"
                elif prev_main:
                    assigned_speakers[i] = "SPEAKER_01" if prev_main == "SPEAKER_00" else "SPEAKER_00"
                elif next_main:
                    assigned_speakers[i] = "SPEAKER_01" if next_main == "SPEAKER_00" else "SPEAKER_00"
                else:
                    assigned_speakers[i] = "SPEAKER_00"

        # 3. QA Swap Override for Short Utterances
        # Neural diarization often fails on micro-utterances (< 2.5s) like "82993" or "yes"
        for i in range(1, len(assigned_speakers)):
            prev_seg = asr_segments[i - 1]
            curr_seg = asr_segments[i]
            
            if assigned_speakers[i] == assigned_speakers[i - 1]:
                curr_duration = curr_seg["end_time"] - curr_seg["start_time"]
                # Rule: Previous ends with '?' and current is a short answer
                if prev_seg["text"].strip().endswith("?") and curr_duration <= 2.5:
                    assigned_speakers[i] = "SPEAKER_01" if assigned_speakers[i - 1] == "SPEAKER_00" else "SPEAKER_00"

    else:
        # 2. Smart Dialogue & Pause-Based Speaker Turn Identification Engine
        # Prevents splitting multi-sentence utterances of the same speaker
        current_spk_idx = 0  # 0 = SPEAKER_00 (Speaker A), 1 = SPEAKER_01 (Speaker B)
        
        turn_shift_triggers = [
            "hi ", "hello", "yes", "no,", "sure,", "okay,", "thanks", "thank you",
            "my name is", "i am", "good morning", "good afternoon"
        ]

        for i, seg in enumerate(asr_segments):
            text_lower = seg["text"].strip().lower()
            seg_start = seg.get("start_time", 0.0)
            
            if i == 0:
                assigned_speakers.append("SPEAKER_00")
                continue

            prev_seg = asr_segments[i - 1]
            prev_text = prev_seg["text"].strip()
            prev_end = prev_seg.get("end_time", seg_start)
            gap = seg_start - prev_end

            should_switch = False

            # Trigger 1: Previous sentence ended with a question mark
            if prev_text.endswith("?") and gap >= 0.5 or gap >= 1.6 or any(text_lower.startswith(prefix) for prefix in turn_shift_triggers) and gap >= 0.4:
                should_switch = True

            if should_switch:
                current_spk_idx = (current_spk_idx + 1) % 2

            assigned_speakers.append(f"SPEAKER_0{current_spk_idx}")

    # Build Stage 3 Aligned Transcript Output
    aligned_transcript = []
    unique_speakers = set()

    for idx, (segment, spk_label) in enumerate(zip(asr_segments, assigned_speakers), start=1):
        unique_speakers.add(spk_label)
        display_name = "Speaker A" if spk_label == "SPEAKER_00" else "Speaker B"
        
        aligned_transcript.append({
            "segment_index": idx,
            "speaker_label": spk_label,
            "display_name": display_name,
            "text": segment["text"].strip(),
            "start_time": round(segment["start_time"], 2),
            "end_time": round(segment["end_time"], 2),
            "confidence": round(segment.get("confidence", 0.98), 2)
        })

    speakers_list = [
        {
            "speaker_label": spk, 
            "display_name": "Speaker A" if spk == "SPEAKER_00" else "Speaker B"
        }
        for spk in sorted(unique_speakers)
    ]

    return {
        "recording_id": recording_id,
        "total_duration_seconds": round(total_duration, 2),
        "speaker_count": len(unique_speakers),
        "speakers": speakers_list,
        "aligned_transcript": aligned_transcript
    }
