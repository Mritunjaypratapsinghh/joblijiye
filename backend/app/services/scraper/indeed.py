"""Indeed job scraper."""
import re
import logging
from typing import Optional
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

from app.services.scraper.base import BaseScraper, JobData

logger = logging.getLogger(__name__)


class IndeedScraper(BaseScraper):
    """Indeed job scraper."""

    SOURCE = "indeed"
    BASE_URL = "https://www.indeed.com"

    async def search(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        limit: int = 25,
    ) -> list[JobData]:
        """Search Indeed jobs."""
        jobs = []
        loc = location or "India"
        remoteparam = "&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11" if remote else ""
        url = f"{self.BASE_URL}/jobs?q={quote_plus(query)}&l={quote_plus(loc)}{remoteparam}"

        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                logger.warning(f"Indeed search failed: {response.status_code}")
                return jobs

            soup = BeautifulSoup(response.text, "lxml")
            job_cards = soup.find_all("div", class_="job_seen_beacon")[:limit]

            for card in job_cards:
                try:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    logger.debug(f"Failed to parse Indeed job card: {e}")
                    continue

        except Exception as e:
            logger.error(f"Indeed search error: {e}")

        return jobs

    def _parse_job_card(self, card) -> Optional[JobData]:
        """Parse Indeed job card."""
        title_el = card.find("h2", class_="jobTitle")
        company_el = card.find("span", {"data-testid": "company-name"})
        location_el = card.find("div", {"data-testid": "text-location"})
        link_el = card.find("a", class_="jcs-JobTitle")

        if not all([title_el, company_el, link_el]):
            return None

        job_key = link_el.get("data-jk", "")
        if not job_key:
            href = link_el.get("href", "")
            match = re.search(r"jk=([a-f0-9]+)", href)
            job_key = match.group(1) if match else ""

        if not job_key:
            return None

        return JobData(
            external_id=job_key,
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
            apply_url=f"{self.BASE_URL}/viewjob?jk={job_key}",
            posted_at=None,
            required_skills=[],
        )

    async def get_job_details(self, job_id: str) -> Optional[JobData]:
        """Get Indeed job details."""
        url = f"{self.BASE_URL}/viewjob?jk={job_id}"

        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")
            return self._parse_job_details(soup, job_id)

        except Exception as e:
            logger.error(f"Indeed job details error: {e}")
            return None

    def _parse_job_details(self, soup: BeautifulSoup, job_id: str) -> Optional[JobData]:
        """Parse Indeed job details page."""
        title = soup.find("h1", class_="jobsearch-JobInfoHeader-title")
        company = soup.find("div", {"data-testid": "inlineHeader-companyName"})
        location = soup.find("div", {"data-testid": "inlineHeader-companyLocation"})
        description = soup.find("div", id="jobDescriptionText")

        if not title:
            return None

        desc_text = description.get_text(strip=True) if description else ""

        return JobData(
            external_id=job_id,
            source=self.SOURCE,
            company=company.get_text(strip=True) if company else "Unknown",
            title=title.get_text(strip=True),
            location=location.get_text(strip=True) if location else None,
            description=desc_text[:5000],
            salary_min=None,
            salary_max=None,
            job_type=None,
            experience_level=None,
            remote_type=None,
            apply_url=f"{self.BASE_URL}/viewjob?jk={job_id}",
            posted_at=None,
            required_skills=self._extract_skills(desc_text),
        )

    def _extract_skills(self, text: str) -> list[str]:
        """Extract skills from job description."""
        common_skills = [
            "python", "javascript", "typescript", "java", "go", "rust", "c++",
            "react", "angular", "vue", "node.js", "django", "fastapi", "flask",
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
            "sql", "postgresql", "mongodb", "redis", "elasticsearch",
        ]
        text_lower = text.lower()
        return [s for s in common_skills if s in text_lower]


indeed_scraper = IndeedScraper()
