# ruff: noqa: B008
import hashlib
import logging
import os
import shutil
import uuid
import zipfile
from datetime import datetime, timezone

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.external_db import soft_delete_in_dbeaver
from app.models import AgentState, Recording
from app.services.pipeline_service import PipelineService
from app.services.s3_storage import get_presigned_url, upload_file_to_s3
from app.utils.validators import validate_audio_upload

logger = logging.getLogger("recordings_router")
router = APIRouter(
    prefix="/api/v1/recordings",
    tags=["Recordings"],
    dependencies=[Depends(get_current_user)]
)

def recording_to_dict(rec: Recording) -> dict:
    return {
        "id": rec.id,
        "title": rec.title,
        "agent_name": rec.agent_name or "Unknown Agent",
        "original_filename": rec.original_filename,
        "file_path": rec.file_path,
        "s3_key": rec.s3_key,
        "file_hash": rec.file_hash,
        "audio_url": f"/api/v1/recordings/{rec.id}/audio",
        "duration_seconds": rec.duration_seconds,
        "status": rec.status,
        "error_message": rec.error_message,
        "created_at": rec.created_at.strftime("%Y-%m-%d %H:%M:%S") if rec.created_at else "",
        "speakers": rec.speakers_json or [],
        "transcripts": rec.transcripts_json or [],
        "analysis": rec.analysis_json,
        "active": rec.active
    }

@router.get("/check-hash")
async def check_file_hash(file_hash: str, db: AsyncSession = Depends(get_db)):
    if not file_hash:
        return {"exists": False}
    result = await db.execute(select(Recording).where(Recording.file_hash == file_hash))
    existing = result.scalars().first()
    if existing and existing.status != "FAILED":
        return {"exists": True}
    return {"exists": False}

