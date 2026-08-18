import logging

from sqlalchemy import update

from app.database import AsyncSessionLocal
from app.models import UploadAudit

logger = logging.getLogger("external_db")

async def init_external_db():
    # External DB tables are now managed by SQLite in app.database.init_db()
    # This is kept for backward compatibility with app.main.lifespan
    pass

async def log_upload_to_dbeaver(agent_name: str, original_file_name: str, uuid: str, checksum: str, s3_object_name: str | None = None):
    try:
        async with AsyncSessionLocal() as session:
            audit_record = UploadAudit(
                agent_name=agent_name,
                original_file_name=original_file_name,
                uuid=uuid,
                checksum=checksum,
                s3_object_name=s3_object_name
            )
            session.add(audit_record)
            await session.commit()
            logger.info(f"Successfully audited upload for {uuid} to SOT SQLite DB.")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to log upload audit: {e}")

async def soft_delete_in_dbeaver(uuid: str):
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(UploadAudit).where(UploadAudit.uuid == uuid).values(active=False)
            )
            await session.commit()
            logger.info(f"Soft deleted {uuid} in SOT SQLite DB audit table.")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to soft delete in audit table: {e}")

async def update_waveform_peaks_in_dbeaver(uuid: str, peaks: list):
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(UploadAudit).where(UploadAudit.uuid == uuid).values(waveform_peaks=peaks)
            )
            await session.commit()
            logger.info(f"Successfully updated waveform peaks for {uuid} in SOT SQLite DB audit table.")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to update waveform peaks in audit table: {e}")
