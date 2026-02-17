"""Analytics repository for tracking and metrics."""
from datetime import datetime, timedelta
from app.database import get_supabase_admin


class AnalyticsRepository:
    """Analytics database operations."""

    @property
    def db(self):
        return get_supabase_admin()

    async def track_job_view(self, user_id: str, job_id: str, source: str = None) -> dict:
        """Track when user views a job."""
        try:
            data = {"user_id": user_id, "job_id": job_id, "source": source}
            response = self.db.table("job_views").insert(data).execute()
            return response.data[0] if response.data else {}
        except Exception:
            return {}

    async def track_apply_click(self, user_id: str, job_id: str, apply_url: str) -> dict:
        """Track when user clicks apply button."""
        try:
            data = {"user_id": user_id, "job_id": job_id, "apply_url": apply_url}
            response = self.db.table("apply_clicks").insert(data).execute()
            return response.data[0] if response.data else {}
        except Exception:
            return {}

    async def confirm_application(self, user_id: str, job_id: str, applied: bool) -> dict:
        """Confirm or dismiss application tracking."""
        try:
            # Mark as confirmed (either applied=true or dismissed=confirmed but not applied)
            response = (
                self.db.table("apply_clicks")
                .update({
                    "confirmed_applied": applied,
                    "confirmed_at": datetime.utcnow().isoformat()
                })
                .eq("user_id", user_id)
                .eq("job_id", job_id)
                .is_("confirmed_at", "null")  # Only update if not already confirmed
                .execute()
            )
            return response.data[0] if response.data else {}
        except Exception:
            return {}

    async def get_pending_confirmations(self, user_id: str) -> list[dict]:
        """Get clicks that haven't been confirmed yet (within last 24h)."""
        try:
            cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            response = (
                self.db.table("apply_clicks")
                .select("*, jobs(title, company)")
                .eq("user_id", user_id)
                .is_("confirmed_at", "null")  # Not yet responded (yes or no)
                .gte("clicked_at", cutoff)
                .order("clicked_at", desc=True)
                .execute()
            )
            return response.data or []
        except Exception:
            return []

    async def get_user_funnel(self, user_id: str) -> dict:
        """Get application funnel metrics for user."""
        try:
            views = self.db.table("job_views").select("job_id", count="exact").eq("user_id", user_id).execute()
            viewed_count = views.count or 0

            clicks = self.db.table("apply_clicks").select("job_id", count="exact").eq("user_id", user_id).execute()
            clicked_count = clicks.count or 0

            applied = (
                self.db.table("apply_clicks")
                .select("job_id", count="exact")
                .eq("user_id", user_id)
                .eq("confirmed_applied", True)
                .execute()
            )
            applied_count = applied.count or 0

            apps = self.db.table("applications").select("status").eq("user_id", user_id).execute()
            statuses = [a["status"] for a in (apps.data or [])]
            
            interview_count = sum(1 for s in statuses if s in ["phone_screen", "technical", "onsite"])
            offer_count = sum(1 for s in statuses if s == "offer")

            return {
                "viewed": viewed_count,
                "clicked": clicked_count,
                "applied": applied_count,
                "interviewing": interview_count,
                "offers": offer_count,
            }
        except Exception:
            return {"viewed": 0, "clicked": 0, "applied": 0, "interviewing": 0, "offers": 0}

    async def get_source_performance(self, user_id: str) -> list[dict]:
        """Get performance metrics by job source."""
        try:
            response = (
                self.db.table("applications")
                .select("status, jobs(source)")
                .eq("user_id", user_id)
                .execute()
            )
            
            source_stats = {}
            for app in response.data or []:
                source = app.get("jobs", {}).get("source", "unknown") if app.get("jobs") else "unknown"
                if source not in source_stats:
                    source_stats[source] = {"applied": 0, "interviews": 0, "offers": 0, "rejected": 0}
                
                source_stats[source]["applied"] += 1
                if app["status"] in ["phone_screen", "technical", "onsite"]:
                    source_stats[source]["interviews"] += 1
                elif app["status"] == "offer":
                    source_stats[source]["offers"] += 1
                elif app["status"] == "rejected":
                    source_stats[source]["rejected"] += 1

            return [{"source": k, **v} for k, v in source_stats.items()]
        except Exception:
            return []

    async def get_activity_timeline(self, user_id: str, days: int = 30) -> list[dict]:
        """Get daily activity for the past N days."""
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            views = (
                self.db.table("job_views")
                .select("viewed_at")
                .eq("user_id", user_id)
                .gte("viewed_at", cutoff)
                .execute()
            )
            
            clicks = (
                self.db.table("apply_clicks")
                .select("clicked_at, confirmed_applied")
                .eq("user_id", user_id)
                .gte("clicked_at", cutoff)
                .execute()
            )
            
            daily = {}
            for v in views.data or []:
                day = v["viewed_at"][:10]
                if day not in daily:
                    daily[day] = {"date": day, "views": 0, "clicks": 0, "applied": 0}
                daily[day]["views"] += 1
            
            for c in clicks.data or []:
                day = c["clicked_at"][:10]
                if day not in daily:
                    daily[day] = {"date": day, "views": 0, "clicks": 0, "applied": 0}
                daily[day]["clicks"] += 1
                if c["confirmed_applied"]:
                    daily[day]["applied"] += 1
            
            return sorted(daily.values(), key=lambda x: x["date"])
        except Exception:
            return []

    async def get_dashboard_stats(self, user_id: str) -> dict:
        """Get comprehensive dashboard statistics."""
        funnel = await self.get_user_funnel(user_id)
        sources = await self.get_source_performance(user_id)
        timeline = await self.get_activity_timeline(user_id, 14)
        pending = await self.get_pending_confirmations(user_id)
        
        return {
            "funnel": funnel,
            "sources": sources,
            "timeline": timeline,
            "pending_confirmations": len(pending),
            "pending_jobs": pending[:5],
        }


analytics_repository = AnalyticsRepository()
