import os
import sqlite3

ROOT_DIR = '/home/rithu/Desktop/AI Voice Analysis'
DATA_DIR = os.path.join(ROOT_DIR, 'data')

# 1. Clear JSON records
json_dir = os.path.join(DATA_DIR, 'json_records')
if os.path.exists(json_dir):
    for f in os.listdir(json_dir):
        if f.endswith('.json'):
            os.remove(os.path.join(json_dir, f))

# 2. Clear Media
media_dir = os.path.join(DATA_DIR, 'media')
uploads_dir = os.path.join(media_dir, 'uploads')
processed_dir = os.path.join(media_dir, 'processed')

if os.path.exists(uploads_dir):
    for f in os.listdir(uploads_dir):
        p = os.path.join(uploads_dir, f)
        if os.path.isfile(p): os.remove(p)

if os.path.exists(processed_dir):
    for f in os.listdir(processed_dir):
        p = os.path.join(processed_dir, f)
        if os.path.isfile(p): os.remove(p)

# 3. Clear Mono and Transcripts
transcripts_dir = os.path.join(DATA_DIR, 'transcripts')
if os.path.exists(transcripts_dir):
    for f in os.listdir(transcripts_dir):
        p = os.path.join(transcripts_dir, f)
        if os.path.isfile(p): os.remove(p)

for f in os.listdir(DATA_DIR):
    if f.startswith('mono_') and f.endswith('.wav'):
        os.remove(os.path.join(DATA_DIR, f))

# 4. Clear SQLite DB
db_paths = [os.path.join(ROOT_DIR, 'backend', 'app.db'), os.path.join(ROOT_DIR, 'backend', 'database.db'), os.path.join(ROOT_DIR, 'backend', 'voice_analysis.db')]
for path in db_paths:
    if os.path.exists(path):
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        try:
            cur.execute('DELETE FROM recordings;')
            conn.commit()
            print(f'Cleared recordings table in {path}')
        except Exception as e:
            pass
        finally:
            conn.close()

print('All recordings and associated data cleared from the system.')
