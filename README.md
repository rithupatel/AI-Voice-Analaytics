# AI Voice Analysis Platform

An enterprise-grade, end-to-end voice analysis platform designed to process multi-speaker acoustic recordings (like customer service calls), accurately transcribe them, identify distinct speakers, and extract intelligent conversational analytics using cutting-edge LLMs.

## 🚀 Features
- **Neural Speaker Diarization**: Utilizes `pyannote/speaker-diarization-3.1` combined with a custom Hybrid Semantic Alignment engine to perfectly distinguish between speakers, even during rapid short turns.
- **High-Fidelity Transcription**: Integrates with OpenAI's Whisper model to preserve acoustic context and generate accurate text.
- **LLM Call Analytics**: Powered by GPT-4o-mini to automatically extract:
  - Executive Call Summaries
  - Overall Sentiment (Positive, Negative, Neutral)
  - Detailed Speaker Intent Profiles (Emotional state, tone, primary goals)
  - Key Action Items
- **Local Data Persistence**: Strictly stores all generated state (JSON metadata, raw `.txt` transcripts, logs, and media) locally in an isolated `data/` directory for maximum security and privacy.
- **Modern Tech Stack**: FastAPI (Python) backend with SQLite async persistence, alongside a blazing fast Vite/React frontend.

## 📁 Project Structure

- `architecture/` - High-level system documentation and architecture plans.
- `backend/` - FastAPI server, ML pipelines, and data models.
- `frontend/` - Vite/React user interface.
- `data/` - Isolated storage for transcripts, JSON analytics, media, and logs.

## ⚙️ Getting Started

### 1. Initial Setup
Run the included setup script to install all Python (Backend) and Node.js (Frontend) dependencies:
```bash
./setup.sh
```

### 2. Start the Backend
Open a terminal, navigate to the `backend` folder, and start the FastAPI server:
```bash
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the Frontend
Open a new terminal, navigate to the `frontend` folder, and start the Vite dev server:
```bash
cd frontend
npm run dev
```

*Ensure that you have configured your `.env` file in the `backend/` directory with your `OPENAI_API_KEY` and `HF_TOKEN`.*
