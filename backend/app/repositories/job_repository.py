"""Job repository."""
from typing import Optional
from app.repositories.base import BaseRepository
from app.database import get_supabase


class JobRepository(BaseRepository):
    """Job database operations."""

    TABLE = "jobs"

    @property
    def db(self):
        return get_supabase()

    async def get_by_id(self, id: str) -> Optional[dict]:
        response = self.db.table(self.TABLE).select("*").eq("id", id).single().execute()
        return response.data

    async def get_all(
        self, limit: int = 100, offset: int = 0, is_active: bool = True
    ) -> list[dict]:
        query = self.db.table(self.TABLE).select("*").eq("is_active", is_active)
        response = query.order("scraped_at", desc=True).range(offset, offset + limit - 1).execute()
        return response.data or []

    async def create(self, data: dict) -> dict:
        response = self.db.table(self.TABLE).insert(data).execute()
        return response.data[0]

    async def upsert(self, data: dict) -> dict:
        """Insert or update job by apply_url."""
        response = self.db.table(self.TABLE).upsert(data, on_conflict="apply_url").execute()
        return response.data[0]

    async def bulk_upsert(self, jobs: list[dict]) -> list[dict]:
        """Bulk insert/update jobs."""
        response = self.db.table(self.TABLE).upsert(jobs, on_conflict="apply_url").execute()
        return response.data or []

    async def update(self, id: str, data: dict) -> Optional[dict]:
        response = self.db.table(self.TABLE).update(data).eq("id", id).execute()
        return response.data[0] if response.data else None

    async def delete(self, id: str) -> bool:
        response = self.db.table(self.TABLE).delete().eq("id", id).execute()
        return bool(response.data)

    async def search(
        self,
        query: str | None = None,
        source: str | None = None,
        location: str | None = None,
        remote_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """Search jobs with filters."""
        q = self.db.table(self.TABLE).select("*").eq("is_active", True)
        if query:
            q = q.or_(f"title.ilike.%{query}%,company.ilike.%{query}%")
        if source:
            q = q.eq("source", source)
        if location:
            q = q.ilike("location", f"%{location}%")
        if remote_type:
            q = q.eq("remote_type", remote_type)
        response = q.order("scraped_at", desc=True).range(offset, offset + limit - 1).execute()
        return response.data or []

    async def count(self, is_active: bool = True) -> int:
        response = (
            self.db.table(self.TABLE)
            .select("id", count="exact")
            .eq("is_active", is_active)
            .execute()
        )
        return response.count or 0

    async def count_filtered(
        self,
        query: str | None = None,
        source: str | None = None,
        location: str | None = None,
        remote_type: str | None = None,
    ) -> int:
        """Count jobs with filters."""
        q = self.db.table(self.TABLE).select("id", count="exact").eq("is_active", True)
        if query:
            q = q.or_(f"title.ilike.%{query}%,company.ilike.%{query}%")
        if source:
            q = q.eq("source", source)
        if location:
            q = q.ilike("location", f"%{location}%")
        if remote_type:
            q = q.eq("remote_type", remote_type)
        response = q.execute()
        return response.count or 0


job_repository = JobRepository()
