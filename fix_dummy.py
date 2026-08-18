import os, json, sqlite3
json_dir = "data/json_records"
db_path = "data/voice_analysis.db"

conn = sqlite3.connect(db_path)
c = conn.cursor()

found = []
if os.path.exists(json_dir):
    for f in os.listdir(json_dir):
        if f.startswith("rec_") and f.endswith(".json"):
            path = os.path.join(json_dir, f)
            with open(path, "r") as file:
                data = json.load(file)
            
            is_dummy = False
            for t in data.get("transcripts", []):
                if "Morgan Davis" in t.get("text", "") or "Alex" in t.get("text", ""):
                    is_dummy = True
                    break
            
            if is_dummy or data.get("status") == "FAILED":
                rec_id = data["id"]
                print(f"Found recording to reset: {rec_id}")
                
                data["status"] = "FAILED"
                data["error_message"] = "CUDA Out of Memory during Whisper transcription. (Dummy removed)"
                data["analysis"] = None
                data["transcripts"] = []
                data["speakers"] = []
                
                with open(path, "w") as file:
                    json.dump(data, file)
                
                c.execute("UPDATE recordings SET status = 'FAILED' WHERE id = ?", (rec_id,))
                
                try:
                    os.remove(os.path.join(json_dir, f"full_recording_{rec_id}.json"))
                except: pass
                
                found.append(rec_id)

conn.commit()
print(f"Fixed {len(found)} recordings.")
