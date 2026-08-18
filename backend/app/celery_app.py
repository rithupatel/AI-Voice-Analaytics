import asyncio
import os

from celery import Celery

from app.config import settings

celery_app = Celery(
    "voice_analysis_worker",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1, # Since these are heavy audio processing tasks
    task_acks_late=True,
    result_expires=settings.REDIS_TTL_SECONDS
)

@celery_app.task(name="process_voice_analysis_pipeline_task")
def process_voice_analysis_pipeline_task(recording_id: str):
    from app.services.pipeline_service import process_voice_analysis_pipeline
    process_voice_analysis_pipeline(recording_id)

@celery_app.task(name="log_upload_to_dbeaver_task")
def log_upload_to_dbeaver_task(agent_name: str, original_file_name: str, uuid: str, checksum: str, s3_object_name: str | None = None):
    from app.external_db import log_upload_to_dbeaver
    
    # Run the async function in a new event loop
    asyncio.run(
        log_upload_to_dbeaver(
            agent_name=agent_name,
            original_file_name=original_file_name,
            uuid=uuid,
            checksum=checksum,
            s3_object_name=s3_object_name
        )
    )
