"""Notifications API routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.database import get_supabase
from app.api.v1.auth.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationCreate(BaseModel):
    type: str  # job_match, application_update, interview, status_change
    title: str
    message: str
    link: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    link: Optional[str]
    read: bool
    created_at: datetime


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None


@router.get("")
async def list_notifications(
    limit: int = 20,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get user's notifications."""
    db = get_supabase()
    query = db.table("notifications").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).limit(limit)
    
    if unread_only:
        query = query.eq("read", False)
    
    result = query.execute()
    return {"notifications": result.data, "unread_count": sum(1 for n in result.data if not n.get("read", False))}


@router.post("")
async def create_notification(
    notification: NotificationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a notification (internal use)."""
    db = get_supabase()
    data = {
        "user_id": current_user["id"],
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "link": notification.link,
        "read": False,
    }
    result = db.table("notifications").insert(data).execute()
    return result.data[0] if result.data else None


@router.patch("/{notification_id}")
async def update_notification(
    notification_id: str,
    update: NotificationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read/unread."""
    db = get_supabase()
    data = {}
    if update.read is not None:
        data["read"] = update.read
    
    result = db.table("notifications").update(data).eq("id", notification_id).eq("user_id", current_user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result.data[0]


@router.post("/mark-all-read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read."""
    db = get_supabase()
    db.table("notifications").update({"read": True}).eq("user_id", current_user["id"]).eq("read", False).execute()
    return {"success": True}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification."""
    db = get_supabase()
    result = db.table("notifications").delete().eq("id", notification_id).eq("user_id", current_user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}
