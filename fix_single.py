import os, json, sqlite3
json_dir = "/app/data/json_records"
db_path = "/app/data/voice_analysis.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

rec_id = "211da76c-5a03-4503-b5ee-34db613c1570"
path = os.path.join(json_dir, f"rec_{rec_id}.json")

if os.path.exists(path):
    with open(path, "r") as file:
        data = json.load(file)

    data["status"] = "FAILED"
    data["error_message"] = "CUDA Out of Memory during Whisper transcription. (Dummy removed)"
    data["analysis"] = None
    data["transcripts"] = []
    data["speakers"] = []

    with open(path, "w") as file:
        json.dump(data, file)

    c.execute("UPDATE recordings SET status = 'FAILED' WHERE id = ?", (rec_id,))
    conn.commit()

    try:
        os.remove(os.path.join(json_dir, f"full_recording_{rec_id}.json"))
    except: pass

    print(f"Forcefully cleared dummy transcript for {rec_id}!")
