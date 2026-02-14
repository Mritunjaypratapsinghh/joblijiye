"""Job routes."""
import logging
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional

from app.repositories import job_repository
from app.services.scraper import job_scraper_service
from app.core.rate_limit import limiter
from app.api.v1.jobs.schemas import (
    JobResponse,
    JobListResponse,
    ScrapeRequest,
    ScrapeResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/sources/list")
async def list_sources():
    """List available job sources."""
    return {"sources": ["linkedin", "indeed", "glassdoor"]}


@router.post("/scrape", response_model=ScrapeResponse)
@limiter.limit("5/minute")
async def scrape_jobs(request: Request, data: ScrapeRequest):
    """Scrape jobs from external sources and save to database."""
    result = await job_scraper_service.search_and_save(
        query=data.query,
        location=data.location,
        remote=data.remote,
        sources=data.sources,
        limit_per_source=data.limit_per_source,
    )
    return ScrapeResponse(**result)


@router.get("", response_model=JobListResponse)
async def list_jobs(
    query: Optional[str] = Query(None, description="Search query"),
    source: Optional[str] = Query(None, description="Filter by source"),
    location: Optional[str] = Query(None, description="Filter by location"),
    remote_type: Optional[str] = Query(None, description="Filter by remote type"),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """List/search jobs from database with pagination."""
    offset = (page - 1) * limit
    jobs = await job_repository.search(
        query=query,
        source=source,
        location=location,
        remote_type=remote_type,
        limit=limit,
        offset=offset,
    )
    total = await job_repository.count_filtered(
        query=query,
        source=source,
        location=location,
        remote_type=remote_type,
    )
    return JobListResponse(
        jobs=[JobResponse(**j) for j in jobs],
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get job by ID."""
    job = await job_repository.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(**job)
