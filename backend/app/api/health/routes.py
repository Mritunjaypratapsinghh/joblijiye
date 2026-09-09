"""Health check endpoints."""
from fastapi import APIRouter
from httpx import ConnectError

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/check")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "joblijiye-api"}


@router.get("/db")
async def db_health_check():
    """Database connection health check."""
    try:
        from app.database import get_supabase
        db = get_supabase()
        # Simple query to test connection
        result = db.table("jobs").select("id").limit(1).execute()
        return {"status": "healthy", "database": "connected"}
    except ConnectError as e:
        return {"status": "unhealthy", "database": "connection_failed", "error": str(e)}
    except Exception as e:
        return {"status": "unhealthy", "database": "error", "error": str(e)}
