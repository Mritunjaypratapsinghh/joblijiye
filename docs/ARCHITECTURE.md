# Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐              ┌─────────────────────────┐   │
│  │   Next.js 15    │              │   Browser Extension     │   │
│  │   (Dashboard)   │              │   (Brave/Chrome)        │   │
│  └────────┬────────┘              └────────────┬────────────┘   │
└───────────┼────────────────────────────────────┼────────────────┘
            │              REST API              │
            ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FastAPI Server                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │   Auth   │ │   Jobs   │ │  Resume  │ │  Apply   │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│           │                  │                  │                │
│           ▼                  ▼                  ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Groq AI   │    │   Redis     │    │  PostgreSQL │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (Next.js 15)

**Framework**: Next.js 15 with App Router
**Styling**: TailwindCSS + shadcn/ui
**State Management**: Zustand
**Data Fetching**: React Query (TanStack Query)

**Key Pages**:
- `/` - Landing page
- `/login`, `/register` - Authentication
- `/dashboard` - Job feed with filters
- `/jobs/[id]` - Job details + resume generation
- `/profile` - Profile management
- `/applications` - Application tracker
- `/analytics` - Success metrics

### 2. Backend (FastAPI)

**Framework**: FastAPI (Python 3.11+)
**ORM**: SQLAlchemy 2.0
**Validation**: Pydantic v2
**Background Tasks**: Celery + Redis
**Authentication**: JWT (python-jose)

**Modules**:
- `auth` - User registration, login, token management
- `jobs` - Job listing, filtering, matching
- `resumes` - AI generation, PDF creation, ATS scoring
- `applications` - CRUD, status tracking
- `extension` - Profile sync, application reporting

### 3. Database (PostgreSQL)

**Provider**: Supabase (free tier)
**Storage**: 500MB
**Features**: Row-level security, real-time subscriptions

**Tables**:
- `users` - Authentication data
- `profiles` - User profile and preferences
- `jobs` - Scraped job listings
- `resumes` - Generated tailored resumes
- `applications` - Application tracking

### 4. AI Service (Groq)

**Provider**: Groq Cloud (free tier)
**Models**: 
- `llama-3.1-8b-instant` - Fast, general use
- `llama-3.3-70b-versatile` - Complex reasoning

**Use Cases**:
- Resume keyword extraction
- Resume content optimization
- ATS score calculation
- Job-resume matching

### 5. Job Scraping (JobSpy)

**Library**: python-jobspy
**Sources**: LinkedIn, Indeed, Glassdoor, ZipRecruiter
**Schedule**: Celery Beat (every 6 hours)
**Storage**: PostgreSQL with deduplication

### 6. Browser Extension

**Manifest**: V3 (Chrome/Brave compatible)
**Components**:
- Popup UI (profile status, quick actions)
- Content scripts (form detection, auto-fill)
- Background service worker (API communication)
- Site adapters (platform-specific selectors)

## Data Flow

### Job Discovery Flow
```
Celery Worker → JobSpy Scraper → Parse Jobs → Deduplicate → Store in DB
                                                                ↓
User Dashboard ← API Response ← Match Scoring ← Fetch from DB ←┘
```

### Resume Generation Flow
```
User clicks "Generate" → API Request → Fetch Job + Profile
                                              ↓
                                    Extract Keywords (AI)
                                              ↓
                                    Optimize Resume (AI)
                                              ↓
                                    Generate PDF (ReportLab)
                                              ↓
                                    Calculate ATS Score
                                              ↓
User sees preview ← API Response ← Store Resume ←┘
```

### Application Flow
```
User clicks "Apply" → Open Job URL → Extension Detects Form
                                              ↓
                                    Load Site Adapter
                                              ↓
                                    Fetch Profile + Resume
                                              ↓
                                    Auto-fill Form Fields
                                              ↓
User reviews & submits → Extension Reports → Update Application Status
```

## Security Considerations

1. **Authentication**: JWT with short expiry + refresh tokens
2. **Password Storage**: bcrypt hashing
3. **API Security**: Rate limiting, CORS configuration
4. **Extension**: Minimal permissions, local storage encryption
5. **Data Privacy**: User data never shared, stored on personal infrastructure

## Scalability Notes

For personal use, the current architecture is sufficient. If scaling:
- Add Redis caching for job listings
- Use connection pooling for database
- Implement job queue for resume generation
- Add CDN for static assets
