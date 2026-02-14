# Database Schema

## Overview

PostgreSQL database hosted on Supabase (free tier: 500MB).

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   profiles  │       │    jobs     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──────<│ user_id(FK) │       │ id (PK)     │
│ email       │       │ full_name   │       │ external_id │
│ password    │       │ phone       │       │ source      │
│ created_at  │       │ skills[]    │       │ company     │
└─────────────┘       │ experience  │       │ title       │
                      │ education   │       │ location    │
                      │ preferences │       │ description │
                      └─────────────┘       │ apply_url   │
                                            └──────┬──────┘
                                                   │
                      ┌─────────────┐              │
                      │   resumes   │              │
                      ├─────────────┤              │
                      │ id (PK)     │              │
                      │ user_id(FK) │──────────────┤
                      │ job_id (FK) │──────────────┘
                      │ resume_json │
                      │ pdf_url     │
                      │ ats_score   │
                      └──────┬──────┘
                             │
                      ┌──────┴──────┐
                      │applications │
                      ├─────────────┤
                      │ id (PK)     │
                      │ user_id(FK) │
                      │ job_id (FK) │
                      │ resume_id   │
                      │ status      │
                      │ applied_at  │
                      └─────────────┘
```

## Tables

### users

Stores authentication credentials.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### profiles

Stores user profile information for resume generation and job matching.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic Info
    full_name VARCHAR(255),
    phone VARCHAR(20),
    location VARCHAR(255),
    
    -- Links
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    
    -- Resume
    master_resume_url VARCHAR(500),
    master_resume_text TEXT,
    
    -- Structured Data
    skills TEXT[] DEFAULT '{}',
    experience JSONB DEFAULT '[]',
    education JSONB DEFAULT '[]',
    
    -- Preferences
    preferences JSONB DEFAULT '{
        "roles": [],
        "locations": [],
        "companies": [],
        "salary_min": 0,
        "remote_only": false
    }',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

**Experience JSONB Structure:**
```json
[
    {
        "company": "Tech Corp",
        "title": "Senior Software Engineer",
        "location": "Bangalore",
        "start_date": "2022-01",
        "end_date": "present",
        "description": "Led development of microservices architecture...",
        "highlights": [
            "Reduced API latency by 40%",
            "Mentored team of 5 engineers"
        ]
    }
]
```

**Education JSONB Structure:**
```json
[
    {
        "institution": "IIT Delhi",
        "degree": "B.Tech",
        "field": "Computer Science",
        "year": "2020",
        "gpa": "8.5"
    }
]
```

### jobs

Stores scraped job listings from various sources.

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source Info
    external_id VARCHAR(255),
    source VARCHAR(50) NOT NULL,  -- linkedin, indeed, glassdoor, etc.
    
    -- Job Details
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    
    -- Compensation
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(10) DEFAULT 'INR',
    
    -- Classification
    job_type VARCHAR(50),  -- full-time, part-time, contract
    experience_level VARCHAR(50),  -- entry, mid, senior, lead
    remote_type VARCHAR(50),  -- onsite, remote, hybrid
    
    -- Application
    apply_url VARCHAR(1000) NOT NULL,
    
    -- Metadata
    posted_at TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Extracted Data
    required_skills TEXT[] DEFAULT '{}',
    
    UNIQUE(apply_url)
);

CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_scraped_at ON jobs(scraped_at DESC);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_is_active ON jobs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_skills ON jobs USING GIN(required_skills);
```

### resumes

Stores AI-generated tailored resumes.

```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    
    -- Resume Content
    resume_json JSONB NOT NULL,
    resume_pdf_url VARCHAR(500),
    
    -- ATS Analysis
    ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
    keywords_matched TEXT[] DEFAULT '{}',
    keywords_missing TEXT[] DEFAULT '{}',
    changes_made TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_job_id ON resumes(job_id);
CREATE INDEX idx_resumes_created_at ON resumes(created_at DESC);
```

**Resume JSON Structure:**
```json
{
    "summary": "Experienced software engineer with 5+ years...",
    "experience": [
        {
            "company": "Tech Corp",
            "title": "Senior Software Engineer",
            "dates": "Jan 2022 - Present",
            "bullets": [
                "Led development of microservices architecture serving 1M+ users",
                "Reduced API latency by 40% through optimization"
            ]
        }
    ],
    "skills": {
        "languages": ["Python", "JavaScript", "Go"],
        "frameworks": ["FastAPI", "React", "Django"],
        "tools": ["Docker", "Kubernetes", "AWS"]
    },
    "education": [
        {
            "institution": "IIT Delhi",
            "degree": "B.Tech in Computer Science",
            "year": "2020"
        }
    ],
    "projects": [
        {
            "name": "Open Source Contribution",
            "description": "Contributed to FastAPI documentation",
            "url": "https://github.com/..."
        }
    ]
}
```

### applications

Tracks job applications and their status.

```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'saved' CHECK (
        status IN ('saved', 'applied', 'viewed', 'phone_screen', 
                   'technical', 'onsite', 'offer', 'rejected', 'withdrawn')
    ),
    
    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE,
    status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Notes
    notes TEXT,
    follow_up_date DATE,
    
    -- Tracking
    response_received BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, job_id)
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
```

## Migrations

### Initial Migration

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all tables (run in order)
-- 1. users
-- 2. profiles
-- 3. jobs
-- 4. resumes
-- 5. applications

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Queries

### Get Matched Jobs for User

```sql
SELECT 
    j.*,
    (
        SELECT COUNT(*) 
        FROM unnest(j.required_skills) AS skill 
        WHERE skill = ANY(p.skills)
    ) * 100.0 / NULLIF(array_length(j.required_skills, 1), 0) AS match_score
FROM jobs j
CROSS JOIN profiles p
WHERE p.user_id = :user_id
  AND j.is_active = TRUE
  AND (
    j.location = ANY(p.preferences->'locations')
    OR p.preferences->>'remote_only' = 'true' AND j.remote_type = 'remote'
  )
ORDER BY match_score DESC
LIMIT 20;
```

### Get Application Statistics

```sql
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (response_date - applied_at)) / 86400)::int as avg_response_days
FROM applications
WHERE user_id = :user_id
  AND applied_at > NOW() - INTERVAL '30 days'
GROUP BY status;
```

### Cleanup Old Jobs

```sql
-- Mark jobs older than 30 days as inactive
UPDATE jobs 
SET is_active = FALSE 
WHERE scraped_at < NOW() - INTERVAL '30 days'
  AND is_active = TRUE;

-- Delete jobs older than 90 days with no applications
DELETE FROM jobs 
WHERE scraped_at < NOW() - INTERVAL '90 days'
  AND id NOT IN (SELECT DISTINCT job_id FROM applications WHERE job_id IS NOT NULL);
```

## Supabase Setup

1. Create new project at supabase.com
2. Go to SQL Editor
3. Run migration scripts in order
4. Copy connection string from Settings > Database
5. Add to backend `.env`:
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```


### notifications

Stores user notifications.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification Content
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('job_match', 'application_update', 'interview', 'status_change', 'system')
    ),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```
