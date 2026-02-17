"""Lever ATS scraper for tech companies."""
import httpx
from app.services.scraper.base import BaseScraper, JobData


# Companies using Lever
LEVER_COMPANIES = {
    "netflix": "netflix",
    "twitch": "twitch", 
    "coinbase": "coinbase",
    "figma": "figma",
    "notion": "notion",
    "stripe": "stripe",
    "databricks": "databricks",
    "cloudflare": "cloudflare",
    "discord": "discord",
    "reddit": "reddit",
    "robinhood": "robinhood",
    "instacart": "instacart",
    "doordash": "doordash",
    "lyft": "lyft",
    "airbnb": "airbnb",
    "dropbox": "dropbox",
    "slack": "slack",
    "atlassian": "atlassian",
    "shopify": "shopify",
    "square": "square",
    "plaid": "plaid",
    "openai": "openai",
    "anthropic": "anthropic",
}


class LeverScraper(BaseScraper):
    """Scraper for Lever ATS job boards."""

    SOURCE = "lever"
    BASE_URL = "https://api.lever.co/v0/postings"

    async def search(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        limit: int = 50,
    ) -> list[JobData]:
        """Search jobs across all Lever companies."""
        all_jobs = []
        query_lower = query.lower()

        for company_name, company_id in LEVER_COMPANIES.items():
            if len(all_jobs) >= limit:
                break
            try:
                jobs = await self._fetch_company_jobs(company_id, company_name)
                # Filter by query
                for job in jobs:
                    if len(all_jobs) >= limit:
                        break
                    title_lower = job.title.lower()
                    desc_lower = (job.description or "").lower()
                    if query_lower in title_lower or query_lower in desc_lower:
                        # Filter by location if specified
                        if location and job.location:
                            if location.lower() not in job.location.lower():
                                continue
                        all_jobs.append(job)
            except Exception:
                continue

        return all_jobs

    async def _fetch_company_jobs(self, company_id: str, company_name: str) -> list[JobData]:
        """Fetch all jobs from a specific company."""
        url = f"{self.BASE_URL}/{company_id}"
        try:
            resp = await self.client.get(url)
            if resp.status_code != 200:
                return []
            data = resp.json()
            return [self._parse_job(job, company_name) for job in data]
        except Exception:
            return []

    def _parse_job(self, data: dict, company_name: str) -> JobData:
        """Parse Lever job posting."""
        # Extract location
        location = data.get("categories", {}).get("location", "")
        
        # Determine remote type
        remote_type = None
        location_lower = location.lower() if location else ""
        if "remote" in location_lower:
            remote_type = "Remote"
        elif "hybrid" in location_lower:
            remote_type = "Hybrid"
        
        # Extract commitment (full-time, part-time, etc)
        commitment = data.get("categories", {}).get("commitment", "")
        
        # Extract team/department
        team = data.get("categories", {}).get("team", "")
        
        # Build description
        desc_parts = []
        if data.get("descriptionPlain"):
            desc_parts.append(data["descriptionPlain"])
        for section in data.get("lists", []):
            if section.get("text"):
                desc_parts.append(f"\n{section['text']}:")
            if section.get("content"):
                desc_parts.append(section["content"])
        description = "\n".join(desc_parts)

        return JobData(
            external_id=data["id"],
            source=self.SOURCE,
            company=company_name.title(),
            title=data.get("text", ""),
            location=location,
            description=description[:5000] if description else None,
            salary_min=None,
            salary_max=None,
            job_type=commitment or "Full-time",
            experience_level=self._extract_level(data.get("text", "")),
            remote_type=remote_type,
            apply_url=data.get("hostedUrl", data.get("applyUrl", "")),
            posted_at=None,
            required_skills=self._extract_skills(description),
        )

    def _extract_level(self, title: str) -> str | None:
        """Extract experience level from title."""
        title_lower = title.lower()
        if "senior" in title_lower or "sr." in title_lower or "staff" in title_lower:
            return "Senior"
        if "junior" in title_lower or "jr." in title_lower or "entry" in title_lower:
            return "Entry"
        if "lead" in title_lower or "principal" in title_lower:
            return "Lead"
        if "intern" in title_lower:
            return "Intern"
        return "Mid"

    def _extract_skills(self, text: str) -> list[str]:
        """Extract skills from job description."""
        if not text:
            return []
        skills = []
        skill_keywords = [
            "python", "java", "javascript", "typescript", "go", "rust", "c++", "c#",
            "react", "angular", "vue", "node.js", "django", "fastapi", "flask", "spring",
            "aws", "gcp", "azure", "kubernetes", "docker", "terraform",
            "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
            "machine learning", "deep learning", "nlp", "computer vision",
            "sql", "nosql", "graphql", "rest api", "microservices",
            "git", "ci/cd", "agile", "scrum",
        ]
        text_lower = text.lower()
        for skill in skill_keywords:
            if skill in text_lower:
                skills.append(skill.title() if len(skill) > 3 else skill.upper())
        return skills[:15]

    async def get_job_details(self, job_id: str) -> JobData | None:
        """Get detailed job info - Lever includes all details in listing."""
        return None

    async def search_company(self, company_id: str, query: str = "", limit: int = 50) -> list[JobData]:
        """Search jobs from a specific company."""
        company_name = company_id
        for name, cid in LEVER_COMPANIES.items():
            if cid == company_id:
                company_name = name
                break
        
        jobs = await self._fetch_company_jobs(company_id, company_name)
        if query:
            query_lower = query.lower()
            jobs = [j for j in jobs if query_lower in j.title.lower()]
        return jobs[:limit]


lever_scraper = LeverScraper()
