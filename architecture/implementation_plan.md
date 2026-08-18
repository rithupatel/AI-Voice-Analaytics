# Voice Analysis Platform: System Architecture & Implementation Strategy

## 1. Core Architecture Overview
The system is built on a scalable, asynchronous micro-architecture designed to ingest audio files, transcribe them, perform speaker diarization, extract emotional/PII data, and synthesize executive summaries using LLMs.

### Tech Stack
*   **Backend Framework:** FastAPI (Python 3.10+) running on Uvicorn.
*   **Task Queue:** Celery with Redis as the broker/backend.
*   **Database (Single Source of Truth):** SQLite (via SQLAlchemy/Alembic) configured via `DATABASE_URL`.
*   **Media Storage:** Local (`./media`) with S3 fallback/integration for cloud persistence.
*   **Machine Learning:** PyAnnote 3.1 (Diarization), Whisper (ASR), local PyTorch/Spacy (NER/PII).
*   **External LLM:** OpenAI API (GPT-4o-mini & GPT-4o-audio) for 5-pillar analytics.

## 2. Security & Configuration Management
All dynamic values and secrets have been decoupled from the codebase and centralized into the `.env` configuration file, loaded via Pydantic `Settings`.

**Key Environment Variables:**
*   `JWT_SECRET_KEY`: Secures authentication. Fails fast if missing.
*   `LLM_TEMPERATURE`: Configurable tuning for GPT generation (Default: 0.2).
*   `REDIS_TTL_SECONDS`: Auto-expires background tasks (Default: 86400).
*   `DATABASE_URL`: Points to the local SQLite database, establishing it as the unified SOT and replacing the legacy fractured DBeaver PostgreSQL sync.

## 3. The Audio Processing Pipeline
When an audio file is uploaded, a background Celery task is dispatched (`process_voice_analysis_pipeline`):

1.  **Normalization:** Audio is converted to 16kHz mono WAV using `pydub`/`ffmpeg`.
2.  **Diarization:** PyAnnote groups acoustic segments by speaker.
3.  **ASR:** Whisper transcribes the audio, generating word-level timestamps.
4.  **Alignment:** Diarization and ASR are merged to create speaker-attributed transcripts (Speaker A / Speaker B).
5.  **Analytics:** The transcript is sent to `llm_analytics.py` where GPT-4o-mini generates the 5-Pillar executive insights using the centralized `architecture/system_prompt.md`.
6.  **PII Redaction:** Sensitive phrases are beeped out of the audio, and words are scrubbed from the transcript text.

## 4. Analytical Prompts & Rules
All LLM analytical prompts have been centralized:
*   **`architecture/system_prompt.md`**: The sole system prompt containing the 5-pillar framework (Executive Summary, Sentiment, Intent Profiling, Action Items, and QA Scorecard) and enforcing strict JSON adherence.
*   **`architecture/user_prompt.md`**: The dynamic user prompt template that ingests the raw transcript.

## 5. Development Standards & Quality Gates
As mandated by `.Agents/agents.md`, the codebase strictly adheres to the following quality gates:
*   **Linting & Analysis:** `ruff` (with strict rule enforcement for `BLE001`, `RUF013`, `S110`, etc.), `mypy`, and `bandit`.
*   **Imports:** Cleanly sorted using `ruff` rules.
*   **Dependencies:** Pinned dependencies (e.g., `numpy<2.0.0`) in `requirements.txt` to prevent ecosystem breaking changes.
*   **Smoke Testing:** Developers must pass `pytest -m smoke -x` before concluding any feature branches. Test suites (like `test_redaction.py`) handle missing local environment data via `pytest.skip` instead of abruptly failing.
