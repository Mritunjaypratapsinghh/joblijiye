"""Tasks module."""
from app.tasks.scraper_tasks import scrape_jobs_task, scrape_trending_jobs, cleanup_old_jobs

__all__ = ["scrape_jobs_task", "scrape_trending_jobs", "cleanup_old_jobs"]
