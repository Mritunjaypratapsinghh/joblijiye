"""Groq AI service for resume generation and ATS scoring."""
import json
import logging
from typing import Optional
from groq import Groq

from app.config import get_settings

logger = logging.getLogger(__name__)

RESUME_SYSTEM_PROMPT = """You are an expert resume writer and ATS optimization specialist.
Given a user's profile and a job description, generate a tailored resume that:
1. Highlights relevant experience and skills matching the job requirements
2. Uses keywords from the job description naturally
3. Quantifies achievements where possible
4. Is ATS-friendly with clean formatting

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Professional summary tailored to the role",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "dates": "Start - End",
      "bullets": ["Achievement 1 with metrics", "Achievement 2"]
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"]
  },
  "education": [
    {"institution": "Name", "degree": "Degree", "year": "Year"}
  ]
}"""

ATS_SYSTEM_PROMPT = """You are an ATS (Applicant Tracking System) expert.
Analyze the resume against the job description and provide:
1. ATS compatibility score (0-100)
2. Matched keywords found in resume
3. Missing keywords that should be added
4. Specific suggestions for improvement

Respond ONLY with valid JSON:
{
  "score": 85,
  "matched_keywords": ["python", "aws", "docker"],
  "missing_keywords": ["kubernetes", "terraform"],
  "suggestions": ["Add more quantified achievements", "Include relevant certifications"]
}"""


class GroqAIService:
    """Groq AI service for resume operations."""

    def __init__(self):
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            settings = get_settings()
            if not settings.groq_api_key:
                raise ValueError("GROQ_API_KEY not set")
            self._client = Groq(api_key=settings.groq_api_key)
        return self._client

    async def generate_resume(
        self, profile: dict, job_description: str, job_title: str, company: str
    ) -> dict:
        """Generate tailored resume for a job."""
        user_prompt = f"""
Profile:
- Name: {profile.get('full_name', 'N/A')}
- Skills: {', '.join(profile.get('skills', []))}
- Experience: {json.dumps(profile.get('experience', []))}
- Education: {json.dumps(profile.get('education', []))}

Target Job:
- Title: {job_title}
- Company: {company}
- Description: {job_description[:3000]}

Generate a tailored resume JSON optimized for this specific role."""

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": RESUME_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Resume generation error: {e}")
            raise

    async def calculate_ats_score(self, resume_json: dict, job_description: str) -> dict:
        """Calculate ATS score for resume against job description."""
        user_prompt = f"""
Resume:
{json.dumps(resume_json, indent=2)}

Job Description:
{job_description[:3000]}

Analyze ATS compatibility and provide score with details."""

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": ATS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"ATS scoring error: {e}")
            raise

    async def generate_cover_letter(
        self, profile: dict, job_description: str, job_title: str, company: str
    ) -> str:
        """Generate cover letter for a job."""
        user_prompt = f"""
Write a concise, professional cover letter for:
- Applicant: {profile.get('full_name', 'the applicant')}
- Position: {job_title} at {company}
- Key Skills: {', '.join(profile.get('skills', [])[:10])}
- Job Requirements: {job_description[:1500]}

Keep it under 300 words, professional tone, highlight relevant experience."""

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": user_prompt}],
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Cover letter generation error: {e}")
            raise


groq_service = GroqAIService()
