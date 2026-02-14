"""Resume routes."""
import logging
from fastapi import APIRouter, HTTPException, Depends

from app.repositories import resume_repository, job_repository, profile_repository
from app.services.ai import groq_service
from app.api.v1.auth.dependencies import get_current_user
from app.api.v1.resumes.schemas import (
    ResumeResponse,
    GenerateResumeRequest,
    GenerateResumeResponse,
    ATSScoreRequest,
    ATSScoreResponse,
    CoverLetterRequest,
    CoverLetterResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(user: dict = Depends(get_current_user)):
    """List user's generated resumes."""
    resumes = await resume_repository.get_by_user(user["id"])
    return [ResumeResponse(**r) for r in resumes]


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: str, user: dict = Depends(get_current_user)):
    """Get specific resume."""
    resume = await resume_repository.get_by_id(resume_id, user["id"])
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ResumeResponse(**resume)


@router.post("/generate", response_model=GenerateResumeResponse)
async def generate_resume(
    request: GenerateResumeRequest, user: dict = Depends(get_current_user)
):
    """Generate AI-tailored resume for a job."""
    # Get job details
    job = await job_repository.get_by_id(request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get user profile
    profile = await profile_repository.get_by_user(user["id"])
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found. Please complete your profile first.")

    # Generate resume
    resume_json = await groq_service.generate_resume(
        profile=profile,
        job_description=job.get("description", ""),
        job_title=job["title"],
        company=job["company"],
    )

    # Calculate ATS score
    ats_result = await groq_service.calculate_ats_score(
        resume_json=resume_json,
        job_description=job.get("description", ""),
    )

    # Save to database
    saved = await resume_repository.create({
        "user_id": user["id"],
        "job_id": request.job_id,
        "resume_json": resume_json,
        "ats_score": ats_result.get("score", 0),
        "keywords_matched": ats_result.get("matched_keywords", []),
        "keywords_missing": ats_result.get("missing_keywords", []),
    })

    return GenerateResumeResponse(
        id=saved["id"],
        resume_json=resume_json,
        ats_score=ats_result.get("score", 0),
        keywords_matched=ats_result.get("matched_keywords", []),
        keywords_missing=ats_result.get("missing_keywords", []),
        suggestions=ats_result.get("suggestions", []),
    )


@router.post("/ats-score", response_model=ATSScoreResponse)
async def calculate_ats_score(
    request: ATSScoreRequest, user: dict = Depends(get_current_user)
):
    """Calculate ATS score for any resume against a job description."""
    result = await groq_service.calculate_ats_score(
        resume_json=request.resume_json,
        job_description=request.job_description,
    )
    return ATSScoreResponse(**result)


@router.post("/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter(
    request: CoverLetterRequest, user: dict = Depends(get_current_user)
):
    """Generate cover letter for a job."""
    job = await job_repository.get_by_id(request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    profile = await profile_repository.get_by_user(user["id"])
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found")

    cover_letter = await groq_service.generate_cover_letter(
        profile=profile,
        job_description=job.get("description", ""),
        job_title=job["title"],
        company=job["company"],
    )
    return CoverLetterResponse(cover_letter=cover_letter)


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user: dict = Depends(get_current_user)):
    """Delete a resume."""
    deleted = await resume_repository.delete(resume_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"message": "Resume deleted"}
