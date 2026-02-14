"""LinkedIn job scraper using public job search."""
import re
import logging
from typing import Optional
from urllib.parse import quote_plus
from bs4 import BeautifulSoup

from app.services.scraper.base import BaseScraper, JobData

logger = logging.getLogger(__name__)


class LinkedInScraper(BaseScraper):
    """LinkedIn public job scraper."""

    SOURCE = "linkedin"
    BASE_URL = "https://www.linkedin.com"

    async def search(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        limit: int = 25,
    ) -> list[JobData]:
        """Search LinkedIn jobs (public API)."""
        jobs = []
        params = {
            "keywords": query,
            "location": location or "India",
            "f_WT": "2" if remote else "",  # Remote filter
            "start": 0,
        }
        url = f"{self.BASE_URL}/jobs-guest/jobs/api/seeMoreJobPostings/search"

        try:
            response = await self.client.get(url, params=params)
            if response.status_code != 200:
                logger.warning(f"LinkedIn search failed: {response.status_code}")
                return jobs

            soup = BeautifulSoup(response.text, "lxml")
            job_cards = soup.find_all("li")[:limit]

            for card in job_cards:
                try:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    logger.debug(f"Failed to parse job card: {e}")
                    continue

        except Exception as e:
            logger.error(f"LinkedIn search error: {e}")

        return jobs

    def _parse_job_card(self, card) -> Optional[JobData]:
        """Parse a job card from search results."""
        title_el = card.find("h3", class_="base-search-card__title")
        company_el = card.find("h4", class_="base-search-card__subtitle")
        location_el = card.find("span", class_="job-search-card__location")
        link_el = card.find("a", class_="base-card__full-link")

        if not all([title_el, company_el, link_el]):
            return None

        job_url = link_el.get("href", "").split("?")[0]
        job_id = self._extract_job_id(job_url)

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
            remote_type="remote" if "remote" in (location_el.get_text(strip=True).lower() if location_el else "") else None,
            apply_url=job_url,
            posted_at=None,
            required_skills=[],
        )

    def _extract_job_id(self, url: str) -> Optional[str]:
        """Extract job ID from LinkedIn URL."""
        match = re.search(r"/view/([^/?]+)", url)
        return match.group(1) if match else None

    async def get_job_details(self, job_id: str) -> Optional[JobData]:
        """Get detailed job info from LinkedIn."""
        url = f"{self.BASE_URL}/jobs-guest/jobs/api/jobPosting/{job_id}"

        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.text, "lxml")
            return self._parse_job_details(soup, job_id)

        except Exception as e:
            logger.error(f"LinkedIn job details error: {e}")
            return None

    def _parse_job_details(self, soup: BeautifulSoup, job_id: str) -> Optional[JobData]:
        """Parse job details page."""
        title = soup.find("h2", class_="top-card-layout__title")
        company = soup.find("a", class_="topcard__org-name-link")
        location = soup.find("span", class_="topcard__flavor--bullet")
        description = soup.find("div", class_="description__text")

        if not all([title, company]):
            return None

        desc_text = description.get_text(strip=True) if description else ""
        skills = self._extract_skills(desc_text)

        return JobData(
            external_id=job_id,
            source=self.SOURCE,
            company=company.get_text(strip=True),
            title=title.get_text(strip=True),
            location=location.get_text(strip=True) if location else None,
            description=desc_text[:5000],
            salary_min=None,
            salary_max=None,
            job_type=None,
            experience_level=self._detect_experience_level(desc_text),
            remote_type=self._detect_remote_type(desc_text),
            apply_url=f"{self.BASE_URL}/jobs/view/{job_id}",
            posted_at=None,
            required_skills=skills,
        )

    def _extract_skills(self, text: str) -> list[str]:
        """Extract skills from job description."""
        common_skills = [
            "python", "javascript", "typescript", "java", "go", "rust", "c++",
            "react", "angular", "vue", "node.js", "django", "fastapi", "flask",
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
            "sql", "postgresql", "mongodb", "redis", "elasticsearch",
            "git", "ci/cd", "agile", "scrum", "rest", "graphql",
        ]
        text_lower = text.lower()
        return [s for s in common_skills if s in text_lower]

    def _detect_experience_level(self, text: str) -> Optional[str]:
        """Detect experience level from description."""
        text_lower = text.lower()
        if any(x in text_lower for x in ["entry level", "fresher", "0-1 year", "graduate"]):
            return "entry"
        if any(x in text_lower for x in ["senior", "lead", "principal", "5+ years", "7+ years"]):
            return "senior"
        if any(x in text_lower for x in ["mid", "2-4 years", "3-5 years"]):
            return "mid"
        return None

    def _detect_remote_type(self, text: str) -> Optional[str]:
        """Detect remote type from description."""
        text_lower = text.lower()
        if "fully remote" in text_lower or "100% remote" in text_lower:
            return "remote"
        if "hybrid" in text_lower:
            return "hybrid"
        if "on-site" in text_lower or "onsite" in text_lower:
            return "onsite"
        return None


linkedin_scraper = LinkedInScraper()
