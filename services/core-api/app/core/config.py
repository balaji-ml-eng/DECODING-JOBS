"""Application configuration, loaded from environment variables (.env in dev)."""

from functools import lru_cache
from typing import Annotated

from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Strictly-typed runtime configuration for the core-api service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "DECODING JOBS Core API"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: PostgresDsn

    # Comma-separated in the environment, e.g. "http://localhost:3000,http://127.0.0.1:3000"
    # NoDecode stops pydantic-settings from attempting a JSON parse first, so the
    # raw comma-separated string reaches the validator below intact.
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — environment is read once per process."""
    return Settings()
