"""Application routes."""
import logging
from fastapi import APIRouter

from app.core.response_handler import GenericResponse
from app.api.v1.applications.schemas import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
)
from app.api.v1.applications.exceptions import ApplicationNotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("")
async def list_applications():
    """List user's applications."""
    return GenericResponse.success(data=[], message="Applications retrieved")


@router.post("", response_model=ApplicationResponse)
async def create_application(data: ApplicationCreate):
    """Create new application."""
    pass


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(application_id: str, data: ApplicationUpdate):
    """Update application status."""
    raise ApplicationNotFoundError(application_id)


@router.delete("/{application_id}")
async def delete_application(application_id: str):
    """Delete application."""
    return GenericResponse.success(message="Application deleted")
