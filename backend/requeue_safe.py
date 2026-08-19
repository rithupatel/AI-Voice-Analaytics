import asyncio

from sqlalchemy import select, update

from app.database import AsyncSessionLocal
from app.models import Recording
from app.services.pipeline_service import PipelineService


async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Recording).where(Recording.status != 'COMPLETED').where(Recording.status != 'FAILED'))
        records = result.scalars().all()
        for r in records:
            print(f"Re-queueing stuck recording: {r.id}")
            await session.execute(update(Recording).where(Recording.id == r.id).values(status='PENDING'))
            await session.commit()
            PipelineService.dispatch_reprocess_task(r.id)
            
        if not records:
            print("No non-completed recordings found.")

asyncio.run(main())
