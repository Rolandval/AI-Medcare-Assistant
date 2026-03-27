"""Application configuration via pydantic-settings"""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

# Project root: AI-Medcare-Assistant/
PROJECT_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "AI-Medcare-Assistant"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8081"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://medcare:medcare_secret@localhost:5433/medcare"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # JWT
    JWT_SECRET_KEY: str = "change-this-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Claude AI
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-6"
    CLAUDE_MAX_TOKENS: int = 4096
    AI_ANALYSIS_TIMEOUT: int = 60

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""

    # Cloudflare R2
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "medcare-files"
    R2_PUBLIC_URL: str = ""
    R2_ENDPOINT_URL: str = ""

    # Survey Schedule (UTC hour)
    MORNING_SURVEY_HOUR: int = 5
    MORNING_SURVEY_MINUTE: int = 30
    EVENING_SURVEY_HOUR: int = 17
    EVENING_SURVEY_MINUTE: int = 0

    # File Uploads
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    ALLOWED_DOC_TYPES: List[str] = ["application/pdf", "image/jpeg", "image/png"]
    ALLOWED_AUDIO_TYPES: List[str] = ["audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4"]

    @field_validator("ALLOWED_IMAGE_TYPES", "ALLOWED_DOC_TYPES", "ALLOWED_AUDIO_TYPES", mode="before")
    @classmethod
    def parse_list(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",")]
        return v


settings = Settings()
