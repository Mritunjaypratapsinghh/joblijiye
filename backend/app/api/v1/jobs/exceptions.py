"""Job exceptions."""
from app.core.exceptions import NotFoundError, AppError


class JobNotFoundError(NotFoundError):
    def __init__(self, job_id: str):
        super().__init__(f"Job {job_id} not found")


class ScrapingError(AppError):
    def __init__(self, source: str, detail: str):
        super().__init__(f"Failed to scrape from {source}: {detail}")
