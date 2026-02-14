"""Base scraper interface."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
import httpx


@dataclass
class JobData:
    """Scraped job data."""
    external_id: str
    source: str
    company: str
    title: str
    location: Optional[str]
    description: Optional[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    job_type: Optional[str]
    experience_level: Optional[str]
    remote_type: Optional[str]
    apply_url: str
    posted_at: Optional[str]
    required_skills: list[str]

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


class BaseScraper(ABC):
    """Abstract base scraper."""

    SOURCE: str = ""
    BASE_URL: str = ""
    HEADERS: dict = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    def __init__(self):
        self.client = httpx.AsyncClient(headers=self.HEADERS, timeout=30.0, follow_redirects=True)

    async def close(self):
        await self.client.aclose()

    @abstractmethod
    async def search(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        limit: int = 25,
    ) -> list[JobData]:
        """Search for jobs."""
        pass

    @abstractmethod
    async def get_job_details(self, job_id: str) -> JobData | None:
        """Get detailed job info."""
        pass
