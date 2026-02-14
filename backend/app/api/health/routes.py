"""Health check endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/check")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "job-tracker-api"}
