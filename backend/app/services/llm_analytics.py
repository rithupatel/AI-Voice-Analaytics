import logging
import os
import re
from typing import Any

from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger("llm_analytics")

class SpeakerIntentModel(BaseModel):
    speaker_label: str = Field(description="Speaker label, e.g., SPEAKER_00 or SPEAKER_01")
    display_name: str = Field(default="Speaker", description="Human-readable speaker name, e.g., Agent or Customer")
    confidence_level: str = Field(default="HIGH", description="Confidence level of speaker: HIGH, MEDIUM, or LOW")
    emotional_state: str = Field(default="5/10", description="Rate overall tone/emotion from 0 to 10 formatted as 'X/10' (e.g., '8/10')")
    frustration_level: str = Field(default="0/10", description="Rate frustration level from 0 to 10 formatted as 'X/10' (e.g., '2/10')")
    calmness_level: str = Field(default="5/10", description="Rate calmness level from 0 to 10 formatted as 'X/10' (e.g., '9/10')")
    perplexity_level: str = Field(default="0/10", description="Rate perplexity/confusion level from 0 to 10 formatted as 'X/10' (e.g., '1/10')")
    knowledgeability: str = Field(default="5/10", description="Rate knowledgeability from 0 to 10 formatted as 'X/10' (e.g., '9/10')")
    tone_behavior: str = Field(default="5/10", description="Rate professional behavior from 0 to 10 formatted as 'X/10' (e.g., '9/10')")
    primary_intent: str = Field(description="Primary intent or goal of the speaker")
    key_points: list[str] = Field(default_factory=list, description="Key statements or requests made by this speaker")

class QAScorecardSchema(BaseModel):
    greeting_and_verification: str = Field(description="Yes, No, or NA. Did the agent greet the caller professionally and verify their name or details?")
    active_listening_and_empathy: str = Field(description="Yes, No, or NA. Did the agent actively listen and show empathy?")
    probing_questions: str = Field(description="Yes, No, or NA. Did the agent ask appropriate probing questions?")
    validate_priority: str = Field(description="Yes, No, or NA. Did the agent validate the priority/urgency of the issue?")
    accurate_troubleshooting: str = Field(description="Yes, No, or NA. Did the agent troubleshoot the issue accurately?")
    solution_accuracy: str = Field(description="Yes, No, or NA. Was the solution provided accurate and complete?")
    valid_escalation: str = Field(description="Yes, No, or NA. If escalated, was it valid? Otherwise NA.")
    use_of_knowledge_base: str = Field(description="Yes, No, or NA. Did the agent use/reference a KB or standard procedure?")
    critical_p1_compliance: str = Field(description="Yes, No, or NA. Did the agent comply with process standards?")
    ticket_documentation: str = Field(description="Yes, No, or NA. Did the agent document the ticket details correctly?")
    time_entry_agreement: str = Field(description="Yes, No, or NA. Did the agent agree on time/SLA timeline with the caller?")
    ownership_of_incident: str = Field(description="Yes, No, or NA. Did the agent take ownership of resolving the incident?")
    communication_sla: str = Field(description="Yes, No, or NA. Did the agent communicate the timeline clearly?")
    proper_closing_confirmation: str = Field(description="Yes, No, or NA. Did the agent close the call professionally and confirm customer satisfaction?")
    first_call_resolution: str = Field(description="Yes, No, or NA. Was the issue resolved on this first call?")
    thirty_minute_rule: str = Field(description="Yes, No, or NA. Was the issue resolved within the standard time limit?")
    minimal_transfers_hold: str = Field(description="Yes, No, or NA. Were transfers and hold times kept to a minimum?")

class CallAnalysisSchema(BaseModel):
    agent_name: str = Field(default="Unknown Agent", description="The name of the agent greeting the customer (e.g. Rachel, Chris, Martha). If not stated, use 'Unknown Agent'.")
    call_summary: str = Field(description="A concise 3-4 sentence summary of the entire conversation")
    overall_sentiment: str = Field(description="POSITIVE, NEUTRAL, NEGATIVE, or MIXED")
    issue_resolved: bool = Field(description="Whether the customer's core issue was resolved (True or False)")
    understandability_percentage: int = Field(description="Percentage score (0-100) indicating how understandable and clear the speakers were")
    knowledgeable_score: int = Field(description="Score (1-10) rating the agent's knowledgeability and competence")
    empathy_score: int = Field(description="Score (1-10) rating the agent's empathy towards the customer")
    qa_scorecard: QAScorecardSchema = Field(description="Detailed QA scorecard evaluation based on the Service Desk Call Review criteria")
    speaker_intents: list[SpeakerIntentModel] = Field(default_factory=list)
    key_action_items: list[str] = Field(default_factory=list, description="Agreed next steps or follow-up items")