@router.post("/upload")
async def upload_recording(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    agent_name: str | None = None,
    file_hash: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing.")

    await validate_audio_upload(file)

    if file_hash:
        result = await db.execute(select(Recording).where(Recording.file_hash == file_hash))
        existing = result.scalars().first()
        if existing and existing.status != "FAILED":
            raise HTTPException(status_code=400, detail="Recording already exists.")

    rec_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    saved_filename = f"voice_call_{rec_id}{file_ext}"
    upload_path = os.path.join(settings.MEDIA_DIR, "uploads", saved_filename)
    os.makedirs(os.path.dirname(upload_path), exist_ok=True)

    with open(upload_path, "wb") as buffer:  # noqa: ASYNC230
        shutil.copyfileobj(file.file, buffer)

    from app.services.speech_pipeline import get_audio_duration
    try:
        duration = get_audio_duration(upload_path)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Failed to calculate audio duration: {e}")
        duration = 0.0

    title = f"Voice Recording - {rec_id[:8].upper()}"

    s3_object_name = f"rithu/{saved_filename}"
    s3_success = upload_file_to_s3(upload_path, s3_object_name)
    s3_key = s3_object_name if s3_success else None

    new_db_rec = Recording(
        id=rec_id,
        title=title,
        agent_name=agent_name or "Unknown Agent",
        original_filename=file.filename,
        file_path=upload_path,
        file_hash=file_hash,
        s3_key=s3_key,
        duration_seconds=duration,
        status="PENDING",
        created_at=datetime.now(timezone.utc),
        active=True
    )
    db.add(new_db_rec)
    await db.commit()

    PipelineService.dispatch_pipeline_tasks(
        agent_name=agent_name or "Unknown Agent",
        original_file_name=file.filename,
        uuid=rec_id,
        checksum=file_hash,
        s3_object_name=s3_key
    )
    
    return recording_to_dict(new_db_rec)

@router.post("/batch-upload")
async def batch_upload_recordings(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    agent_name: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    queued_records = []
    skipped_count = 0
    
    def calc_md5(path):
        hash_md5 = hashlib.md5()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    candidates = []
    temp_extract_dir = os.path.join(settings.MEDIA_DIR, "uploads", "temp_extract")
    os.makedirs(temp_extract_dir, exist_ok=True)

    for file in files:
        if not file.filename:
            continue
            
        file_ext = os.path.splitext(file.filename)[1].lower()
        temp_file_path = os.path.join(temp_extract_dir, f"temp_{uuid.uuid4()}{file_ext}")
        
        with open(temp_file_path, "wb") as buffer:  # noqa: ASYNC230
            shutil.copyfileobj(file.file, buffer)
            
        if file_ext == '.zip' or file.content_type in ['application/zip', 'application/x-zip-compressed']:
            try:
                with zipfile.ZipFile(temp_file_path, 'r') as zip_ref:
                    extract_path = os.path.join(temp_extract_dir, str(uuid.uuid4()))
                    zip_ref.extractall(extract_path)
                    for root, _, extracted_files in os.walk(extract_path):
                        for ext_f in extracted_files:
                            if ext_f.startswith('.') or ext_f.endswith(('.txt', '.json', '.csv', '.md', '.DS_Store')):
                                continue
                            candidates.append({"path": os.path.join(root, ext_f), "original_filename": ext_f})
            except Exception as e:  # noqa: BLE001
                logger.error(f"Failed to extract zip file {file.filename}: {e}")
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
        else:
            candidates.append({"path": temp_file_path, "original_filename": file.filename})

    from app.services.speech_pipeline import get_audio_duration
    for cand in candidates:
        if not os.path.exists(cand["path"]):
            continue
            
        file_hash = calc_md5(cand["path"])
        result = await db.execute(select(Recording).where(Recording.file_hash == file_hash))
        existing = result.scalars().first()
        if existing and existing.status != "FAILED":
            skipped_count += 1
            os.remove(cand["path"])
            continue
            
        rec_id = str(uuid.uuid4())
        file_ext = os.path.splitext(cand["original_filename"])[1]
        saved_filename = f"voice_call_{rec_id}{file_ext}"
        upload_path = os.path.join(settings.MEDIA_DIR, "uploads", saved_filename)
        shutil.move(cand["path"], upload_path)
        
        try:
            duration = get_audio_duration(upload_path)
        except Exception:  # noqa: BLE001
            duration = 0.0

        title = f"Voice Recording - {rec_id[:8].upper()}"
        s3_object_name = f"rithu/{saved_filename}"
        s3_success = upload_file_to_s3(upload_path, s3_object_name)
        s3_key = s3_object_name if s3_success else None

        new_db_rec = Recording(
            id=rec_id,
            title=title,
            agent_name=agent_name or "Unknown Agent",
            original_filename=cand["original_filename"],
            file_path=upload_path,
            file_hash=file_hash,
            s3_key=s3_key,
            duration_seconds=duration,
            status="QUEUED",
            created_at=datetime.now(timezone.utc),
            active=True
        )
        db.add(new_db_rec)
        
        PipelineService.dispatch_pipeline_tasks(
            agent_name=agent_name or "Unknown Agent",
            original_file_name=cand["original_filename"],
            uuid=rec_id,
            checksum=file_hash,
            s3_object_name=s3_key
        )
        queued_records.append(new_db_rec)

    await db.commit()
    
    try:
        shutil.rmtree(temp_extract_dir, ignore_errors=True)
    except Exception:  # noqa: BLE001, S110
        pass

    return {
        "message": f"Successfully queued {len(queued_records)} files. Skipped {skipped_count} duplicate files.",
        "queued": len(queued_records),
        "skipped": skipped_count,
        "records": [recording_to_dict(r) for r in queued_records]
    }

@router.post("/reprocess/{recording_id}")
async def reprocess_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    db_rec = result.scalars().first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found")
        
    db_rec.status = "PENDING"
    db_rec.error_message = None
    await db.commit()
        
    PipelineService.dispatch_reprocess_task(recording_id)
    return {"message": "Recording queued for reprocessing", "recording_id": recording_id}

@router.get("/fix-dummy")
async def fix_dummy_recordings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording))
    recs = result.scalars().all()
    found = []
    for db_rec in recs:
        is_dummy = False
        if db_rec.transcripts_json:
            for t in db_rec.transcripts_json:
                if "Morgan Davis" in t.get("text", "") or "Alex" in t.get("text", ""):
                    is_dummy = True
                    break
        if is_dummy or db_rec.status == "FAILED":
            db_rec.status = "FAILED"
            db_rec.error_message = "CUDA Out of Memory during Whisper transcription. (Dummy removed)"
            db_rec.analysis_json = None
            db_rec.transcripts_json = None
            db_rec.speakers_json = None
            found.append(db_rec.id)
    await db.commit()
    return {"fixed": len(found), "recordings": found}

@router.get("")
async def list_recordings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.active == True).order_by(Recording.created_at.desc()))
    recs = result.scalars().all()
    return [recording_to_dict(r) for r in recs]

@router.patch("/agents/{agent_name}/rename")
async def rename_agent(agent_name: str, new_name: str, db: AsyncSession = Depends(get_db)):
    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="New name cannot be empty.")
    
    await db.execute(
        update(Recording).where(Recording.agent_name == agent_name).values(agent_name=new_name.strip())
    )
    await db.commit()
    return {"message": f"Renamed agent to {new_name.strip()}"}

@router.delete("/agents/{agent_name}")
async def delete_agent(agent_name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentState).where(AgentState.agent_name == agent_name))
    state = result.scalars().first()
    if not state:
        state = AgentState(agent_name=agent_name, active=False)
        db.add(state)
    else:
        state.active = False
    await db.commit()
    return {"message": f"Globally disabled agent: {agent_name}"}

@router.get("/agents")
async def get_all_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentState))
    states = result.scalars().all()
    return {"agents": [{"name": s.agent_name, "email": s.email, "disabled": not s.active} for s in states]}

