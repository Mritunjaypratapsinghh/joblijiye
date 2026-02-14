"""Job scraper aggregator service."""
import asyncio
import logging
from typing import Optional

from app.services.scraper.base import JobData
from app.services.scraper.linkedin import linkedin_scraper
from app.services.scraper.indeed import indeed_scraper
from app.services.scraper.glassdoor import glassdoor_scraper
from app.repositories import job_repository

logger = logging.getLogger(__name__)


class JobScraperService:
    """Aggregates jobs from multiple sources."""

    SCRAPERS = {
        "linkedin": linkedin_scraper,
        "indeed": indeed_scraper,
        "glassdoor": glassdoor_scraper,
    }

    async def search_all(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        sources: list[str] | None = None,
        limit_per_source: int = 15,
    ) -> list[JobData]:
        """Search all sources concurrently."""
        active_sources = sources or list(self.SCRAPERS.keys())
        tasks = []

        for source in active_sources:
            if source in self.SCRAPERS:
                scraper = self.SCRAPERS[source]
                tasks.append(scraper.search(query, location, remote, limit_per_source))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        jobs = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Scraper error for {active_sources[i]}: {result}")
                continue
            jobs.extend(result)

        return jobs

    async def search_and_save(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        sources: list[str] | None = None,
        limit_per_source: int = 15,
    ) -> dict:
        """Search all sources and save to database."""
        jobs = await self.search_all(query, location, remote, sources, limit_per_source)

        if not jobs:
            return {"scraped": 0, "saved": 0}

        # Convert to dicts and bulk upsert
        job_dicts = [job.to_dict() for job in jobs]
        saved = await job_repository.bulk_upsert(job_dicts)

        return {"scraped": len(jobs), "saved": len(saved)}

    async def get_job_details(self, source: str, job_id: str) -> Optional[JobData]:
        """Get job details from specific source."""
        if source not in self.SCRAPERS:
            return None
        return await self.SCRAPERS[source].get_job_details(job_id)

    async def close_all(self):
        """Close all scraper clients."""
        for scraper in self.SCRAPERS.values():
            await scraper.close()


job_scraper_service = JobScraperService()
