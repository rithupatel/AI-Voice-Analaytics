# AI Voice Analysis Platform - Project Requirements

This document outlines the technical stack, infrastructure requirements, and dependencies for the AI Voice Analysis Platform.

## 1. System Architecture

The platform uses a decoupled architecture with a React frontend, a FastAPI backend, and an asynchronous worker queue (Celery) for heavy audio processing. All components are designed to run within Docker containers.

### Core Components
* **Frontend:** React + Vite SPA
* **Backend API:** FastAPI (Python)
* **Background Worker:** Celery + Redis
* **Local Storage:** SQLite (`voice_analysis.db`) & Local JSON stores
* **Audit Storage:** PostgreSQL (`dbeaver_tracking_db`)
* **Object Storage:** S3-Compatible Storage (MinIO) for raw audio retention

---

## 2. Backend Requirements

The backend is built in Python (3.10+) and relies on several AI and data processing libraries.

### Core Frameworks
* **FastAPI** (`fastapi>=0.109.0`, `uvicorn[standard]>=0.27.0`)
* **Pydantic** (`pydantic>=2.6.0`, `pydantic-settings>=2.1.0`)
* **SQLAlchemy** (`sqlalchemy>=2.0.25`)
* **Async PostgreSQL / SQLite Drivers** (`asyncpg>=0.29.0`, `aiosqlite>=0.19.0`)
* **Celery & Redis** (`celery>=5.3.6`, `redis>=5.0.1`)

### AI & Audio Processing Engines
* **PyTorch** (`torch>=2.0.0`, `torchaudio`)
* **HuggingFace Transformers** (`transformers>=4.30.0`)
* **PyAnnote Audio** (`pyannote-audio`) - Used for Neural Speaker Diarization
* **OpenAI Whisper** (`openai-whisper`) - Used for local ASR Transcription
* **FFmpeg / Pydub** (`ffmpeg-python>=0.2.0`, `pydub>=0.25.1`, `imageio-ffmpeg>=0.4.9`) - Audio format normalization and slicing

### API & External Services Integrations
* **Boto3** (`boto3>=1.34.0`) - S3/MinIO Object Storage Integration
* **OpenAI SDK** (`openai>=1.12.0`) - LLM Analytics (GPT-4o-mini for summaries/intents)

---

## 3. Frontend Requirements

The frontend is built for performance and modern UI aesthetics using React and Vite.

### Core Framework
* **React** (`^18.2.0`)
* **Vite** (`^5.1.6`)

### UI & Visualization
* **Lucide React** (`^0.344.0`) - Iconography
* **Recharts** (`^3.10.1`) - Analytics dashboards and data visualization
* **Wavesurfer.js** (`^7.7.3`) - Dynamic audio waveform player rendering
* **React Datepicker** (`^9.1.0`) - Filtering and date selection

### Document Export
* **jsPDF / jsPDF-AutoTable** (`^4.2.1`, `^5.0.8`) - Client-side PDF scorecard generation
* **html2canvas** (`^1.4.1`) - Dashboard screenshot capture for PDF reports

---

## 4. Environment & API Variables

The application requires a `.env` file at the backend root (`/backend/.env`) containing the following configuration:

### API Keys
* `OPENAI_API_KEY`: Required for LLM Analytics and text emotion parsing.
* `HF_TOKEN`: Required to download/authenticate PyAnnote 3.1 models.
* `SMALLEST_API_KEY`: Required for optional external PII audio beeping (if local fails).

### Database Credentials
* `DATABASE_URL`: Local SQLite database path (default: `sqlite+aiosqlite:///./voice_analysis.db`).
* `DBEAVER_DB_URL`: PostgreSQL connection string for the external audit database.

### S3 / MinIO Configuration
* `S3_ENDPOINT_URL`: The URL of the MinIO/S3 instance (e.g., `https://192.168.0.173:4443`).
* `AWS_ACCESS_KEY_ID`: S3 Access Key.
* `AWS_SECRET_ACCESS_KEY`: S3 Secret Key.
* `S3_BUCKET_NAME`: Target bucket (e.g., `livekit-bucket`).
* `AWS_REGION`: Region (e.g., `us-east-1`).

### Notification Configuration
* `GMAIL_ADDRESS`: Email address for dispatching PDF reports.
* `GMAIL_APP_PASSWORD`: Google App Password for SMTP authentication.

---

## 5. System Requirements

* **OS:** Linux (Ubuntu/Debian recommended)
* **Container Runtime:** Docker Desktop or Docker Engine + Docker Compose
* **Hardware Acceleration:** NVIDIA GPU highly recommended for PyAnnote and Whisper inference (requires `nvidia-container-toolkit` for Docker GPU passthrough). Minimum 8GB VRAM for stable inference.
* **FFmpeg:** System-level FFmpeg binary required if not using `imageio-ffmpeg`.
