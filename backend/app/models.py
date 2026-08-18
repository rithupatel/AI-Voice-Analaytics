import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())

class Recording(Base):
    __tablename__ = "recordings"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(Text, nullable=False)
    file_hash = Column(String, unique=True, nullable=True)
    s3_key = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True, default=0.0)
    sample_rate = Column(Integer, default=16000)
    status = Column(String, default="PENDING")  # PENDING, PREPROCESSING, DIARIZING, TRANSCRIBING, ALIGNING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)
    agent_name = Column(String, default="Unknown Agent")
    
    # JSON Document Store Columns (Replaces local .json files)
    speakers_json = Column(JSON, nullable=True)
    transcripts_json = Column(JSON, nullable=True)
    analysis_json = Column(JSON, nullable=True)
    word_timestamps_json = Column(JSON, nullable=True)
    peaks_json = Column(JSON, nullable=True)

    speakers = relationship("Speaker", back_populates="recording", cascade="all, delete-orphan")
    transcripts = relationship("Transcript", back_populates="recording", cascade="all, delete-orphan")
    analysis = relationship("AnalysisResult", back_populates="recording", uselist=False, cascade="all, delete-orphan")

class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(String, primary_key=True, default=generate_uuid)
    recording_id = Column(String, ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False)
    speaker_label = Column(String, nullable=False)  # e.g., SPEAKER_00, SPEAKER_01
    display_name = Column(String, nullable=True)    # e.g., Speaker A, Speaker B
    created_at = Column(DateTime, default=datetime.utcnow)

    recording = relationship("Recording", back_populates="speakers")
    transcripts = relationship("Transcript", back_populates="speaker", cascade="all, delete-orphan")

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, default=generate_uuid)
    recording_id = Column(String, ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False)
    speaker_id = Column(String, ForeignKey("speakers.id", ondelete="CASCADE"), nullable=False)
    segment_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    # COVERT TIMESTAMPS: Saved in DB for queries/player seek, stripped for clean UI view & LLM prompt
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    confidence = Column(Float, default=0.95)
    created_at = Column(DateTime, default=datetime.utcnow)

    recording = relationship("Recording", back_populates="transcripts")
    speaker = relationship("Speaker", back_populates="transcripts")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    recording_id = Column(String, ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False)
    call_summary = Column(Text, nullable=True)
    overall_sentiment = Column(String, nullable=True)  # POSITIVE, NEUTRAL, NEGATIVE, MIXED
    speaker_intents = Column(JSON, nullable=True)     # [{"speaker_label": "SPEAKER_00", "primary_intent": "..."}]
    key_action_items = Column(JSON, nullable=True)    # ["Action item 1", ...]
    created_at = Column(DateTime, default=datetime.utcnow)

    recording = relationship("Recording", back_populates="analysis")

class AgentState(Base):
    __tablename__ = "agent_states"
    
    agent_name = Column(String, primary_key=True)
    email = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UploadAudit(Base):
    __tablename__ = "upload_audits"
    
    sl_no = Column(Integer, primary_key=True, autoincrement=True)
    agent_name = Column(String, nullable=True)
    original_file_name = Column(String, nullable=False)
    uuid = Column(String, unique=True, nullable=False)
    checksum = Column(String, nullable=False)
    s3_object_name = Column(String, nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)
    waveform_peaks = Column(JSON, nullable=True)
