"""Scraper background tasks."""
import asyncio
import logging
from datetime import date, timedelta
from app.celery_app import celery_app
from app.services.scraper import job_scraper_service
from app.repositories import job_repository, job_alerts_repository
from app.services.email_service import email_service
from app.database import get_supabase_admin

logger = logging.getLogger(__name__)


def run_async(coro):
    """Run async function in sync context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def scrape_jobs_task(self, query: str, location: str | None = None, sources: list[str] | None = None):
    """Background task to scrape jobs from multiple sources."""
    try:
        logger.info(f"Starting scrape task: query={query}, location={location}, sources={sources}")
        result = run_async(
            job_scraper_service.search_and_save(
                query=query,
                location=location,
                sources=sources,
                limit_per_source=25,
            )
        )
        logger.info(f"Scrape complete: {result}")
        return result
    except Exception as e:
        logger.error(f"Scrape task failed: {e}")
        raise self.retry(exc=e, countdown=60)


@celery_app.task
def scrape_trending_jobs():
    """Periodic task to scrape trending job searches."""
    trending_queries = [
        "software engineer",
        "data scientist",
        "product manager",
        "frontend developer",
        "backend developer",
        "devops engineer",
    ]
    results = []
    for query in trending_queries:
        try:
            result = run_async(
                job_scraper_service.search_and_save(
                    query=query,
                    location="India",
                    limit_per_source=10,
                )
            )
            results.append({"query": query, **result})
        except Exception as e:
            logger.error(f"Failed to scrape {query}: {e}")
            results.append({"query": query, "error": str(e)})
    return results


@celery_app.task
def process_job_alerts():
    """Process all active job alerts and send emails."""
    async def _process():
        alerts = await job_alerts_repository.get_active_alerts()
        sent_count = 0
        
        for alert in alerts:
            try:
                # Find matching jobs
                keywords = alert.get("keywords", [])
                if not keywords:
                    continue
                
                # Search for jobs matching alert criteria
                matching_jobs = []
                for keyword in keywords[:3]:  # Limit to 3 keywords
                    jobs = await job_repository.search(
                        query=keyword,
                        location=alert.get("locations", [None])[0] if alert.get("locations") else None,
                        remote_type="remote" if alert.get("remote_only") else None,
                        limit=10,
                    )
                    matching_jobs.extend(jobs)
                
                # Deduplicate
                seen = set()
                unique_jobs = []
                for job in matching_jobs:
                    if job["id"] not in seen:
                        seen.add(job["id"])
                        unique_jobs.append(job)
                
                if not unique_jobs:
                    continue
                
                # Get user info
                user = alert.get("users", {})
                email = user.get("email")
                if not email:
                    continue
                
                # Send email
                success = await email_service.send_job_alert(
                    to_email=email,
                    user_name=user.get("full_name"),
                    jobs=unique_jobs,
                    alert_keywords=keywords,
                )
                
                if success:
                    await job_alerts_repository.update_last_sent(alert["id"])
                    sent_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to process alert {alert.get('id')}: {e}")
        
        return {"processed": len(alerts), "sent": sent_count}
    
    return run_async(_process())


@celery_app.task
def cleanup_old_jobs(days: int = 30):
    """Remove jobs older than specified days."""
    try:
        deleted = run_async(job_repository.delete_old_jobs(days))
        logger.info(f"Cleaned up {deleted} old jobs")
        return {"deleted": deleted}
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        return {"error": str(e)}


@celery_app.task
def process_follow_up_reminders():
    """Check for applications with follow-up dates and create notifications."""
    db = get_supabase_admin()
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    
    # Get applications with follow_up_date = today or tomorrow
    result = db.table("applications").select(
        "id, user_id, job_id, follow_up_date, jobs(title, company)"
    ).or_(
        f"follow_up_date.eq.{today},follow_up_date.eq.{tomorrow}"
    ).execute()
    
    if not result.data:
        return {"processed": 0, "notifications": 0}
    
    notifications_created = 0
    for app in result.data:
        job = app.get("jobs", {})
        job_title = job.get("title", "Unknown Job")
        company = job.get("company", "Unknown Company")
        follow_up = app.get("follow_up_date")
        
        is_today = follow_up == today
        title = "Follow-up Reminder" if is_today else "Upcoming Follow-up"
        message = f"{'Today is' if is_today else 'Tomorrow is'} your follow-up date for {job_title} at {company}"
        
        # Check if notification already exists for this application today
        existing = db.table("notifications").select("id").eq(
            "user_id", app["user_id"]
        ).eq("link", f"/applications?highlight={app['id']}").gte(
            "created_at", today
        ).execute()
        
        if existing.data:
            continue
        
        # Create notification
        db.table("notifications").insert({
            "user_id": app["user_id"],
            "type": "follow_up",
            "title": title,
            "message": message,
            "link": f"/applications?highlight={app['id']}",
        }).execute()
        notifications_created += 1
    
    logger.info(f"Follow-up reminders: processed {len(result.data)}, created {notifications_created} notifications")
    return {"processed": len(result.data), "notifications": notifications_created}
