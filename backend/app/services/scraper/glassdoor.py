"""Glassdoor job scraper."""
import re
import logging
from typing import Optional
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

from app.services.scraper.base import BaseScraper, JobData

logger = logging.getLogger(__name__)


class GlassdoorScraper(BaseScraper):
    """Glassdoor job scraper."""

    SOURCE = "glassdoor"
    BASE_URL = "https://www.glassdoor.com"

    async def search(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        limit: int = 25,
    ) -> list[JobData]:
        """Search Glassdoor jobs."""
        jobs = []
        loc = location or "India"
        url = f"{self.BASE_URL}/Job/jobs.htm?sc.keyword={quote_plus(query)}&locT=N&locId=115"

        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                logger.warning(f"Glassdoor search failed: {response.status_code}")
                return jobs

            soup = BeautifulSoup(response.text, "lxml")
            job_cards = soup.find_all("li", class_="JobsList_jobListItem__wjTHv")[:limit]

            for card in job_cards:
                try:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    logger.debug(f"Failed to parse Glassdoor job card: {e}")
                    continue

        except Exception as e:
            logger.error(f"Glassdoor search error: {e}")

        return jobs

    def _parse_job_card(self, card) -> Optional[JobData]:
        """Parse Glassdoor job card."""
        title_el = card.find("a", {"data-test": "job-title"})
        company_el = card.find("span", class_="EmployerProfile_compactEmployerName__LE242")
        location_el = card.find("div", {"data-test": "emp-location"})

        if not all([title_el, company_el]):
            return None

        href = title_el.get("href", "")
        job_id = self._extract_job_id(href)

        if not job_id:
            return None

        return JobData(
            external_id=job_id,
            source=self.SOURCE,
            company=company_el.get_text(strip=True),
            title=title_el.get_text(strip=True),
            location=location_el.get_text(strip=True) if location_el else None,
            description=None,
            salary_min=None,
            salary_max=None,
            job_type=None,
            experience_level=None,
            remote_type=None,
            apply_url=f"{self.BASE_URL}{href}" if href.startswith("/") else href,
            posted_at=None,
            required_skills=[],
        )

    def _extract_job_id(self, url: str) -> Optional[str]:
        """Extract job ID from Glassdoor URL."""
        match = re.search(r"jobListingId=(\d+)", url)
        return match.group(1) if match else None

    async def get_job_details(self, job_id: str) -> Optional[JobData]:
        """Get Glassdoor job details."""
        # Glassdoor requires more complex handling for job details
        # For now, return None - details fetched during search
        return None


glassdoor_scraper = GlassdoorScraper()
