"""Dashboard routes - real stats from database."""
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends
from app.api.v1.auth.dependencies import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    """Get real dashboard statistics for current user."""
    db = get_supabase()
    user_id = user["id"]

    # Get application counts by status
    apps = db.table("applications").select("status, applied_at").eq("user_id", user_id).execute()
    app_list = apps.data or []

    status_counts = {}
    for app in app_list:
        status = app["status"].lower()
        status_counts[status] = status_counts.get(status, 0) + 1

    # Get recent applications (last 7 days)
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    recent_apps = db.table("applications").select("*, jobs(title, company)").eq("user_id", user_id).gte("applied_at", week_ago).order("applied_at", desc=True).limit(5).execute()

    # Get resume count
    resumes = db.table("resumes").select("id", count="exact").eq("user_id", user_id).execute()

    # Get saved jobs count
    saved_jobs = db.table("saved_jobs").select("id", count="exact").eq("user_id", user_id).execute()

    total = len(app_list)
    return {
        "total_applications": total,
        "in_progress": status_counts.get("screening", 0) + status_counts.get("interview", 0),
        "interviews": status_counts.get("interview", 0),
        "offers": status_counts.get("offer", 0),
        "rejected": status_counts.get("rejected", 0),
        "applied": status_counts.get("applied", 0),
        "resumes_count": resumes.count or 0,
        "saved_jobs_count": saved_jobs.count or 0,
        "recent_applications": [
            {
                "id": app["id"],
                "company": app["jobs"]["company"] if app.get("jobs") else "Unknown",
                "role": app["jobs"]["title"] if app.get("jobs") else "Unknown",
                "status": app["status"],
                "date": app["applied_at"],
            }
            for app in (recent_apps.data or [])
        ],
    }


@router.get("/analytics")
async def get_analytics(user: dict = Depends(get_current_user)):
    """Get detailed analytics for current user."""
    db = get_supabase()
    user_id = user["id"]

    # Get all applications with dates
    apps = db.table("applications").select("status, applied_at, created_at").eq("user_id", user_id).order("applied_at", desc=True).execute()
    app_list = apps.data or []

    # Status distribution
    status_counts = {"applied": 0, "screening": 0, "interview": 0, "offer": 0, "rejected": 0}
    for app in app_list:
        status = app["status"].lower()
        if status in status_counts:
            status_counts[status] += 1

    # Applications over time (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_counts = {}
    for app in app_list:
        if app.get("applied_at"):
            date = app["applied_at"][:10]  # YYYY-MM-DD
            app_date = datetime.fromisoformat(date.replace("Z", ""))
            if app_date >= thirty_days_ago:
                daily_counts[date] = daily_counts.get(date, 0) + 1

    # Fill in missing days
    timeline = []
    for i in range(30):
        date = (thirty_days_ago + timedelta(days=i)).strftime("%Y-%m-%d")
        timeline.append({"date": date, "count": daily_counts.get(date, 0)})

    # Conversion funnel
    total = len(app_list)
    funnel = [
        {"stage": "Applied", "count": total, "percentage": 100},
        {"stage": "Screening", "count": status_counts["screening"] + status_counts["interview"] + status_counts["offer"], "percentage": round((status_counts["screening"] + status_counts["interview"] + status_counts["offer"]) / max(total, 1) * 100)},
        {"stage": "Interview", "count": status_counts["interview"] + status_counts["offer"], "percentage": round((status_counts["interview"] + status_counts["offer"]) / max(total, 1) * 100)},
        {"stage": "Offer", "count": status_counts["offer"], "percentage": round(status_counts["offer"] / max(total, 1) * 100)},
    ]

    # Response rate (non-rejected / total)
    responded = total - status_counts["applied"] - status_counts["rejected"]
    response_rate = round(responded / max(total, 1) * 100)

    # Average time to response (mock for now)
    avg_response_days = 7  # Would calculate from actual data

    return {
        "status_distribution": status_counts,
        "timeline": timeline,
        "funnel": funnel,
        "metrics": {
            "total_applications": total,
            "response_rate": response_rate,
            "interview_rate": round((status_counts["interview"] + status_counts["offer"]) / max(total, 1) * 100),
            "offer_rate": round(status_counts["offer"] / max(total, 1) * 100),
            "avg_response_days": avg_response_days,
        },
    }


@router.get("/salary-insights")
async def get_salary_insights(user: dict = Depends(get_current_user)):
    """Get salary insights aggregated from job listings."""
    db = get_supabase()

    # Get jobs with salary data
    jobs = db.table("jobs").select("title, company, salary_min, salary_max, location, experience_level").not_.is_("salary_min", "null").execute()
    job_list = jobs.data or []

    if not job_list:
        return {"has_data": False, "message": "No salary data available yet"}

    # Aggregate by role
    role_salaries: dict = defaultdict(list)
    company_salaries: dict = defaultdict(list)
    level_salaries: dict = defaultdict(list)
    all_salaries = []

    for job in job_list:
        avg = (job["salary_min"] + (job["salary_max"] or job["salary_min"])) // 2
        all_salaries.append(avg)

        # Normalize title to category
        title = job["title"].lower()
        if "senior" in title or "sr" in title:
            role_salaries["Senior"].append(avg)
        elif "lead" in title or "principal" in title:
            role_salaries["Lead/Principal"].append(avg)
        elif "junior" in title or "jr" in title or "entry" in title:
            role_salaries["Junior"].append(avg)
        else:
            role_salaries["Mid-Level"].append(avg)

        company_salaries[job["company"]].append(avg)

        if job.get("experience_level"):
            level_salaries[job["experience_level"]].append(avg)

    # Calculate stats
    def calc_stats(salaries: list) -> dict:
        if not salaries:
            return {"min": 0, "max": 0, "avg": 0, "count": 0}
        return {
            "min": min(salaries),
            "max": max(salaries),
            "avg": sum(salaries) // len(salaries),
            "count": len(salaries),
        }

    # Top paying companies (min 2 jobs)
    top_companies = sorted(
        [(c, calc_stats(s)) for c, s in company_salaries.items() if len(s) >= 1],
        key=lambda x: x[1]["avg"],
        reverse=True,
    )[:10]

    # Salary by role level
    by_level = {level: calc_stats(sals) for level, sals in role_salaries.items()}

    # Salary ranges distribution
    ranges = {"0-5L": 0, "5-10L": 0, "10-20L": 0, "20-40L": 0, "40L+": 0}
    for sal in all_salaries:
        lpa = sal / 100000
        if lpa < 5:
            ranges["0-5L"] += 1
        elif lpa < 10:
            ranges["5-10L"] += 1
        elif lpa < 20:
            ranges["10-20L"] += 1
        elif lpa < 40:
            ranges["20-40L"] += 1
        else:
            ranges["40L+"] += 1

    return {
        "has_data": True,
        "overall": calc_stats(all_salaries),
        "by_level": by_level,
        "top_companies": [{"company": c, **s} for c, s in top_companies],
        "distribution": ranges,
        "total_jobs_with_salary": len(job_list),
    }
