import os
import json
import sys
import asyncio

# Ensure backend path is in sys.path so we can import from app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.config import settings
from app.services.llm_analytics import analyze_transcript_with_gpt4o_mini
from app.database import AsyncSessionLocal
from app.models import AnalysisResult
from sqlalchemy.future import select

async def update_existing_recordings():
    json_dir = settings.JSON_STORAGE_DIR

    for fname in os.listdir(json_dir):
        if fname.startswith("rec_") and fname.endswith(".json"):
            rec_id = fname[4:-5]
            print(f"Reprocessing LLM Analytics for recording {rec_id}...")

            rec_path = os.path.join(json_dir, fname)
            stage3_path = os.path.join(json_dir, f"stage3_{rec_id}.json")

            if not os.path.exists(stage3_path):
                print(f"Skipping {rec_id} - Missing stage3 json.")
                continue

            with open(rec_path, "r", encoding="utf-8") as f:
                rec_data = json.load(f)

            with open(stage3_path, "r", encoding="utf-8") as f:
                stage3_json = json.load(f)

            # Re-run LLM Analytics
            try:
                llm_result, _ = analyze_transcript_with_gpt4o_mini(stage3_json, settings.OPENAI_API_KEY)
                
                # Update JSON record
                rec_data["llm_analysis"] = llm_result
                rec_data["analysis"] = llm_result
                with open(rec_path, "w", encoding="utf-8") as f:
                    json.dump(rec_data, f, indent=2, ensure_ascii=False)
                
                # Update DB record if exists
                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(AnalysisResult).filter(AnalysisResult.recording_id == rec_id))
                    db_analysis = result.scalars().first()
                    if db_analysis:
                        db_analysis.call_summary = llm_result.get("call_summary")
                        db_analysis.overall_sentiment = llm_result.get("overall_sentiment")
                        db_analysis.speaker_intents = llm_result.get("speaker_intents")
                        db_analysis.key_action_items = llm_result.get("key_action_items")
                        await db.commit()
                        print(f"  -> Updated DB AnalysisResult for {rec_id}")

                print(f"Successfully updated LLM output for {rec_id}.\n")
            except Exception as e:
                print(f"Failed to process {rec_id}: {e}")

if __name__ == "__main__":
    asyncio.run(update_existing_recordings())
