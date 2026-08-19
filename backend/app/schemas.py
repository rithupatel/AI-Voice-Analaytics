from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SpeakerBase(BaseModel):
    speaker_label: str
    display_name: str

class SpeakerOut(SpeakerBase):
    id: str
    recording_id: str

    class Config:
        from_attributes = True

class TranscriptSegmentBase(BaseModel):
    segment_index: int
    speaker_label: str
    display_name: str
    text: str
    start_time: float
    end_time: float
    confidence: float | None = 0.95

# Stage 3 JSON Output Schema
class Stage3AlignedTranscriptJSON(BaseModel):
    recording_id: str
    total_duration_seconds: float
    speaker_count: int
    speakers: list[SpeakerBase]
    aligned_transcript: list[TranscriptSegmentBase]

# Clean Transcript View for UI & LLM (Timestamps Excluded by Constraint)
class CleanTranscriptItemOut(BaseModel):
    id: str
    segment_index: int
    speaker_label: str
    display_name: str
    text: str
    # Covert timestamps excluded from default clean response payload, optional seek info included when explicitly requested
    start_time: float | None = None
    end_time: float | None = None

    class Config:
        from_attributes = True

class SpeakerIntentItem(BaseModel):
    speaker_label: str
    display_name: str | None = "Speaker"
    confidence_level: str | None = "HIGH"
    primary_intent: str
    key_points: list[str] = Field(default_factory=list)
    emotional_state: str | None = "Unknown"
    frustration_level: str | None = "Unknown"
    calmness_level: str | None = "Unknown"
    perplexity_level: str | None = "Unknown"
    knowledgeability: str | None = "Unknown"
    tone_behavior: str | None = "Unknown"

class AnalysisResultOut(BaseModel):
    id: str
    recording_id: str
    call_summary: str | None = None
    overall_sentiment: str | None = "NEUTRAL"
    speaker_intents: list[SpeakerIntentItem] | None = Field(default_factory=list)
    key_action_items: list[str] | None = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True

class RecordingListItem(BaseModel):
    id: str
    title: str
    original_filename: str
    duration_seconds: float | None = 0.0
    status: str
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class RecordingDetailOut(RecordingListItem):
    file_path: str
    audio_url: str
    speakers: list[SpeakerOut] = Field(default_factory=list)
    transcripts: list[CleanTranscriptItemOut] = Field(default_factory=list)
    analysis: AnalysisResultOut | None = None

    class Config:
        from_attributes = True

class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    pdf_base64: str
    pdf_filename: str

class AgentCreate(BaseModel):
    name: str
    email: str | None = None
    department: str | None = None
    disabled: bool | None = False
