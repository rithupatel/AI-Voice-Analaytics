import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path, override=True)

class Settings(BaseSettings):
    APP_NAME: str = "AI Voice Analysis Platform"
    DEBUG: bool = True
    DATABASE_URL: str = f"sqlite+aiosqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'voice_analysis.db')}"
    DBEAVER_DB_URL: str = os.getenv("DBEAVER_DB_URL", "")
    ROOT_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    MEDIA_DIR: str = os.path.join(ROOT_DIR, "data", "media")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    SMALLEST_API_KEY: str = os.getenv("SMALLEST_API_KEY", "")
    SMALLEST_API_ENDPOINT: str = os.getenv("SMALLEST_API_ENDPOINT", "https://api.smallest.ai/v1/beep")
    
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "")
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "")
    GMAIL_ADDRESS: str = os.getenv("GMAIL_ADDRESS", "")
    GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", "")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    REDIS_TTL_SECONDS: int = int(os.getenv("REDIS_TTL_SECONDS", "86400"))
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JSON_STORAGE_DIR: str = os.path.join(ROOT_DIR, "data", "json_records")
    TRANSCRIPTS_DIR: str = os.path.join(ROOT_DIR, "data", "transcripts")
    LOGS_DIR: str = os.path.join(ROOT_DIR, "data", "logs")
    SYSTEM_LOG_PATH: str = os.path.join(LOGS_DIR, "system.log")
    
    def reload_env(self):
        load_dotenv(env_path, override=True)
        self.DBEAVER_DB_URL = os.getenv("DBEAVER_DB_URL", "")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        self.HF_TOKEN = os.getenv("HF_TOKEN", "")
        self.SMALLEST_API_KEY = os.getenv("SMALLEST_API_KEY", "")
        self.SMALLEST_API_ENDPOINT = os.getenv("SMALLEST_API_ENDPOINT", "https://api.smallest.ai/v1/beep")
        self.AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
        self.AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        self.AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
        self.S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")
        self.S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "")
        self.GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
        self.GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
        self.LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))
        self.REDIS_TTL_SECONDS = int(os.getenv("REDIS_TTL_SECONDS", "86400"))
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
        return self.OPENAI_API_KEY

settings = Settings()

os.makedirs(settings.MEDIA_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_DIR, "uploads"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_DIR, "processed"), exist_ok=True)
os.makedirs(settings.JSON_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.TRANSCRIPTS_DIR, exist_ok=True)
os.makedirs(settings.LOGS_DIR, exist_ok=True)