# Lazy-loaded PyTorch NER pipeline
ner_pipeline = None

def get_ner_pipeline():
    global ner_pipeline
    if ner_pipeline is None:
        try:
            import torch
            from transformers import pipeline
            
            # Auto-detect GPU for PyTorch NER
            device = 0 if torch.cuda.is_available() else -1
            device_name = "GPU (CUDA)" if device == 0 else "CPU"
            
            logger.info(f"Initializing PyTorch OpenAI Privacy Filter model on {device_name}...")
            ner_pipeline = pipeline("token-classification", model="openai/privacy-filter", aggregation_strategy="simple", device=device)
        except ImportError:
            logger.warning("transformers library not found. Falling back to simple regex.")
            ner_pipeline = "fallback"
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Failed to load PyTorch NER model: {e}. Falling back to simple regex.")
            ner_pipeline = "fallback"
    return ner_pipeline

def scrub_pii_pytorch(text: str) -> str:
    """
    PyTorch-based PII Scrubber for Text Transcripts using OpenAI's Privacy Filter.
    Dynamically redacts 8 core categories of private/sensitive information.
    """
    # 1. Fallback regex for standard numeric/email formats (which NER might miss)
    text = re.sub(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', '[REDACTED_PRIVATE_PHONE]', text)
    text = re.sub(r'\b\d{7,16}\b', '[REDACTED_ACCOUNT_NUMBER]', text)
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_PRIVATE_EMAIL]', text)

    # 2. PyTorch NER for contextual entities (8 categories from OpenAI Privacy Filter)
    pipe = get_ner_pipeline()
    if pipe and pipe != "fallback":
        try:
            entities = pipe(text)
            # Sort entities in reverse order by start index so replacing doesn't shift offsets
            entities = sorted(entities, key=lambda x: x['start'], reverse=True)
            for ent in entities:
                ent_group = ent.get('entity_group', '')
                if ent_group in [
                    'private_person', 'private_address', 'private_email', 
                    'private_phone', 'private_url', 'private_date', 
                    'account_number', 'secret'
                ]:
                    start = ent['start']
                    end = ent['end']
                    text = text[:start] + f"[REDACTED_{ent_group.upper()}]" + text[end:]
        except Exception as e:  # noqa: BLE001
            logger.warning(f"PyTorch NER inference failed: {e}")

    return text

