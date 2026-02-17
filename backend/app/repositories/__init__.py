"""Repositories module."""
from app.repositories.job_repository import job_repository
from app.repositories.application_repository import application_repository
from app.repositories.resume_repository import resume_repository
from app.repositories.profile_repository import profile_repository
from app.repositories.saved_jobs_repository import saved_jobs_repository
from app.repositories.job_alerts_repository import job_alerts_repository

__all__ = [
    "job_repository",
    "application_repository",
    "resume_repository",
    "profile_repository",
    "saved_jobs_repository",
    "job_alerts_repository",
]
