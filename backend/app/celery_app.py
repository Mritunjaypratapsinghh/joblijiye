"""Celery configuration and app."""
import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "joblijiye",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.scraper_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 min max per task
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Beat schedule for periodic scraping
celery_app.conf.beat_schedule = {
    "scrape-trending-jobs-hourly": {
        "task": "app.tasks.scraper_tasks.scrape_trending_jobs",
        "schedule": 3600.0,  # Every hour
    },
    "process-job-alerts-daily": {
        "task": "app.tasks.scraper_tasks.process_job_alerts",
        "schedule": 86400.0,  # Every 24 hours
    },
    "process-follow-up-reminders": {
        "task": "app.tasks.scraper_tasks.process_follow_up_reminders",
        "schedule": 21600.0,  # Every 6 hours
    },
}
