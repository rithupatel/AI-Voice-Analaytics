from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE agent_states ADD COLUMN email VARCHAR"))
        except Exception:  # noqa: BLE001, S110
            pass

        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE agent_states ADD COLUMN department VARCHAR"))
        except Exception:  # noqa: BLE001, S110
            pass
        # Add new SOT columns for Recordings
        try:
            from sqlalchemy import text
            columns = [
                "agent_name VARCHAR DEFAULT 'Unknown Agent'",
                "speakers_json JSON",
                "transcripts_json JSON",
                "analysis_json JSON",
                "word_timestamps_json JSON",
                "peaks_json JSON"
            ]
            for col in columns:
                try:
                    await conn.execute(text(f"ALTER TABLE recordings ADD COLUMN {col}"))
                except Exception:  # noqa: BLE001, S110
                    # Column likely already exists
                    pass
        except Exception:  # noqa: BLE001, S110
            pass



