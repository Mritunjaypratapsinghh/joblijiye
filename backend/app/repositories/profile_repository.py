"""Profile repository."""
from typing import Optional
from app.repositories.base import BaseRepository
from app.database import get_supabase


class ProfileRepository(BaseRepository):
    """Profile database operations."""

    TABLE = "profiles"

    @property
    def db(self):
        return get_supabase()

    async def get_by_id(self, id: str) -> Optional[dict]:
        response = self.db.table(self.TABLE).select("*").eq("id", id).single().execute()
        return response.data

    async def get_by_user(self, user_id: str) -> Optional[dict]:
        response = self.db.table(self.TABLE).select("*").eq("user_id", user_id).single().execute()
        return response.data

    async def get_all(self, limit: int = 100, offset: int = 0) -> list[dict]:
        response = (
            self.db.table(self.TABLE)
            .select("*")
            .range(offset, offset + limit - 1)
            .execute()
        )
        return response.data or []

    async def create(self, data: dict) -> dict:
        response = self.db.table(self.TABLE).insert(data).execute()
        return response.data[0]

    async def update(self, id: str, data: dict) -> Optional[dict]:
        response = self.db.table(self.TABLE).update(data).eq("id", id).execute()
        return response.data[0] if response.data else None

    async def update_by_user(self, user_id: str, data: dict) -> Optional[dict]:
        response = self.db.table(self.TABLE).update(data).eq("user_id", user_id).execute()
        return response.data[0] if response.data else None

    async def delete(self, id: str) -> bool:
        response = self.db.table(self.TABLE).delete().eq("id", id).execute()
        return bool(response.data)


profile_repository = ProfileRepository()
