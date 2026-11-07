"""Application settings, loaded from environment / .env."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str                      # Neon pooled connection string
    session_secret: str
    google_client_id: str
    frontend_origin: str = "http://localhost:3000"
    resend_api_key: str = ""               # empty = email disabled (dev/tests)
    resend_from_email: str = "School Community <notifications@example.com>"


@lru_cache
def get_settings() -> Settings:
    return Settings()
