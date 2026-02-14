"""Dashboard routes - real stats from database."""
from fastapi import APIRouter, Depends
from app.api.v1.auth.dependencies import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    """Get real dashboard statistics for current user."""
    db = get_supabase()
    user_id = user["id"]

    # Get application counts by status
    apps = db.table("applications").select("status, applied_at").eq("user_id", user_id).execute()
    app_list = apps.data or []

    status_counts = {}
    for app in app_list:
        status = app["status"].lower()
        status_counts[status] = status_counts.get(status, 0) + 1

    # Get recent applications (last 7 days)
    from datetime import datetime, timedelta
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    recent_apps = db.table("applications").select("*, jobs(title, company)").eq("user_id", user_id).gte("applied_at", week_ago).order("applied_at", desc=True).limit(5).execute()

    # Get resume count
    resumes = db.table("resumes").select("id", count="exact").eq("user_id", user_id).execute()

    total = len(app_list)
    return {
        "total_applications": total,
        "in_progress": status_counts.get("screening", 0) + status_counts.get("interview", 0),
        "interviews": status_counts.get("interview", 0),
        "offers": status_counts.get("offer", 0),
        "rejected": status_counts.get("rejected", 0),
        "applied": status_counts.get("applied", 0),
        "resumes_count": resumes.count or 0,
        "recent_applications": [
            {
                "id": app["id"],
                "company": app["jobs"]["company"] if app.get("jobs") else "Unknown",
                "role": app["jobs"]["title"] if app.get("jobs") else "Unknown",
                "status": app["status"],
                "date": app["applied_at"],
            }
            for app in (recent_apps.data or [])
        ],
    }
