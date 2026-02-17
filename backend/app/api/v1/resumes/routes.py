"""Resume routes."""
import logging
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

from app.repositories import resume_repository, job_repository, profile_repository
from app.services.ai import groq_service
from app.services.linkedin_parser import linkedin_parser
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


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload and parse a resume PDF to create a base resume."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        content = await file.read()
        parsed = linkedin_parser.parse(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")
    
    # Build resume JSON from parsed data
    resume_json = {
        "name": parsed.get("full_name", ""),
        "contact": {
            "phone": parsed.get("phone", ""),
            "location": parsed.get("location", ""),
            "linkedin": parsed.get("linkedin_url", ""),
            "github": parsed.get("github_url", ""),
        },
        "summary": "",
        "experience": parsed.get("experience", []),
        "education": parsed.get("education", []),
        "skills": parsed.get("skills", []),
    }
    
    # Save to database
    saved = await resume_repository.create({
        "user_id": user["id"],
        "job_id": None,
        "resume_json": resume_json,
        "ats_score": None,
        "keywords_matched": [],
        "keywords_missing": [],
    })
    
    return {
        "id": saved["id"],
        "resume_json": resume_json,
        "message": "Resume uploaded and parsed successfully",
    }


@router.post("/from-profile")
async def create_from_profile(user: dict = Depends(get_current_user)):
    """Create an AI-enhanced resume from user's profile data."""
    profile = await profile_repository.get_by_user(user["id"])
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found. Please complete your profile first.")
    
    # Use AI to enhance the resume
    try:
        resume_json = await groq_service.generate_resume(
            profile=profile,
            job_description="General software engineering role requiring strong technical skills",
            job_title="Software Engineer",
            company="Tech Company"
        )
        # Add contact info
        resume_json["name"] = profile.get("full_name", "")
        resume_json["contact"] = {
            "phone": profile.get("phone", ""),
            "location": profile.get("location", ""),
            "linkedin": profile.get("linkedin_url", ""),
            "github": profile.get("github_url", ""),
        }
        resume_json["education"] = profile.get("education", [])
    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        # Fallback to basic profile data
        resume_json = {
            "name": profile.get("full_name", ""),
            "contact": {
                "phone": profile.get("phone", ""),
                "location": profile.get("location", ""),
                "linkedin": profile.get("linkedin_url", ""),
                "github": profile.get("github_url", ""),
            },
            "summary": "",
            "experience": profile.get("experience", []),
            "education": profile.get("education", []),
            "skills": profile.get("skills", []),
        }
    
    # Save to database
    saved = await resume_repository.create({
        "user_id": user["id"],
        "job_id": None,
        "resume_json": resume_json,
        "ats_score": None,
        "keywords_matched": [],
        "keywords_missing": [],
    })
    
    return {
        "id": saved["id"],
        "resume_json": resume_json,
        "message": "Resume created with AI enhancement",
    }


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
