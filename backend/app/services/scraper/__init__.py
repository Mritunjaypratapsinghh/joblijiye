"""Scraper module exports."""
from app.services.scraper.base import BaseScraper, JobData
from app.services.scraper.service import job_scraper_service
from app.services.scraper.linkedin import linkedin_scraper
from app.services.scraper.indeed import indeed_scraper
from app.services.scraper.glassdoor import glassdoor_scraper

__all__ = [
    "BaseScraper",
    "JobData",
    "job_scraper_service",
    "linkedin_scraper",
    "indeed_scraper",
    "glassdoor_scraper",
]
