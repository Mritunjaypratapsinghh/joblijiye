"""Analytics API endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.v1.auth.dependencies import get_current_user
from app.repositories.analytics_repository import analytics_repository

router = APIRouter(prefix="/analytics", tags=["analytics"])


class TrackViewRequest(BaseModel):
    job_id: str
    source: str | None = None


class TrackClickRequest(BaseModel):
    job_id: str
    apply_url: str


class ConfirmApplyRequest(BaseModel):
    job_id: str
    applied: bool


@router.post("/track/view")
async def track_view(req: TrackViewRequest, user: dict = Depends(get_current_user)):
    """Track when user views a job."""
    return await analytics_repository.track_job_view(user["id"], req.job_id, req.source)


@router.post("/track/click")
async def track_click(req: TrackClickRequest, user: dict = Depends(get_current_user)):
    """Track when user clicks apply button."""
    return await analytics_repository.track_apply_click(user["id"], req.job_id, req.apply_url)


@router.post("/track/confirm")
async def confirm_application(req: ConfirmApplyRequest, user: dict = Depends(get_current_user)):
    """Confirm whether user actually applied after clicking."""
    return await analytics_repository.confirm_application(user["id"], req.job_id, req.applied)


@router.get("/pending")
async def get_pending_confirmations(user: dict = Depends(get_current_user)):
    """Get jobs where user clicked apply but hasn't confirmed."""
    pending = await analytics_repository.get_pending_confirmations(user["id"])
    return {"pending": pending}


@router.get("/funnel")
async def get_funnel(user: dict = Depends(get_current_user)):
    """Get application funnel metrics."""
    return await analytics_repository.get_user_funnel(user["id"])


@router.get("/sources")
async def get_source_performance(user: dict = Depends(get_current_user)):
    """Get performance metrics by job source."""
    sources = await analytics_repository.get_source_performance(user["id"])
    return {"sources": sources}


@router.get("/timeline")
async def get_timeline(days: int = 30, user: dict = Depends(get_current_user)):
    """Get activity timeline for past N days."""
    timeline = await analytics_repository.get_activity_timeline(user["id"], days)
    return {"timeline": timeline}


@router.get("/dashboard")
async def get_dashboard(user: dict = Depends(get_current_user)):
    """Get comprehensive dashboard statistics."""
    return await analytics_repository.get_dashboard_stats(user["id"])
