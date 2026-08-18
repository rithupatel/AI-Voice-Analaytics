import logging
import os

import requests

logger = logging.getLogger("smallest_ai")

def transcribe_and_redact(audio_file_path: str, api_key: str, endpoint: str) -> str:
    """
    Sends an audio file to Smallest.ai Pulse STT API to transcribe and redact PII.
    Returns the redacted transcript text.
    """
    if not os.path.exists(audio_file_path):
        logger.error(f"Audio file not found: {audio_file_path}")
        return ""

    if not api_key:
        logger.warning("Smallest.ai API key missing.")
        return ""

    # Ensure correct endpoint is used. If user provided a custom /beep endpoint, use it,
    # otherwise fallback to the standard STT endpoint.
    if "/beep" in endpoint:
        # Fallback to standard if they just left the placeholder
        endpoint = "https://api.smallest.ai/waves/v1/stt/"
        
    url = f"{endpoint}?redact_pii=true&redact_pci=true"
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    try:
        with open(audio_file_path, "rb") as f:
            files = {"file": (os.path.basename(audio_file_path), f, "audio/wav")}
            response = requests.post(url, headers=headers, files=files)
            
        if response.status_code == 200:
            data = response.json()
            return data.get("text", "")
        else:
            logger.error(f"Smallest.ai API error {response.status_code}: {response.text}")
            return ""
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to call Smallest.ai API: {e}")
        return ""
