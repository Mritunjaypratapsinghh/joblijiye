# JobLijiye

> A unified job application platform that aggregates jobs, generates ATS-optimized resumes using AI, and auto-fills applications via browser extension.

## Features

- 🔍 **Job Aggregation** - Scrapes jobs from LinkedIn, Indeed, Glassdoor, and more
- 🤖 **AI Resume Optimization** - Generates tailored resumes for each job with ATS scoring
- ⚡ **Auto-Fill Extension** - Browser extension auto-fills job applications in one click
- 📊 **Application Tracking** - Track all applications in one dashboard

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, TailwindCSS, shadcn/ui |
| Backend | FastAPI, Python 3.11 |
| Database | PostgreSQL (Supabase) |
| AI | Groq API (Llama 3) |
| Extension | Chrome Manifest V3 |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Brave/Chrome browser

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/job-tracker.git
cd job-tracker
```

### 2. Backend Setup

```bash
cd backend

# Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create venv and install dependencies
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv sync

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run server
uv run uvicorn main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Run dev server
npm run dev
```

### 4. Extension Setup

```bash
cd extension
npm install
npm run build

# Load in Brave:
# 1. Go to brave://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select extension/dist folder
```

## Documentation

- [Project Plan](docs/PROJECT_PLAN.md) - Complete project overview
- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [API Documentation](docs/API.md) - REST API endpoints
- [Database Schema](docs/DATABASE.md) - PostgreSQL tables and queries
- [Extension Guide](docs/EXTENSION.md) - Browser extension details
- [Deployment Guide](docs/DEPLOYMENT.md) - Deploy to production (free)

## Project Structure

```
job-tracker/
├── frontend/          # Next.js 15 dashboard
├── backend/           # FastAPI server
├── extension/         # Browser extension
├── docs/              # Documentation
└── README.md
```

## Cost

**$0/month** using free tiers:
- Vercel (frontend)
- Railway (backend)
- Supabase (database)
- Groq (AI)

## License

MIT

## Contributing

This is a personal project, but feel free to fork and customize for your own use!