def analyze_transcript_with_gpt4o_mini(stage3_payload: dict[str, Any], api_key: str = "") -> tuple[dict[str, Any], str]:
    """
    Stage 5: Formats clean speaker dialogue text from Stage 3 JSON (strictly without timestamps or audio),
    scrubs PII via PyTorch NER, and passes it to GPT-4o-mini for structured analysis.
    Returns (analysis_dict, scrubbed_transcript_string).
    """
    aligned_items = stage3_payload.get("aligned_transcript", [])
    
    # Format clean, PII-scrubbed speaker dialogue string
    clean_lines = []
    for item in aligned_items:
        spk = item.get("display_name", item.get("speaker_label", "Speaker"))
        txt = item.get("text", "")
        scrubbed_txt = scrub_pii_pytorch(txt)
        clean_lines.append(f"{spk}: {scrubbed_txt}")
    
    clean_dialogue_text = "\n".join(clean_lines)

    if not api_key:
        raise ValueError("OpenAI API key is missing. Cannot perform LLM analysis.")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Load system prompt from architecture/system_prompt.md if available
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "architecture", "system_prompt.md")
        system_prompt = (
            "You are an expert Service Desk QA analyst. Analyze the following speaker-attributed call transcript "
            "and perform a detailed QA review of the agent's performance. "
            "First, identify which speaker is the Agent and which is the Customer based on their roles in the conversation. "
            "Evaluate the 17 metrics in the qa_scorecard carefully: "
            "1. greeting_and_verification: Did the agent greet the caller professionally and verify their name or details? (Yes/No/NA) "
            "2. active_listening_and_empathy: Did the agent show empathy and active listening? (Yes/No/NA) "
            "3. probing_questions: Did the agent ask appropriate probing questions? (Yes/No/NA) "
            "4. validate_priority: Did the agent validate the priority or impact? (Yes/No/NA) "
            "5. accurate_troubleshooting: Did the agent troubleshoot the issue correctly? (Yes/No/NA) "
            "6. solution_accuracy: Was the solution/resolution accurate? (Yes/No/NA) "
            "7. valid_escalation: Was the escalation valid if it occurred? (Yes/No/NA) "
            "8. use_of_knowledge_base: Did the agent use/reference a KB or standard procedure? (Yes/No/NA) "
            "9. critical_p1_compliance: Was there compliance with standard SLA and critical policies? (Yes/No/NA) "
            "10. ticket_documentation: Did the agent document/confirm ticket categories? (Yes/No/NA) "
            "11. time_entry_agreement: Did the agent agree on timeline/SLA? (Yes/No/NA) "
            "12. ownership_of_incident: Did the agent take clear ownership? (Yes/No/NA) "
            "13. communication_sla: Did the agent communicate the resolution timeline? (Yes/No/NA) "
            "14. proper_closing_confirmation: Did the agent confirm satisfaction and close professionally? (Yes/No/NA) "
            "15. first_call_resolution: Was it resolved on the first contact? (Yes/No/NA) "
            "16. thirty_minute_rule: Was it handled within 30 minutes? (Yes/No/NA) "
            "17. minimal_transfers_hold: Were hold/transfer times minimal? (Yes/No/NA) "
            "Ensure that if the agent greeted the customer and/or verified the customer (e.g. asking for name, email, zip code), "
            "greeting_and_verification MUST be scored as 'Yes'."
        )
        if os.path.exists(prompt_path):
            try:
                with open(prompt_path, "r", encoding="utf-8") as f:
                    system_prompt = f.read()
            except Exception as pe:  # noqa: BLE001
                logger.warning(f"Could not read system_prompt.md: {pe}")
        
        # Load user prompt from architecture/user_prompt.md if available
        user_prompt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "architecture", "user_prompt.md")
        user_prompt = (
            "Please analyze the following speaker-attributed call transcript. "
            "Accurately differentiate between individual speakers (e.g. identify Speaker A / Agent vs Speaker B / Customer), "
            "and evaluate all 17 metrics in the qa_scorecard carefully based on the rules provided in the system prompt.\n\n"
            f"Transcript:\n{clean_dialogue_text}"
        )
        if os.path.exists(user_prompt_path):
            try:
                with open(user_prompt_path, "r", encoding="utf-8") as f:
                    user_prompt_template = f.read()
                user_prompt = user_prompt_template.replace("{transcript}", clean_dialogue_text)
            except Exception as pe:  # noqa: BLE001
                logger.warning(f"Could not read user_prompt.md: {pe}")

        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format=CallAnalysisSchema,
            temperature=settings.LLM_TEMPERATURE
        )
        
        parsed_data = response.choices[0].message.parsed
        return parsed_data.model_dump(), clean_dialogue_text
    except Exception as e:  # noqa: BLE001
        logger.error(f"GPT-4o-mini API analysis failed: {e}")
        raise RuntimeError(f"LLM Analytics pipeline failed: {e}")

class EmotionAnalysisSchema(BaseModel):
    emotion: str = Field(description="Primary emotion detected (e.g. Frustrated, Confident, Disappointed, Angry, Calm, Happy)")
    frustration_level: str = Field(description="Level of frustration on a scale of 1-10 (e.g. '1/10')")
    calmness_level: str = Field(description="Level of calmness on a scale of 1-10 (e.g. '8/10')")
    perplexity_level: str = Field(description="Level of perplexity or confusion on a scale of 1-10 (e.g. '2/10')")
    confidence: str = Field(description="HIGH, MEDIUM, or LOW confidence in the emotion detection")
    reasoning: str = Field(description="A short sentence explaining why these emotions were selected based on the words spoken")

def analyze_speaker_emotion(stt_transcript: str, speaker_type: str, api_key: str) -> dict[str, Any]:
    """
    Prompt 2 & 3: Analyzes the isolated speaker's STT transcript to determine their emotional state.
    """
    if not stt_transcript.strip():
        return {"emotion": "Unknown", "frustration_level": "N/A", "calmness_level": "N/A", "perplexity_level": "N/A", "confidence": "LOW", "reasoning": "No speech detected."}
        
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            
            response = client.beta.chat.completions.parse(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": f"You are an expert audio emotion analyzer. Analyze the following transcript of {speaker_type} and determine their primary emotional state based purely on the text context and wording."},
                    {"role": "user", "content": f"Transcript:\n{stt_transcript}"}
                ],
                response_format=EmotionAnalysisSchema,
                temperature=settings.LLM_TEMPERATURE
            )
            
            return response.choices[0].message.parsed.model_dump()
        except Exception as e:  # noqa: BLE001
            logger.warning(f"GPT-4o-mini Emotion analysis failed: {e}")
            
    return {"emotion": "Calm", "frustration_level": "N/A", "calmness_level": "N/A", "perplexity_level": "N/A", "confidence": "HIGH", "reasoning": "Fallback analysis due to API failure."}

