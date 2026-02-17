"""Saved jobs repository."""
from app.database import get_supabase


class SavedJobsRepository:
    """Saved jobs database operations."""

    TABLE = "saved_jobs"

    @property
    def db(self):
        return get_supabase()

    async def get_by_user(self, user_id: str) -> list[dict]:
        """Get all saved jobs for a user with job details."""
        response = (
            self.db.table(self.TABLE)
            .select("*, jobs(*)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    async def get_job_ids(self, user_id: str) -> list[str]:
        """Get just the job IDs for a user."""
        response = (
            self.db.table(self.TABLE)
            .select("job_id")
            .eq("user_id", user_id)
            .execute()
        )
        return [r["job_id"] for r in (response.data or [])]

    async def save(self, user_id: str, job_id: str) -> dict | None:
        """Save a job for a user."""
        response = (
            self.db.table(self.TABLE)
            .upsert({"user_id": user_id, "job_id": job_id}, on_conflict="user_id,job_id")
            .execute()
        )
        return response.data[0] if response.data else None

    async def unsave(self, user_id: str, job_id: str) -> bool:
        """Remove a saved job."""
        response = (
            self.db.table(self.TABLE)
            .delete()
            .eq("user_id", user_id)
            .eq("job_id", job_id)
            .execute()
        )
        return bool(response.data)

    async def bulk_save(self, user_id: str, job_ids: list[str]) -> int:
        """Save multiple jobs at once."""
        if not job_ids:
            return 0
        data = [{"user_id": user_id, "job_id": jid} for jid in job_ids]
        response = (
            self.db.table(self.TABLE)
            .upsert(data, on_conflict="user_id,job_id")
            .execute()
        )
        return len(response.data) if response.data else 0

    async def is_saved(self, user_id: str, job_id: str) -> bool:
        """Check if a job is saved."""
        response = (
            self.db.table(self.TABLE)
            .select("id")
            .eq("user_id", user_id)
            .eq("job_id", job_id)
            .execute()
        )
        return bool(response.data)


saved_jobs_repository = SavedJobsRepository()
