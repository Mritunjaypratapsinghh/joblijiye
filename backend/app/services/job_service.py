"""Job service."""
import logging
from typing import Optional

from app.repositories.job_repository import job_repository

logger = logging.getLogger(__name__)


class JobService:
    """Job business logic."""

    def __init__(self):
        self.repository = job_repository

    async def get_jobs(self, limit: int = 100, offset: int = 0) -> dict:
        jobs = await self.repository.get_all(limit, offset)
        total = await self.repository.count()
        return {"jobs": jobs, "total": total}

    async def get_job(self, job_id: str) -> Optional[dict]:
        return await self.repository.get_by_id(job_id)

    async def create_job(self, data: dict) -> dict:
        return await self.repository.create(data)

    async def delete_job(self, job_id: str) -> bool:
        return await self.repository.delete(job_id)


job_service = JobService()
