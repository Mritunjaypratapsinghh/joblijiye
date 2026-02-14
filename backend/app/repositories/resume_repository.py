"""Resume repository."""
from typing import Optional
from app.repositories.base import BaseRepository
from app.database import get_supabase


class ResumeRepository(BaseRepository):
    """Resume database operations."""

    TABLE = "resumes"

    @property
    def db(self):
        return get_supabase()

    async def get_by_id(self, id: str, user_id: str | None = None) -> Optional[dict]:
        query = self.db.table(self.TABLE).select("*, jobs(title, company)").eq("id", id)
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.single().execute()
        return response.data

    async def get_all(self, limit: int = 100, offset: int = 0) -> list[dict]:
        response = (
            self.db.table(self.TABLE)
            .select("*, jobs(title, company)")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return response.data or []

    async def get_by_user(self, user_id: str, limit: int = 50) -> list[dict]:
        response = (
            self.db.table(self.TABLE)
            .select("*, jobs(title, company)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    async def get_by_job(self, user_id: str, job_id: str) -> Optional[dict]:
        """Get resume for specific job."""
        response = (
            self.db.table(self.TABLE)
            .select("*")
            .eq("user_id", user_id)
            .eq("job_id", job_id)
            .single()
            .execute()
        )
        return response.data

    async def create(self, data: dict) -> dict:
        response = self.db.table(self.TABLE).insert(data).execute()
        return response.data[0]

    async def update(self, id: str, data: dict, user_id: str | None = None) -> Optional[dict]:
        query = self.db.table(self.TABLE).update(data).eq("id", id)
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.execute()
        return response.data[0] if response.data else None

    async def delete(self, id: str, user_id: str | None = None) -> bool:
        query = self.db.table(self.TABLE).delete().eq("id", id)
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.execute()
        return bool(response.data)


resume_repository = ResumeRepository()
