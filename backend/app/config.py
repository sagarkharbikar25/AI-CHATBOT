import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
RECORDINGS_DIR = BASE_DIR / "recordings"
PRODUCTS_DIR = BASE_DIR.parent / "products"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]
    DATABASE_PATH: str = str(BASE_DIR / "app.db")
    RECORDINGS_PATH: str = str(RECORDINGS_DIR)
    PRODUCTS_PATH: str = str(PRODUCTS_DIR)
    
    WS_TOKEN_SECRET: str = "ai-voice-sales-bot-secret-key-2026"
    MAX_CALL_SECONDS: int = 300
    DAILY_CALL_CAP: int = 100

    # Providers
    LLM_PROVIDER: str = "auto"  # groq, gemini, openai, mock
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    TTS_PROVIDER: str = "edge"  # edge, mock
    
    # Supabase optional
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_BUCKET: str = "recordings"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.RECORDINGS_PATH, exist_ok=True)
os.makedirs(settings.PRODUCTS_PATH, exist_ok=True)
