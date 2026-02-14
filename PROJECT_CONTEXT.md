# Job Tracker

## Tech Stack
- Language: Python 3.11, TypeScript
- Framework: FastAPI (backend), Next.js 15 (frontend)
- Database: PostgreSQL (Supabase)
- AI: Groq API (Llama 3)
- Extension: Chrome Manifest V3

## Architecture Overview
Unified job application platform with:
- Job aggregation from LinkedIn, Indeed, Glassdoor
- AI-powered ATS-optimized resume generation
- Browser extension for auto-filling applications
- Application tracking dashboard

## Directory Structure
```
job-tracker/
├── frontend/                    # Next.js 15
│   ├── app/                     # App Router
│   │   ├── (auth)/              # Auth routes
│   │   ├── (dashboard)/         # Protected routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/              # UI components
│   ├── lib/                     # Utils, API client
│   └── public/
│
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py            # Settings
│   │   ├── database.py          # Supabase client
│   │   │
│   │   ├── api/                 # API layer
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py  # Router aggregation
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── routes.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── exceptions.py
│   │   │   │   │   └── dependencies.py
│   │   │   │   ├── applications/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── routes.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── exceptions.py
│   │   │   │   │   └── dependencies.py
│   │   │   │   ├── resumes/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── routes.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── exceptions.py
│   │   │   │   │   └── dependencies.py
│   │   │   │   └── auth/
│   │   │   │       ├── __init__.py
│   │   │   │       ├── routes.py
│   │   │   │       ├── schemas.py
│   │   │   │       ├── exceptions.py
│   │   │   │       └── dependencies.py
│   │   │   └── health/
│   │   │
│   │   ├── core/                # Core utilities
│   │   │   ├── exceptions.py
│   │   │   ├── schemas.py
│   │   │   └── response_handler.py
│   │   │
│   │   ├── models/              # Pydantic models
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   └── resume.py
│   │   │
│   │   ├── services/            # Business logic
│   │   │   ├── scraper/         # Job scraping
│   │   │   ├── ai/              # Groq/resume gen
│   │   │   └── storage/         # File storage
│   │   │
│   │   └── utils/               # Helpers
│   │       ├── auth.py
│   │       ├── helpers.py
│   │       └── logger.py
│   │
│   ├── main.py                  # Entry point
│   ├── requirements.txt
│   └── .env
│
├── extension/                   # Chrome MV3
│   ├── src/
│   │   ├── background.ts
│   │   ├── content.ts
│   │   └── popup/
│   ├── manifest.json
│   └── package.json
│
├── docs/
└── README.md
```

## Key Files
- Entry point: backend/app/main.py
- Config: .env files
- Routes/API: See docs/API.md
- Models: See docs/DATABASE.md
- Services: backend/app/

## Data Flow
User → Frontend → FastAPI Backend → Supabase DB / Groq AI

## External Dependencies
- Supabase (PostgreSQL)
- Groq API (AI)
- Job board scrapers

## Environment Variables
- Backend: backend/.env
- Frontend: frontend/.env.local

## Common Commands
- Run backend: `cd backend && uvicorn app.main:app --reload`
- Run frontend: `cd frontend && npm run dev`
- Build extension: `cd extension && npm run build`
