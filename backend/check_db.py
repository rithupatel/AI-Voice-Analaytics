import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Recording


async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Recording).where(Recording.status != 'COMPLETED'))
        records = result.scalars().all()
        for r in records:
            print(f"ID: {r.id}, Status: {r.status}, Error: {r.error_message}")
        if not records:
            print("No non-completed recordings found.")

asyncio.run(main())
