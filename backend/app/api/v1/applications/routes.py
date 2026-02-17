"""Application routes."""
import logging
from fastapi import APIRouter, HTTPException, Depends

from app.repositories import application_repository
from app.api.v1.auth.dependencies import get_current_user
from app.api.v1.applications.schemas import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("")
async def list_applications(user: dict = Depends(get_current_user)):
    """List user's applications."""
    apps = await application_repository.get_by_user(user["id"])
    return {"applications": apps, "count": len(apps)}


@router.post("", response_model=ApplicationResponse)
async def create_application(data: ApplicationCreate, user: dict = Depends(get_current_user)):
    """Create new application."""
    app_data = {
        "user_id": user["id"],
        "job_id": data.job_id,
        "status": data.status.value,
        "notes": data.notes,
    }
    created = await application_repository.create(app_data)
    return ApplicationResponse(**created)


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(application_id: str, user: dict = Depends(get_current_user)):
    """Get single application."""
    app = await application_repository.get_by_id(application_id, user["id"])
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return ApplicationResponse(**app)


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: str, data: ApplicationUpdate, user: dict = Depends(get_current_user)
):
    """Update application status or notes."""
    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].value
    
    updated = await application_repository.update(application_id, update_data, user["id"])
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found")
    return ApplicationResponse(**updated)


@router.delete("/{application_id}")
async def delete_application(application_id: str, user: dict = Depends(get_current_user)):
    """Delete application."""
    deleted = await application_repository.delete(application_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted"}
