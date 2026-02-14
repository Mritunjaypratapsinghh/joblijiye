"""API module."""
from fastapi import APIRouter

from .health.routes import router as health_router
from .v1 import router as v1_router

router = APIRouter()
router.include_router(health_router)
router.include_router(v1_router)
