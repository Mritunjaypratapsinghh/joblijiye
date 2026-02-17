"""Job alerts repository."""
from typing import Optional
from app.database import get_supabase


class JobAlertsRepository:
    """Job alerts database operations."""

    TABLE = "job_alerts"

    @property
    def db(self):
        return get_supabase()

    async def get_by_user(self, user_id: str) -> list[dict]:
        response = self.db.table(self.TABLE).select("*").eq("user_id", user_id).execute()
        return response.data or []

    async def get_by_id(self, alert_id: str, user_id: str) -> Optional[dict]:
        response = (
            self.db.table(self.TABLE)
            .select("*")
            .eq("id", alert_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return response.data

    async def get_active_alerts(self) -> list[dict]:
        """Get all active alerts for processing."""
        response = (
            self.db.table(self.TABLE)
            .select("*, users(email, full_name)")
            .eq("is_active", True)
            .execute()
        )
        return response.data or []

    async def create(self, data: dict) -> dict:
        response = self.db.table(self.TABLE).insert(data).execute()
        return response.data[0]

    async def update(self, alert_id: str, user_id: str, data: dict) -> Optional[dict]:
        response = (
            self.db.table(self.TABLE)
            .update(data)
            .eq("id", alert_id)
            .eq("user_id", user_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def delete(self, alert_id: str, user_id: str) -> bool:
        response = (
            self.db.table(self.TABLE)
            .delete()
            .eq("id", alert_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(response.data)

    async def update_last_sent(self, alert_id: str) -> None:
        self.db.table(self.TABLE).update({"last_sent_at": "now()"}).eq("id", alert_id).execute()


job_alerts_repository = JobAlertsRepository()
