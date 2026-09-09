"""Job routes."""
import logging
import os
from fastapi import APIRouter, HTTPException, Query, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from httpx import ConnectError, HTTPStatusError
from postgrest.exceptions import APIError

from app.repositories import job_repository
from app.services.scraper import job_scraper_service
from app.services.match_scoring import calculate_match_score, get_match_label
from app.core.rate_limit import limiter
from app.core.security import decode_token
from app.database import get_supabase_admin
from app.api.v1.jobs.schemas import (
    JobResponse,
    JobListResponse,
    ScrapeRequest,
    ScrapeResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])
security = HTTPBearer(auto_error=False)

# Check if Redis/Celery is available
CELERY_ENABLED = bool(os.getenv("REDIS_URL"))


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user if authenticated, else None."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    db = get_supabase_admin()
    result = db.table("profiles").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])

# Check if Redis/Celery is available
CELERY_ENABLED = bool(os.getenv("REDIS_URL"))


@router.get("/sources/list")
async def list_sources():
    """List available job sources."""
    return {"sources": ["linkedin", "indeed", "glassdoor"]}


@router.post("/scrape", response_model=ScrapeResponse)
@limiter.limit("5/minute")
async def scrape_jobs(request: Request, data: ScrapeRequest):
    """Scrape jobs from external sources and save to database."""
    if CELERY_ENABLED:
        # Use background task
        from app.tasks import scrape_jobs_task
        task = scrape_jobs_task.delay(
            query=data.query,
            location=data.location,
            sources=data.sources,
        )
        return ScrapeResponse(scraped=0, saved=0, task_id=task.id, status="queued")
    
    # Fallback to sync scraping
    result = await job_scraper_service.search_and_save(
        query=data.query,
        location=data.location,
        remote=data.remote,
        sources=data.sources,
        limit_per_source=data.limit_per_source,
    )
    return ScrapeResponse(**result)


@router.get("/scrape/status/{task_id}")
async def get_scrape_status(task_id: str):
    """Get status of a background scrape task."""
    if not CELERY_ENABLED:
        raise HTTPException(status_code=400, detail="Background tasks not enabled")
    
    from app.celery_app import celery_app
    task = celery_app.AsyncResult(task_id)
    
    response = {"task_id": task_id, "status": task.status}
    if task.ready():
        response["result"] = task.result
    return response


@router.get("", response_model=JobListResponse)
async def list_jobs(
    query: Optional[str] = Query(None, description="Search query"),
    source: Optional[str] = Query(None, description="Filter by source"),
    location: Optional[str] = Query(None, description="Filter by location"),
    remote_type: Optional[str] = Query(None, description="Filter by remote type"),
    experience_level: Optional[str] = Query(None, description="Filter by experience level"),
    sort_by: Optional[str] = Query("recent", description="Sort by: recent, salary_desc, salary_asc, match"),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    profile: Optional[dict] = Depends(get_optional_user),
):
    """List/search jobs from database with pagination and optional match scoring."""
    try:
        offset = (page - 1) * limit
        jobs = await job_repository.search(
            query=query,
            source=source,
            location=location,
            remote_type=remote_type,
            experience_level=experience_level,
            sort_by=sort_by if sort_by != "match" else "recent",
            limit=limit,
            offset=offset,
        )
        total = await job_repository.count_filtered(
            query=query,
            source=source,
            location=location,
            remote_type=remote_type,
            experience_level=experience_level,
        )
    except ConnectError as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database temporarily unavailable. Please try again in a moment."
        )
    except APIError as e:
        logger.error(f"Supabase API error: {e}")
        # 502 usually means Supabase project is paused
        if "502" in str(e) or "Bad Gateway" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Database is waking up. Please try again in 30 seconds."
            )
        raise HTTPException(
            status_code=500,
            detail="Database error occurred."
        )
    except Exception as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching jobs."
        )
    
    # Add match scores if user is authenticated
    job_responses = []
    for j in jobs:
        resp = JobResponse(**j)
        if profile:
            match = calculate_match_score(profile, j)
            resp.match_score = match["score"]
            resp.match_label = get_match_label(match["score"])
        job_responses.append(resp)
    
    # Sort by match score if requested
    if sort_by == "match" and profile:
        job_responses.sort(key=lambda x: x.match_score or 0, reverse=True)
    
    return JobListResponse(
        jobs=job_responses,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/matched")
async def get_matched_jobs(
    limit: int = Query(10, ge=1, le=50),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get top matched jobs for authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    profile = await get_optional_user(credentials)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get recent jobs
    jobs = await job_repository.search(limit=100)
    
    # Score and sort
    scored = []
    for job in jobs:
        match = calculate_match_score(profile, job)
        scored.append({
            **job,
            "match_score": match["score"],
            "match_label": get_match_label(match["score"]),
            "matched_skills": match["matched_skills"],
            "missing_skills": match["missing_skills"],
        })
    
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return {"jobs": scored[:limit]}


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get job by ID."""
    job = await job_repository.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(**job)


@router.get("/{job_id}/formatted-description")
async def get_formatted_description(job_id: str):
    """Get AI-formatted job description using Groq."""
    import httpx
    
    job = await job_repository.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    description = job.get("description", "")
    if not description:
        return {"formatted": None}
    
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return {"formatted": None, "error": "Groq API key not configured"}
    
    prompt = f"""Parse and format this job description into clean HTML. 
Extract and structure these sections if present: Overview, Responsibilities, Qualifications (Required/Preferred), Benefits.

Rules:
- Use <h3 class="jd-section"> for section headers
- Use <ul class="jd-list"> and <li> for bullet points
- Use <p class="jd-para"> for paragraphs
- Keep content concise, remove redundant text
- Return ONLY the HTML, no markdown or explanation

Job Description:
{description[:4000]}"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 2000,
                }
            )
            data = resp.json()
            formatted = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return {"formatted": formatted}
    except Exception as e:
        logger.error(f"Groq formatting error: {e}")
        return {"formatted": None, "error": str(e)}
