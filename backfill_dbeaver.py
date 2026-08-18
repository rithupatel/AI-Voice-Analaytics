import os
import json
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

# Load env file to get DBEAVER_DB_URL
load_dotenv("./backend/.env")

# The URL should be postgresql+asyncpg://admin:adminpassword@localhost:5432/audit_db
DB_URL = os.getenv("DBEAVER_DB_URL")
if not DB_URL:
    DB_URL = "postgresql+asyncpg://admin:adminpassword@localhost:5432/audit_db"

engine = create_async_engine(DB_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

JSON_DIR = "/app/data/json_records"

async def run_backfill():
    if not os.path.exists(JSON_DIR):
        print(f"JSON directory {JSON_DIR} does not exist.")
        return

    async with AsyncSessionLocal() as session:
        for fname in os.listdir(JSON_DIR):
            if fname.startswith("rec_") and fname.endswith(".json"):
                path = os.path.join(JSON_DIR, fname)
                with open(path, "r", encoding="utf-8") as f:
                    try:
                        data = json.load(f)
                    except:
                        continue
                
                # Check if this uuid already exists in DBeaver
                uuid = data.get("id")
                if not uuid:
                    continue
                
                result = await session.execute(
                    text("SELECT s3_object_name FROM upload_audits WHERE uuid = :uuid"),
                    {"uuid": uuid}
                )
                row = result.fetchone()
                if row and row[0] is not None:
                    print(f"Skipping {uuid} - already in DB with s3")
                    continue
                
                agent_name = data.get("agent_name", "Unknown Agent")
                original_filename = data.get("original_filename", f"legacy_upload_{uuid}.wav")
                checksum = data.get("file_hash", "LEGACY_NO_HASH")
                
                # Derive fake/expected S3 object name for legacy files
                file_ext = os.path.splitext(original_filename)[1]
                s3_obj_name = f"raw_audio/voice_call_{uuid}{file_ext}"
                
                # Insert or Update record
                await session.execute(
                    text("""
                        INSERT INTO upload_audits (agent_name, original_file_name, uuid, checksum, upload_date, active, s3_object_name)
                        VALUES (:agent_name, :original_file_name, :uuid, :checksum, CURRENT_TIMESTAMP, true, :s3)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "agent_name": agent_name,
                        "original_file_name": original_filename,
                        "uuid": uuid,
                        "checksum": checksum,
                        "s3": s3_obj_name
                    }
                )
                
                # In case they were already inserted, update them
                await session.execute(
                    text("UPDATE upload_audits SET s3_object_name = :s3 WHERE uuid = :uuid"),
                    {"s3": s3_obj_name, "uuid": uuid}
                )
                print(f"Processed/Updated {uuid} for agent {agent_name} with S3 {s3_obj_name}")
        
        await session.commit()
        print("Backfill complete.")

if __name__ == "__main__":
    asyncio.run(run_backfill())
