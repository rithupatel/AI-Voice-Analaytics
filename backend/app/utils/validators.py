import magic
from fastapi import HTTPException, UploadFile


async def validate_audio_upload(file: UploadFile):
    """
    Validates that the uploaded file is a supported audio type
    by inspecting the first 2KB chunk using python-magic.
    """
    chunk = await file.read(2048)
    mime = magic.from_buffer(chunk, mime=True)
    await file.seek(0)
    
    
    # Strictly the prompt asks for: (audio/wav, audio/mpeg, audio/mp4, audio/x-m4a, audio/ogg)
    # Let me follow strictly the prompt array.
    prompt_valid_mimes = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg"]
    
    if mime not in prompt_valid_mimes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Detected MIME: {mime}. Allowed types: {', '.join(prompt_valid_mimes)}"
        )
