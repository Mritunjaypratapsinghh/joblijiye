"""Resume service."""
import logging
from typing import Optional

from app.repositories.resume_repository import resume_repository

logger = logging.getLogger(__name__)


class ResumeService:
    """Resume business logic."""

    def __init__(self):
        self.repository = resume_repository

    async def get_user_resumes(self, user_id: str) -> list[dict]:
        return await self.repository.get_by_user(user_id)

    async def get_resume(self, resume_id: str, user_id: str | None = None) -> Optional[dict]:
        return await self.repository.get_by_id(resume_id, user_id)

    async def create_resume(self, user_id: str, data: dict) -> dict:
        data["user_id"] = user_id
        return await self.repository.create(data)

    async def delete_resume(self, resume_id: str, user_id: str | None = None) -> bool:
        return await self.repository.delete(resume_id, user_id)


resume_service = ResumeService()
