"""Job match scoring service - calculates profile-to-job relevance."""
import re
from typing import Optional


def calculate_match_score(profile: dict, job: dict) -> dict:
    """
    Calculate match score between user profile and job.
    Returns score (0-100) and breakdown.
    """
    score = 0
    breakdown = {"skills": 0, "experience": 0, "location": 0, "title": 0}
    matched_skills = []
    missing_skills = []
    
    # 1. Skills match (40 points max)
    profile_skills = set(s.lower() for s in (profile.get("skills") or []))
    job_skills = set(s.lower() for s in (job.get("required_skills") or []))
    
    # Also extract skills from job description
    description = (job.get("description") or "").lower()
    common_skills = [
        "python", "javascript", "typescript", "java", "go", "rust", "c++", "c#",
        "react", "angular", "vue", "node", "django", "fastapi", "flask", "spring",
        "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
        "sql", "postgresql", "mysql", "mongodb", "redis",
        "git", "ci/cd", "agile", "scrum", "rest", "graphql", "microservices"
    ]
    for skill in common_skills:
        if skill in description and skill not in job_skills:
            job_skills.add(skill)
    
    if job_skills:
        matched = profile_skills & job_skills
        matched_skills = list(matched)
        missing_skills = list(job_skills - profile_skills)[:10]  # Top 10 missing
        skill_ratio = len(matched) / len(job_skills) if job_skills else 0
        breakdown["skills"] = int(skill_ratio * 40)
        score += breakdown["skills"]
    else:
        breakdown["skills"] = 20  # Neutral if no skills listed
        score += 20
    
    # 2. Experience match (30 points max)
    profile_exp = profile.get("experience") or []
    job_title = (job.get("title") or "").lower()
    job_level = (job.get("experience_level") or "").lower()
    
    # Calculate years of experience
    years_exp = len(profile_exp) * 2  # Rough estimate: 2 years per role
    
    # Match experience level
    level_match = 0
    if job_level:
        if job_level == "entry" and years_exp <= 2:
            level_match = 30
        elif job_level == "mid" and 2 <= years_exp <= 5:
            level_match = 30
        elif job_level == "senior" and years_exp >= 4:
            level_match = 30
        elif job_level == "lead" and years_exp >= 6:
            level_match = 30
        else:
            level_match = 15  # Partial match
    else:
        level_match = 20  # Neutral
    
    # Check if past titles are relevant
    title_keywords = set(re.findall(r'\b\w+\b', job_title))
    for exp in profile_exp:
        exp_title = (exp.get("title") or "").lower()
        if any(kw in exp_title for kw in title_keywords if len(kw) > 3):
            level_match = min(30, level_match + 5)
    
    breakdown["experience"] = level_match
    score += level_match
    
    # 3. Location match (15 points max)
    profile_location = (profile.get("location") or "").lower()
    job_location = (job.get("location") or "").lower()
    remote_type = (job.get("remote_type") or "").lower()
    
    if remote_type == "remote":
        breakdown["location"] = 15  # Remote = always match
    elif profile_location and job_location:
        # Check city/country match
        profile_parts = set(profile_location.replace(",", " ").split())
        job_parts = set(job_location.replace(",", " ").split())
        if profile_parts & job_parts:
            breakdown["location"] = 15
        else:
            breakdown["location"] = 5  # Different location
    else:
        breakdown["location"] = 10  # Unknown
    score += breakdown["location"]
    
    # 4. Title relevance (15 points max)
    profile_titles = []
    for exp in profile_exp:
        profile_titles.append((exp.get("title") or "").lower())
    
    title_score = 0
    job_title_words = set(w for w in job_title.split() if len(w) > 2)
    for pt in profile_titles:
        pt_words = set(w for w in pt.split() if len(w) > 2)
        overlap = len(job_title_words & pt_words)
        if overlap >= 2:
            title_score = 15
            break
        elif overlap == 1:
            title_score = max(title_score, 10)
    
    if not title_score and profile_skills:
        # Fallback: check if job title contains any profile skills
        if any(skill in job_title for skill in profile_skills):
            title_score = 8
    
    breakdown["title"] = title_score
    score += title_score
    
    return {
        "score": min(100, score),
        "breakdown": breakdown,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }


def get_match_label(score: int) -> str:
    """Get human-readable match label."""
    if score >= 80:
        return "Excellent Match"
    elif score >= 60:
        return "Good Match"
    elif score >= 40:
        return "Fair Match"
    else:
        return "Low Match"
