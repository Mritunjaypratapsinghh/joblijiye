"""Greenhouse ATS scraper for tech companies."""
from app.services.scraper.base import BaseScraper, JobData


# Companies using Greenhouse
GREENHOUSE_COMPANIES = {
    "meta": "facebookcareers",
    "pinterest": "pinterest",
    "hubspot": "hubspot",
    "twilio": "twilio",
    "datadog": "datadog",
    "mongodb": "mongodb",
    "elastic": "elastic",
    "hashicorp": "hashicorp",
    "gitlab": "gitlab",
    "asana": "asana",
    "airtable": "airtable",
    "canva": "canva",
    "duolingo": "duolingo",
    "grammarly": "grammarly",
    "zapier": "zapier",
    "webflow": "webflow",
    "vercel": "vercel",
    "supabase": "supabase",
    "linear": "linear",
    "retool": "retool",
    "segment": "segment",
    "amplitude": "amplitude",
    "mixpanel": "mixpanel",
}


class GreenhouseScraper(BaseScraper):
    """Scraper for Greenhouse ATS job boards."""

    SOURCE = "greenhouse"
    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

    async def search(
        self,
        query: str,
        location: str | None = None,
        remote: bool = False,
        limit: int = 50,
    ) -> list[JobData]:
        """Search jobs across all Greenhouse companies."""
        all_jobs = []
        query_lower = query.lower()

        for company_name, board_token in GREENHOUSE_COMPANIES.items():
            if len(all_jobs) >= limit:
                break
            try:
                jobs = await self._fetch_company_jobs(board_token, company_name)
                for job in jobs:
                    if len(all_jobs) >= limit:
                        break
                    title_lower = job.title.lower()
                    if query_lower in title_lower:
                        if location and job.location:
                            if location.lower() not in job.location.lower():
                                continue
                        all_jobs.append(job)
            except Exception:
                continue

        return all_jobs

    async def _fetch_company_jobs(self, board_token: str, company_name: str) -> list[JobData]:
        """Fetch all jobs from a specific company."""
        url = f"{self.BASE_URL}/{board_token}/jobs"
        try:
            resp = await self.client.get(url, params={"content": "true"})
            if resp.status_code != 200:
                return []
            data = resp.json()
            jobs = data.get("jobs", [])
            return [self._parse_job(job, company_name, board_token) for job in jobs]
        except Exception:
            return []

    def _parse_job(self, data: dict, company_name: str, board_token: str) -> JobData:
        """Parse Greenhouse job posting."""
        # Extract location from offices
        offices = data.get("offices", [])
        location = offices[0].get("name", "") if offices else ""
        
        # Extract department
        departments = data.get("departments", [])
        department = departments[0].get("name", "") if departments else ""
        
        # Determine remote type
        remote_type = None
        location_lower = location.lower()
        if "remote" in location_lower:
            remote_type = "Remote"
        elif "hybrid" in location_lower:
            remote_type = "Hybrid"
        
        # Get description (HTML content)
        content = data.get("content", "")
        # Strip HTML tags for plain text
        import re
        description = re.sub(r'<[^>]+>', '\n', content)
        description = re.sub(r'\n+', '\n', description).strip()

        return JobData(
            external_id=str(data["id"]),
            source=self.SOURCE,
            company=company_name.title(),
            title=data.get("title", ""),
            location=location,
            description=description[:5000] if description else None,
            salary_min=None,
            salary_max=None,
            job_type="Full-time",
            experience_level=self._extract_level(data.get("title", "")),
            remote_type=remote_type,
            apply_url=data.get("absolute_url", f"https://boards.greenhouse.io/{board_token}/jobs/{data['id']}"),
            posted_at=data.get("updated_at"),
            required_skills=self._extract_skills(description),
        )

    def _extract_level(self, title: str) -> str | None:
        """Extract experience level from title."""
        title_lower = title.lower()
        if "senior" in title_lower or "sr." in title_lower or "staff" in title_lower:
            return "Senior"
        if "junior" in title_lower or "jr." in title_lower or "entry" in title_lower:
            return "Entry"
        if "lead" in title_lower or "principal" in title_lower or "manager" in title_lower:
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
            "python", "java", "javascript", "typescript", "go", "rust", "c++", "c#", "ruby", "scala",
            "react", "angular", "vue", "next.js", "node.js", "django", "fastapi", "flask", "rails",
            "aws", "gcp", "azure", "kubernetes", "docker", "terraform", "ansible",
            "postgresql", "mysql", "mongodb", "redis", "cassandra", "dynamodb",
            "machine learning", "deep learning", "nlp", "pytorch", "tensorflow",
            "sql", "nosql", "graphql", "rest api", "grpc", "microservices",
            "git", "ci/cd", "jenkins", "github actions", "agile", "scrum",
            "kafka", "rabbitmq", "spark", "hadoop", "airflow",
        ]
        text_lower = text.lower()
        for skill in skill_keywords:
            if skill in text_lower:
                skills.append(skill.title() if len(skill) > 3 else skill.upper())
        return skills[:15]

    async def get_job_details(self, job_id: str) -> JobData | None:
        """Get detailed job info."""
        return None

    async def search_company(self, board_token: str, query: str = "", limit: int = 50) -> list[JobData]:
        """Search jobs from a specific company."""
        company_name = board_token
        for name, token in GREENHOUSE_COMPANIES.items():
            if token == board_token:
                company_name = name
                break
        
        jobs = await self._fetch_company_jobs(board_token, company_name)
        if query:
            query_lower = query.lower()
            jobs = [j for j in jobs if query_lower in j.title.lower()]
        return jobs[:limit]


greenhouse_scraper = GreenhouseScraper()