def get_pii_phrases_locally(text: str) -> list[str]:
    """
    Identifies PII phrases (Names, Locations, Organizations, Phones, Emails, Numbers)
    locally using PyTorch OpenAI Privacy Filter and regex.
    """
    if not text.strip():
        return []
        
    pii_phrases = []
    
    # 1. Regex for phones, credit card/account numbers, and emails
    phone_matches = re.findall(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', text)
    number_matches = re.findall(r'\b\d{7,16}\b', text)
    email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    
    pii_phrases.extend(phone_matches)
    pii_phrases.extend(number_matches)
    pii_phrases.extend(email_matches)
    
    # 2. PyTorch OpenAI Privacy Filter NER for 8 core categories
    pipe = get_ner_pipeline()
    if pipe and pipe != "fallback":
        try:
            entities = pipe(text)
            for ent in entities:
                ent_group = ent.get('entity_group', '')
                if ent_group in [
                    'private_person', 'private_address', 'private_email', 
                    'private_phone', 'private_url', 'private_date', 
                    'account_number', 'secret'
                ]:
                    start = ent['start']
                    end = ent['end']
                    phrase = text[start:end].strip()
                    if phrase and phrase not in pii_phrases:
                        pii_phrases.append(phrase)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Local NER PII detection failed: {e}")
            
    # Remove duplicates and empty strings
    return list({p for p in pii_phrases if p.strip()})

def analyze_speaker_emotion_from_audio(audio_path: str, speaker_type: str, api_key: str) -> dict[str, Any]:
    """
    Sends the mono audio file (base64 encoded) to OpenAI's gpt-4o-audio-preview model
    to detect speaker emotions directly from acoustic characteristics (tone, pitch, speed, words).
    """
    if not os.path.exists(audio_path):
        return {"emotion": "Unknown", "frustration_level": "N/A", "calmness_level": "N/A", "perplexity_level": "N/A", "confidence": "LOW", "reasoning": "Audio file not found."}
        
    if not api_key:
        return {"emotion": "Unknown", "frustration_level": "N/A", "calmness_level": "N/A", "perplexity_level": "N/A", "confidence": "LOW", "reasoning": "OpenAI API key missing."}
        
    try:
        import base64
        import json

        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        with open(audio_path, "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")
            
        ext = os.path.splitext(audio_path)[1].replace(".", "").lower()
        if ext not in ["wav", "mp3", "aac", "ogg", "flac"]:
            ext = "wav"
            
        prompt = (
            f"You are an expert audio emotion analyzer. Listen to the provided audio of a speaker ({speaker_type}) "
            "and determine their primary emotional state (e.g. Frustrated, Confident, Disappointed, Angry, Calm, Happy), "
            "their frustration level (1-10), calmness level (1-10), and perplexity/confusion level (1-10), "
            "your confidence in this detection (HIGH, MEDIUM, or LOW), and your reasoning based on their tone, pitch, speed, and words. "
            "Note that some parts of the audio may contain 'beep' sounds where private information was redacted; ignore the beeps. "
            "Respond ONLY with a valid JSON object matching this schema: "
            '{"emotion": "emotional state", "frustration_level": "1/10", "calmness_level": "8/10", "perplexity_level": "2/10", "confidence": "HIGH/MEDIUM/LOW", "reasoning": "short explanation"}'
        )
        
        logger.info(f"Calling OpenAI gpt-4o-audio-preview for acoustic emotion detection ({speaker_type})...")
        response = client.chat.completions.create(
            model="gpt-4o-audio-preview-2024-10-01",
            modalities=["text"],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "input_audio",
                            "input_audio": {"data": audio_data, "format": ext}
                        }
                    ]
                }
            ]
        )
        
        text_response = response.choices[0].message.content.strip()
        
        # Strip markdown block formatting if present
        if text_response.startswith("```"):
            text_response = re.sub(r"^```json\s*", "", text_response)
            text_response = re.sub(r"^```\s*", "", text_response)
            text_response = re.sub(r"\s*```$", "", text_response)
            text_response = text_response.strip()
            
        result = json.loads(text_response)
        logger.info(f"Successfully detected emotion from audio: {result}")
        return result
    except Exception as e:  # noqa: BLE001
        logger.error(f"gpt-4o-audio emotion analysis failed: {e}. Falling back.")
        return {"emotion": "Calm", "frustration_level": "N/A", "calmness_level": "N/A", "perplexity_level": "N/A", "confidence": "LOW", "reasoning": f"Audio analysis fallback: {e}"}


