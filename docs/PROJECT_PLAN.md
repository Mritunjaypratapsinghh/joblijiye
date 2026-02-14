# Job Tracker Platform - Complete Project Plan

> A unified job application platform that aggregates jobs from multiple sources, generates ATS-optimized resumes using AI, and auto-fills applications via browser extension.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Target User](#target-user)
5. [Core Features](#core-features)
6. [Technical Architecture](#technical-architecture)
7. [Tech Stack](#tech-stack)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Browser Extension](#browser-extension)
11. [AI Resume Generation](#ai-resume-generation)
12. [Job Scraping](#job-scraping)
13. [Deployment](#deployment)
14. [Development Phases](#development-phases)
15. [Project Structure](#project-structure)
16. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

A personal job application platform that:
- Aggregates jobs from LinkedIn, Indeed, Glassdoor, and company career pages
- Generates AI-tailored resumes optimized for ATS (Applicant Tracking Systems)
- Auto-fills job applications via browser extension
- Tracks all applications in one dashboard

**Cost: $0/month** (using free tiers of all services)

---

## Problem Statement

As a software developer, job hunting is painful because:

1. **Manual Resume Tailoring** - Each job requires customizing resume to match job description for better ATS scores
2. **Missing Opportunities** - FAANG and top companies post jobs that get filled quickly; manual checking means missing out
3. **Repetitive Applications** - Filling the same information on 100+ job applications is tedious
4. **No Central Tracking** - Applications scattered across multiple platforms, hard to track status

---

## Solution Overview

### Three-Component System

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Platform  │ ←→  │   Backend API    │ ←→  │   Extension     │
│   (Dashboard)   │     │   (FastAPI)      │     │   (Auto-fill)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

1. **Web Platform** - Dashboard to view jobs, manage profile, generate resumes, track applications
2. **Backend API** - Handles job scraping, AI resume generation, data storage
3. **Browser Extension** - Auto-fills job application forms on any job site

---

## Target User

- **Primary**: Software developers (personal use)
- **Use Case**: Streamline job search and application process
- **Goal**: Apply to more jobs with less effort, never miss opportunities

---

## Core Features

### 1. Job Aggregation
- Scrape jobs from LinkedIn, Indeed, Glassdoor, ZipRecruiter
- Filter by role, location, company, salary
- Real-time alerts for new matching jobs
- Match scoring based on profile

### 2. AI Resume Optimization
- Upload master resume once
- AI generates tailored version for each job
- Optimizes for ATS keywords and formatting
- Shows ATS score before applying

### 3. Browser Extension
- Detects job application forms
- Auto-fills all fields with profile data
- Uploads tailored resume
- Reports application back to dashboard

### 4. Application Tracking
- Central dashboard for all applications
- Status tracking (Applied → Interview → Offer/Rejected)
- Notes and follow-up reminders
- Analytics on success rates

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐              ┌─────────────────────────┐   │
│  │   Next.js 15    │              │   Browser Extension     │   │
│  │   (Dashboard)   │              │   (Brave/Chrome)        │   │
│  │                 │              │                         │   │
│  │  - Job listing  │              │  - Form detection       │   │
│  │  - Profile mgmt │◄────────────►│  - Auto-fill            │   │
│  │  - Resume gen   │   REST API   │  - Status reporting     │   │
│  │  - Tracking     │              │  - Profile sync         │   │
│  └────────┬────────┘              └────────────┬────────────┘   │
└───────────┼────────────────────────────────────┼────────────────┘
            │                                    │
            ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FastAPI Server                        │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │   Auth   │ │   Jobs   │ │  Resume  │ │  Apply   │    │    │
│  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│           ┌──────────────────┼──────────────────┐               │
│           ▼                  ▼                  ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Groq AI   │    │   Redis     │    │  PostgreSQL │         │
│  │   (LLM)     │    │   (Queue)   │    │  (Supabase) │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                              │                                   │
│                              ▼                                   │
│                     ┌─────────────┐                             │
│                     │   Celery    │                             │
│                     │  (Workers)  │                             │
│                     │             │                             │
│                     │ - Scraping  │                             │
│                     │ - PDF Gen   │                             │
│                     └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15 (App Router) | Dashboard UI |
| Styling | TailwindCSS + shadcn/ui | Component library |
| Backend | FastAPI (Python) | REST API |
| Database | PostgreSQL (Supabase) | Data storage |
| Cache/Queue | Redis (Upstash) | Job queue |
| AI | Groq API (free tier) | Resume generation |
| Job Scraping | JobSpy (Python) | Multi-platform scraper |
| PDF Generation | ReportLab | ATS-friendly PDFs |
| Extension | Manifest V3 | Browser auto-fill |
| Auth | JWT + HTTP-only cookies | Secure authentication |

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    master_resume_url VARCHAR(500),
    master_resume_text TEXT,
    skills TEXT[],
    experience JSONB,
    education JSONB,
    preferences JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Scraped jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255),
    source VARCHAR(50),
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    job_type VARCHAR(50),
    experience_level VARCHAR(50),
    apply_url VARCHAR(1000) NOT NULL,
    posted_at TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    required_skills TEXT[],
    UNIQUE(apply_url)
);

-- Generated resumes
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    resume_json JSONB,
    resume_pdf_url VARCHAR(500),
    ats_score INTEGER,
    keywords_matched TEXT[],
    keywords_missing TEXT[],
    changes_made TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    resume_id UUID REFERENCES resumes(id),
    status VARCHAR(50) DEFAULT 'saved',
    applied_at TIMESTAMP,
    status_updated_at TIMESTAMP,
    notes TEXT,
    follow_up_date DATE,
    response_received BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_scraped_at ON jobs(scraped_at);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Get current user |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/resume` | Upload master resume |
| GET | `/api/profile/resume` | Download master resume |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs (with filters) |
| GET | `/api/jobs/:id` | Get job details |
| GET | `/api/jobs/matched` | Get personalized matches |
| GET | `/api/jobs/stats` | Get job market stats |

### Resumes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resumes/generate` | Generate tailored resume |
| GET | `/api/resumes/:id` | Get resume details |
| GET | `/api/resumes/:id/pdf` | Download PDF |
| GET | `/api/resumes/history` | List generated resumes |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List all applications |
| POST | `/api/applications` | Create application record |
| PATCH | `/api/applications/:id` | Update status |
| DELETE | `/api/applications/:id` | Remove application |
| GET | `/api/applications/analytics` | Get success metrics |

### Extension
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/extension/profile` | Get profile for auto-fill |
| GET | `/api/extension/resume/:job_id` | Get tailored resume |
| POST | `/api/extension/applied` | Report successful application |

---

## Browser Extension

### Supported Platforms
- LinkedIn Easy Apply
- Indeed Apply
- Greenhouse (Airbnb, Pinterest, Stripe)
- Lever (Netflix, Shopify, Twitch)
- Workday (Google, Amazon, Microsoft)
- iCIMS
- SmartRecruiters

### Extension Structure
```
extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── background/
│   └── service-worker.js
├── content/
│   ├── content.js
│   └── form-detector.js
├── adapters/
│   ├── linkedin.js
│   ├── indeed.js
│   ├── greenhouse.js
│   ├── lever.js
│   └── workday.js
└── utils/
    └── api.js
```

### Auto-Fill Flow
1. Page loads → content script runs
2. Detect ATS platform (URL pattern matching)
3. Load appropriate adapter
4. Find form fields using adapter selectors
5. Fetch user profile from extension storage
6. Fill fields programmatically
7. Upload resume (if file input exists)
8. Highlight filled fields for user review
9. User clicks submit
10. Report application to backend

### Installation (Free - Load Unpacked)
```
1. Build extension locally
2. Brave → brave://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select extension folder
6. Done! Works on Brave
```

---

## AI Resume Generation

### How ATS Scoring Works

| Factor | Weight | Description |
|--------|--------|-------------|
| Keyword Matching | 40% | Exact and semantic match with job description |
| Formatting | 30% | Simple structure, standard sections, readable fonts |
| Content Relevance | 30% | Experience alignment, quantified achievements |

### AI Provider: Groq (Free Tier)

| Model | Requests/Day | Tokens/Day |
|-------|--------------|------------|
| llama-3.1-8b-instant | 14,400 | 500,000 |
| llama-3.3-70b-versatile | 1,000 | 100,000 |

**Capacity**: ~250+ resumes/day (free)

### Resume Generation Flow
```
Job Description → Extract Keywords → Compare with Master Resume
                                            ↓
                              Identify Gaps & Matches
                                            ↓
                              AI Rewrite (Groq API)
                                            ↓
                              Generate ATS-Friendly PDF
                                            ↓
                              Calculate ATS Score
```

---

## Job Scraping

### Data Source: JobSpy Library

```python
from jobspy import scrape_jobs

jobs = scrape_jobs(
    site_name=["indeed", "linkedin", "glassdoor"],
    search_term="software engineer",
    location="Bangalore",
    results_wanted=50,
    hours_old=24
)
```

### Supported Job Boards
- LinkedIn (public listings)
- Indeed
- Glassdoor
- ZipRecruiter
- Google Jobs
- Direct company career pages

### Scraping Schedule
- Every 6 hours for general jobs
- Every 1 hour for FAANG/priority companies
- Deduplication by URL hash

---

## Deployment

### Cost Breakdown (100% Free)

| Service | Purpose | Free Tier Limits | Cost |
|---------|---------|------------------|------|
| Vercel | Next.js frontend | Unlimited deploys, 100GB bandwidth | $0 |
| Railway | FastAPI backend | $5 one-time credit | $0 |
| Supabase | PostgreSQL DB | 500MB storage, 50K MAU | $0 |
| Groq | AI/LLM | 14,400 req/day, 500K tokens/day | $0 |
| Upstash | Redis (optional) | 10K commands/day | $0 |
| Extension | Load unpacked | Unlimited | $0 |
| **Total** | | | **$0/month** |

### Deployment Flow
```
GitHub Repository
       │
       ├──► Vercel (auto-deploy frontend)
       │         └──► yourapp.vercel.app
       │
       ├──► Railway (auto-deploy backend)
       │         └──► yourapp-api.railway.app
       │
       └──► Local (extension)
                 └──► brave://extensions/ (load unpacked)
```

---

## Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup (Next.js + FastAPI)
- [ ] Database schema (Supabase)
- [ ] Authentication (JWT)
- [ ] User profile CRUD
- [ ] Resume upload & parsing

### Phase 2: Job Aggregation (Week 2)
- [ ] JobSpy integration
- [ ] Scraper for 5 sources
- [ ] Background job scheduler
- [ ] Job deduplication
- [ ] Match scoring algorithm

### Phase 3: AI Resume Generation (Week 3)
- [ ] Groq API integration
- [ ] Resume optimization prompts
- [ ] ATS scoring algorithm
- [ ] PDF generation (ReportLab)
- [ ] Resume comparison view

### Phase 4: Frontend Dashboard (Week 4)
- [ ] Job listing page
- [ ] Job details + apply flow
- [ ] Profile management
- [ ] Application tracker
- [ ] Analytics dashboard

### Phase 5: Browser Extension (Week 5)
- [ ] Extension skeleton (Manifest V3)
- [ ] Form detection logic
- [ ] LinkedIn adapter
- [ ] Indeed adapter
- [ ] Greenhouse/Lever adapters

### Phase 6: Integration & Polish (Week 6)
- [ ] End-to-end testing
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment

---

## Project Structure

```
job-tracker/
├── frontend/                    # Next.js 15
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── profile/
│   │   │   └── analytics/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── package.json
│
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── jobs.py
│   │   │   ├── resumes.py
│   │   │   ├── applications.py
│   │   │   └── extension.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── job_scraper.py
│   │   │   ├── resume_generator.py
│   │   │   ├── ats_scorer.py
│   │   │   └── pdf_generator.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── extension/                   # Browser Extension
│   ├── manifest.json
│   ├── popup/
│   ├── background/
│   ├── content/
│   ├── adapters/
│   └── utils/
│
├── docs/                        # Documentation
│   └── PROJECT_PLAN.md
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Job site blocks scraping | Use proxies, respect rate limits, rotate user agents |
| Groq rate limits | Cache responses, batch requests, fallback to Ollama |
| Extension form changes | Modular adapters, easy to update selectors |
| Database limits | Efficient queries, data cleanup jobs |
| Legal/ToS issues | Scrape public data only, no auto-submit without user action |

---

## Next Steps

1. **Initialize project structure**
2. **Set up backend API skeleton**
3. **Create first job scraper**
4. **Integrate AI resume generation**
5. **Build frontend dashboard**
6. **Develop browser extension**
7. **Deploy and test**

---

*Document created: February 11, 2026*
*Last updated: February 11, 2026*
