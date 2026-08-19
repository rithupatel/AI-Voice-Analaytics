# AI Voice Analytics Platform: User Manual

Welcome to the AI Voice Analytics platform! This comprehensive platform leverages state-of-the-art machine learning models (like Whisper, Pyannote, and GPT-4o-mini) to automatically transcribe, diarize, and deeply analyze your team's customer support calls. 

This manual will guide you through the features and workflows of the application.

---

## 1. Getting Started & Authentication

The platform uses a secure, passwordless authentication system.

### Logging In
1. Open the application in your web browser.
2. In the **Email Address** field, enter your authorized email address.
3. Click **Send Login Code**. The system will dispatch a 4-digit OTP (One-Time Password) to your inbox.
4. Enter the 4-digit code into the **Login Code** field and click **Log In**.
   > [!TIP]
   > Your code remains valid until you explicitly request a new one. You can use the same code for subsequent logins by entering it alongside your email on the login screen.

---

## 2. Platform Navigation Overview

The platform is designed with a sleek, 3-panel architecture:

1. **Panel 1 (Left): Agent Directory** - Manage and view the performance of all your support agents.
2. **Panel 2 (Middle): Timeline & Recordings** - View the history of uploaded calls and their processing status.
3. **Panel 3 (Right): Deep Analytics** - Dive into the AI-generated insights, transcripts, and QA scorecards for a selected call.

---

## 3. Managing Agents (Panel 1)

The Agent Directory allows you to track individual performance.

- **Dynamic Scoring Colors**: Agents are color-coded based on their average QA scores:
  - 🟢 **Green**: Excellent performance (Default: > 75%)
  - 🟡 **Yellow**: Needs improvement (Default: 50% - 75%)
  - 🔴 **Red**: Critical attention required (Default: < 50%)
- **Add / Edit Agents**: Click the Add button to create a new agent profile, or use the Edit feature to update an existing agent's details.
- **Batch Upload**: Use the Batch Upload feature to quickly import multiple agents simultaneously.

---

## 4. Uploading & Processing Recordings (Panel 2)

The platform supports robust bulk-uploading and sequential processing to ensure optimal performance.

### How to Upload
1. Select an agent in the first panel.
2. Click the **Upload Recording** button in the second panel.
3. Select one or multiple audio files (MP3, WAV, etc.), or upload a compressed **ZIP archive** containing multiple recordings.

### Processing Pipeline
Once uploaded, your files are queued and processed sequentially. The platform runs a complex 6-stage ML pipeline:
1. **Queued**: Waiting for system resources.
2. **Uploading & Normalizing**: Standardizing audio formats and volumes.
3. **Diarizing**: Splitting the audio by speaker (Agent vs. Customer).
4. **Transcribing**: Converting speech to text using Whisper.
5. **Aligning**: Synchronizing word-level timestamps.
6. **Analyzing**: Generating AI insights and QA scores.

> [!NOTE]
> You can click on any recording while it says **Processing...** in the middle panel to view a live, real-time progress tracker of the pipeline in the third panel.

---

## 5. Call Insights & AI Analytics (Panel 3)

Once a recording reaches the **Completed** state, clicking on it will reveal a rich set of AI-generated analytics.

### Key Metrics
- **Call Summary**: A high-level overview of the conversation. 
  - *Dead Air Detection*: If the AI detects continuous silence (dead air) for more than 2 minutes at any point during the call, a specific warning note will be automatically appended to this summary.
- **Sentiment & Emotion**: Tracks the overall mood (Positive, Neutral, Negative, Mixed) and evaluates specific emotional states for each speaker.
- **Understandability & Knowledge**: Rates the agent's clarity and technical expertise.

### QA Scorecard
The AI strictly evaluates the agent against a 17-point QA scorecard, marking items as Yes, No, or N/A. Key checkpoints include:
- Proper Greeting & Verification
- Active Listening & Empathy
- Accurate Troubleshooting & Solution Accuracy
- 30-Minute Rule Compliance
- First Call Resolution (FCR)

### Transcripts & PII Scrubbing
- **Interactive Transcript**: Read the full conversation, split by speaker. 
- **PII Scrubbing**: The system utilizes local PyTorch models to automatically detect and scrub Personally Identifiable Information (PII) such as phone numbers and email addresses from the transcript to ensure data privacy.
- **Audio Playback**: Listen to the call alongside the transcript, featuring an interactive waveform.

---

## 6. Exporting & Sharing Results

You can easily share the AI insights with management or the agents themselves.

- **Download PDF**: Click the PDF icon to generate and download a comprehensive, styled report of the QA scorecard and analytics.
- **Email Report**: Click the Email icon to open a composer. The system will automatically attach the generated PDF report, allowing you to instantly email the feedback to the agent or stakeholders.
