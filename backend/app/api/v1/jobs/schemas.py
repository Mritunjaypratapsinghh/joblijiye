"""Job schemas."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobResponse(BaseModel):
    id: str
    external_id: Optional[str] = None
    source: str
    company: str
    title: str
    location: Optional[str] = None
    description: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    remote_type: Optional[str] = None
    apply_url: str
    posted_at: Optional[datetime] = None
    scraped_at: Optional[datetime] = None
    required_skills: list[str] = []
    match_score: Optional[int] = None
    match_label: Optional[str] = None

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
    page: int = 1
    limit: int = 20
    total_pages: int = 1


class JobSearchParams(BaseModel):
    query: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    limit: int = 50
    offset: int = 0


class ScrapeRequest(BaseModel):
    query: str
    location: Optional[str] = None
    remote: bool = False
    sources: Optional[list[str]] = None  # linkedin, indeed, glassdoor
    limit_per_source: int = 15


class ScrapeResponse(BaseModel):
    scraped: int
    saved: int
    task_id: Optional[str] = None
    status: Optional[str] = None
