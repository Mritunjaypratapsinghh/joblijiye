"""Application configuration."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "JobLijiye API"
    debug: bool = False
    
    # Database (Supabase PostgreSQL)
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: str = ""
    
    # JWT Auth
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    
    # Google OAuth
    google_client_id: str = ""
    
    # Groq AI
    groq_api_key: str = ""
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
