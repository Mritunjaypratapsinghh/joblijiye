"""Application service."""
import logging
from typing import Optional

from app.repositories.application_repository import application_repository
from app.api.v1.applications.schemas import ApplicationCreate, ApplicationUpdate
from app.api.v1.applications.exceptions import ApplicationNotFoundError

logger = logging.getLogger(__name__)


class ApplicationService:
    """Application business logic."""

    def __init__(self):
        self.repository = application_repository

    async def get_user_applications(self, user_id: str) -> list[dict]:
        return await self.repository.get_by_user(user_id)

    async def get_application(self, application_id: str) -> dict:
        app = await self.repository.get_by_id(application_id)
        if not app:
            raise ApplicationNotFoundError(application_id)
        return app

    async def create_application(self, user_id: str, data: ApplicationCreate) -> dict:
        payload = data.model_dump()
        payload["user_id"] = user_id
        return await self.repository.create(payload)

    async def update_application(self, application_id: str, data: ApplicationUpdate) -> dict:
        app = await self.repository.get_by_id(application_id)
        if not app:
            raise ApplicationNotFoundError(application_id)
        return await self.repository.update(application_id, data.model_dump(exclude_unset=True))

    async def delete_application(self, application_id: str) -> bool:
        app = await self.repository.get_by_id(application_id)
        if not app:
            raise ApplicationNotFoundError(application_id)
        return await self.repository.delete(application_id)


application_service = ApplicationService()
