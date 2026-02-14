"""Resume schemas."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ResumeResponse(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    resume_json: dict
    resume_pdf_url: Optional[str] = None
    ats_score: Optional[int] = None
    keywords_matched: list[str] = []
    keywords_missing: list[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateResumeRequest(BaseModel):
    job_id: str


class GenerateResumeResponse(BaseModel):
    id: str
    resume_json: dict
    ats_score: int
    keywords_matched: list[str]
    keywords_missing: list[str]
    suggestions: list[str]


class ATSScoreRequest(BaseModel):
    resume_json: dict
    job_description: str


class ATSScoreResponse(BaseModel):
    score: int
    matched_keywords: list[str]
    missing_keywords: list[str]
    suggestions: list[str]


class CoverLetterRequest(BaseModel):
    job_id: str


class CoverLetterResponse(BaseModel):
    cover_letter: str
