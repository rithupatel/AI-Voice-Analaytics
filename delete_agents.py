import sqlite3
import os

db_paths = [
    '/home/rithu/Desktop/AI Voice Analysis/backend/database.db',
    '/home/rithu/Desktop/AI Voice Analysis/backend/voice_analysis.db',
    '/home/rithu/Desktop/AI Voice Analysis/data/voice_analysis.db'
]

for p in db_paths:
    if os.path.exists(p):
        try:
            conn = sqlite3.connect(p)
            cur = conn.cursor()
            cur.execute("DELETE FROM agent_states WHERE lower(agent_name) IN ('rachel', 'chris');")
            rowcount = cur.rowcount
            conn.commit()
            conn.close()
            if rowcount > 0:
                print(f'Deleted {rowcount} rows from {p}')
        except Exception as e:
            print(f'Error on {p}: {e}')
