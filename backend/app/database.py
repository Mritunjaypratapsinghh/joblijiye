"""Database client (Supabase)."""
from supabase import create_client, Client
from app.config import get_settings

_client: Client | None = None


def get_supabase() -> Client:
    """Get Supabase client (lazy initialization)."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def get_supabase_admin() -> Client:
    """Get Supabase client with service role key (bypasses RLS)."""
    settings = get_settings()
    if not settings.supabase_service_key:
        raise ValueError("SUPABASE_SERVICE_KEY must be set for admin operations")
    return create_client(settings.supabase_url, settings.supabase_service_key)
