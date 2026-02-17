"""Job alerts routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.repositories import job_alerts_repository
from app.api.v1.auth.dependencies import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertCreate(BaseModel):
    keywords: list[str]
    locations: list[str] = []
    job_types: list[str] = []
    remote_only: bool = False
    min_salary: Optional[int] = None
    frequency: str = "daily"  # instant, daily, weekly


class AlertUpdate(BaseModel):
    keywords: Optional[list[str]] = None
    locations: Optional[list[str]] = None
    job_types: Optional[list[str]] = None
    remote_only: Optional[bool] = None
    min_salary: Optional[int] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_alerts(user: dict = Depends(get_current_user)):
    """Get all alerts for current user."""
    alerts = await job_alerts_repository.get_by_user(user["id"])
    return {"alerts": alerts, "count": len(alerts)}


@router.post("")
async def create_alert(data: AlertCreate, user: dict = Depends(get_current_user)):
    """Create a new job alert."""
    if not data.keywords:
        raise HTTPException(status_code=400, detail="At least one keyword required")
    
    alert_data = {
        "user_id": user["id"],
        **data.model_dump(),
    }
    alert = await job_alerts_repository.create(alert_data)
    return {"alert": alert, "message": "Alert created"}


@router.get("/{alert_id}")
async def get_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Get a specific alert."""
    alert = await job_alerts_repository.get_by_id(alert_id, user["id"])
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}")
async def update_alert(alert_id: str, data: AlertUpdate, user: dict = Depends(get_current_user)):
    """Update an alert."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    alert = await job_alerts_repository.update(alert_id, user["id"], update_data)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alert": alert, "message": "Alert updated"}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Delete an alert."""
    deleted = await job_alerts_repository.delete(alert_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}