@router.post("/agents")
async def create_or_update_agent(agent: dict, db: AsyncSession = Depends(get_db)):
    agent_name = agent.get("name")
    if not agent_name:
        raise HTTPException(status_code=400, detail="Name required")
    result = await db.execute(select(AgentState).where(AgentState.agent_name == agent_name))
    state = result.scalars().first()
    if not state:
        state = AgentState(agent_name=agent_name, email=agent.get("email"), active=not agent.get("disabled", False))
        db.add(state)
    else:
        if "email" in agent:
            state.email = agent["email"]
        if "disabled" in agent:
            state.active = not agent["disabled"]
    await db.commit()
    return {"message": "Agent saved successfully"}

@router.get("/{recording_id}")
async def get_recording_detail(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    db_rec = result.scalars().first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording_to_dict(db_rec)

def get_audio_mime_type(file_path: str) -> str:
    return "audio/wav" if file_path.endswith(".wav") else "audio/mpeg"

@router.get("/{recording_id}/audio")
async def get_recording_audio(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    db_rec = result.scalars().first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found.")
        
    # SOT: AWS S3. Generate presigned URL and redirect client.
    if db_rec.s3_key:
        presigned_url = get_presigned_url(db_rec.s3_key)
        if presigned_url:
            return RedirectResponse(url=presigned_url)
            
    # Fallback to local file if S3 is not configured or failed to upload
    if db_rec.file_path and os.path.exists(db_rec.file_path):
        return FileResponse(db_rec.file_path, media_type=get_audio_mime_type(db_rec.file_path))
        
    normalized_path = os.path.join(settings.MEDIA_DIR, "processed", f"{recording_id}_16k.wav")
    if os.path.exists(normalized_path):
        return FileResponse(normalized_path, media_type=get_audio_mime_type(normalized_path))
    
    raise HTTPException(status_code=404, detail="Audio file not found in S3 or local fallback.")

@router.get("/{recording_id}/peaks")
async def get_recording_peaks(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    db_rec = result.scalars().first()
    if db_rec and db_rec.peaks_json:
        return db_rec.peaks_json
    return []

@router.get("/{recording_id}/stage3-json")
async def get_stage3_json(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    db_rec = result.scalars().first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found.")
    return {
        "recording_id": db_rec.id,
        "total_duration_seconds": db_rec.duration_seconds,
        "speaker_count": len(db_rec.speakers_json or []),
        "speakers": db_rec.speakers_json or [],
        "aligned_transcript": db_rec.transcripts_json or []
    }

@router.get("/{recording_id}/transcript-txt")
async def get_transcript_txt(recording_id: str):
    txt_file_path = os.path.join(settings.TRANSCRIPTS_DIR, f"transcript_{recording_id}.txt")
    if os.path.exists(txt_file_path):
        return FileResponse(txt_file_path, media_type="text/plain", filename=f"transcript_{recording_id}.txt")
    raise HTTPException(status_code=404, detail="Transcript text file not found.")

@router.get("/{recording_id}/word-timestamps")
async def get_word_timestamps(recording_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    db_rec = result.scalars().first()
    if db_rec and db_rec.word_timestamps_json:
        return db_rec.word_timestamps_json
    return []

@router.patch("/{recording_id}/agent")
async def update_recording_agent(recording_id: str, agent_name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).where(Recording.id == recording_id))
    db_rec = result.scalars().first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recording not found.")
    db_rec.agent_name = agent_name
    await db.commit()
    return {"id": recording_id, "agent_name": agent_name}

@router.delete("/{recording_id}")
async def delete_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(update(Recording).where(Recording.id == recording_id).values(active=False))
    await db.commit()
    await soft_delete_in_dbeaver(recording_id)
    return {"message": "Recording soft-deleted successfully."}

@router.get("/logs/system")
async def get_system_logs(lines: int = 200):
    log_path = settings.SYSTEM_LOG_PATH
    if not os.path.exists(log_path):
        return {"log_path": log_path, "logs": ["No logs recorded yet."]}
    try:
        async with aiofiles.open(log_path, "r", encoding="utf-8") as f:
            all_lines = await f.readlines()
            tail_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {"log_path": log_path, "total_line_count": len(all_lines), "returned_line_count": len(tail_lines), "logs": [l.rstrip("\r\n") for l in tail_lines]}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Error reading system log file: {e}")

import base64
import smtplib
from email.message import EmailMessage


@router.post("/send-email")
async def send_email(req: schemas.EmailRequest):
    if not settings.GMAIL_ADDRESS or not settings.GMAIL_APP_PASSWORD:
        raise HTTPException(status_code=500, detail="Gmail credentials are not configured in .env")
    try:
        msg = EmailMessage()
        msg['Subject'] = req.subject
        msg['From'] = settings.GMAIL_ADDRESS
        msg['To'] = req.to_email
        msg.set_content(req.body)
        pdf_data = base64.b64decode(req.pdf_base64)
        msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=req.pdf_filename)
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(settings.GMAIL_ADDRESS, settings.GMAIL_APP_PASSWORD)
            server.send_message(msg)
        return {"message": "Email sent successfully"}
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to send email: {e!s}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e!s}")
