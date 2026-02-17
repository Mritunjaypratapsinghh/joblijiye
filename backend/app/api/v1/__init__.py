"""API v1 router aggregation."""
from fastapi import APIRouter

from .jobs import router as jobs_router
from .applications import router as applications_router
from .resumes import router as resumes_router
from .auth import router as auth_router
from .notifications import router as notifications_router
from .dashboard import router as dashboard_router
from .saved_jobs import router as saved_jobs_router
from .alerts import router as alerts_router
from .analytics import router as analytics_router

router = APIRouter(prefix="/api/v1")
router.include_router(jobs_router)
router.include_router(applications_router)
router.include_router(resumes_router)
router.include_router(auth_router)
router.include_router(notifications_router)
router.include_router(dashboard_router)
router.include_router(saved_jobs_router)
router.include_router(alerts_router)
router.include_router(analytics_router)
