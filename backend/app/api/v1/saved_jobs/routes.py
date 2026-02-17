"""Saved jobs routes."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.repositories import saved_jobs_repository
from app.api.v1.auth.dependencies import get_current_user

router = APIRouter(prefix="/saved-jobs", tags=["saved-jobs"])


class SaveJobRequest(BaseModel):
    job_id: str


class BulkSaveRequest(BaseModel):
    job_ids: list[str]


@router.get("")
async def list_saved_jobs(user: dict = Depends(get_current_user)):
    """Get all saved jobs for current user."""
    saved = await saved_jobs_repository.get_by_user(user["id"])
    return {"saved_jobs": saved, "count": len(saved)}


@router.get("/ids")
async def get_saved_job_ids(user: dict = Depends(get_current_user)):
    """Get just the job IDs (for syncing with frontend)."""
    job_ids = await saved_jobs_repository.get_job_ids(user["id"])
    return {"job_ids": job_ids}


@router.post("")
async def save_job(data: SaveJobRequest, user: dict = Depends(get_current_user)):
    """Save a job."""
    await saved_jobs_repository.save(user["id"], data.job_id)
    return {"message": "Job saved"}


@router.delete("/{job_id}")
async def unsave_job(job_id: str, user: dict = Depends(get_current_user)):
    """Remove a saved job."""
    await saved_jobs_repository.unsave(user["id"], job_id)
    return {"message": "Job removed"}


@router.post("/sync")
async def sync_saved_jobs(data: BulkSaveRequest, user: dict = Depends(get_current_user)):
    """Sync localStorage bookmarks to database."""
    count = await saved_jobs_repository.bulk_save(user["id"], data.job_ids)
    return {"synced": count}
