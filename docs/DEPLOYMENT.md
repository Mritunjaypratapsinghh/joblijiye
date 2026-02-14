# Deployment Guide

## Overview

Complete deployment using free tiers:
- **Frontend**: Vercel (Next.js)
- **Backend**: Railway (FastAPI)
- **Database**: Supabase (PostgreSQL)
- **Extension**: Load unpacked (Brave/Chrome)

**Total Cost: $0/month**

---

## Prerequisites

- GitHub account
- Node.js 18+ installed
- Python 3.11+ installed
- Brave/Chrome browser

---

## Step 1: Database Setup (Supabase)

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill details:
   - Name: `job-tracker`
   - Database Password: (save this!)
   - Region: Choose closest to you
5. Click "Create new project"
6. Wait for setup (~2 minutes)

### 1.2 Run Migrations

1. Go to SQL Editor (left sidebar)
2. Click "New query"
3. Paste the schema from `docs/DATABASE.md`
4. Click "Run"

### 1.3 Get Connection String

1. Go to Settings → Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password
4. Save for later:
   ```
   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

---

## Step 2: Backend Deployment (Railway)

### 2.1 Prepare Backend

Create `backend/requirements.txt`:
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic==2.5.3
pydantic-settings==2.1.0
httpx==0.26.0
python-jobspy==1.1.52
reportlab==4.0.8
groq==0.4.2
redis==5.0.1
celery==5.3.6
```

Create `backend/Procfile`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 2.2 Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Select the `backend` folder as root directory

### 2.3 Configure Environment Variables

In Railway dashboard, go to Variables and add:

```env
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
JWT_SECRET=your-super-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
GROQ_API_KEY=your-groq-api-key
CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:3000"]
```

### 2.4 Get Backend URL

After deployment, Railway provides a URL like:
```
https://job-tracker-backend-production.up.railway.app
```

Save this for frontend configuration.

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Prepare Frontend

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Create `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

### 3.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your repository
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
6. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.railway.app/api`
7. Click "Deploy"

### 3.3 Get Frontend URL

Vercel provides a URL like:
```
https://job-tracker.vercel.app
```

### 3.4 Update Backend CORS

Go back to Railway and update `CORS_ORIGINS`:
```
CORS_ORIGINS=["https://job-tracker.vercel.app"]
```

---

## Step 4: Groq API Setup

### 4.1 Get API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / Log in
3. Go to API Keys
4. Create new key
5. Copy and save the key

### 4.2 Add to Railway

In Railway Variables, add:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

---

## Step 5: Extension Setup

### 5.1 Configure API URL

Edit `extension/src/utils/api.js`:
```javascript
const API_BASE = 'https://your-backend.railway.app/api';
```

### 5.2 Build Extension

```bash
cd extension
npm install
npm run build
```

### 5.3 Load in Browser

1. Open Brave browser
2. Go to `brave://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `extension/dist` folder
6. Done!

---

## Step 6: Verify Deployment

### 6.1 Test Backend

```bash
curl https://your-backend.railway.app/api/health
# Should return: {"status": "healthy"}
```

### 6.2 Test Frontend

1. Open `https://job-tracker.vercel.app`
2. Register a new account
3. Login
4. Verify dashboard loads

### 6.3 Test Extension

1. Click extension icon
2. Login with same credentials
3. Go to a LinkedIn job page
4. Verify auto-fill button appears

---

## Environment Variables Summary

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase connection string | `postgresql://...` |
| `JWT_SECRET` | Secret for JWT signing | Random 32+ char string |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry | `7` |
| `GROQ_API_KEY` | Groq API key | `gsk_xxx` |
| `CORS_ORIGINS` | Allowed origins | `["https://..."]` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://...railway.app/api` |

### Extension

| Variable | Location | Description |
|----------|----------|-------------|
| `API_BASE` | `src/utils/api.js` | Backend API URL |

---

## Free Tier Limits

| Service | Limit | Sufficient For |
|---------|-------|----------------|
| **Vercel** | 100GB bandwidth/month | ~1M page views |
| **Railway** | $5 credit (one-time) | ~500 hours |
| **Supabase** | 500MB database | ~100K jobs |
| **Groq** | 14,400 requests/day | ~250 resumes/day |

---

## Monitoring

### Railway Logs

```bash
# View logs in Railway dashboard
# Or use Railway CLI
railway logs
```

### Vercel Logs

1. Go to Vercel dashboard
2. Select project
3. Click "Deployments"
4. View function logs

### Supabase Logs

1. Go to Supabase dashboard
2. Select project
3. Click "Logs" in sidebar

---

## Updating Deployments

### Backend

```bash
git add .
git commit -m "Update backend"
git push origin main
# Railway auto-deploys
```

### Frontend

```bash
git add .
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys
```

### Extension

```bash
cd extension
npm run build
# Go to brave://extensions/
# Click refresh icon on extension
```

---

## Troubleshooting

### Backend not starting

1. Check Railway logs for errors
2. Verify all environment variables are set
3. Ensure `requirements.txt` is complete

### Database connection failed

1. Verify `DATABASE_URL` is correct
2. Check Supabase project is active
3. Ensure password has no special characters that need escaping

### CORS errors

1. Verify `CORS_ORIGINS` includes your frontend URL
2. Check for trailing slashes
3. Ensure HTTPS is used

### Extension not connecting

1. Verify `API_BASE` URL is correct
2. Check browser console for errors
3. Ensure backend is running

---

## Backup & Recovery

### Database Backup

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup.sql

# Or use Supabase dashboard
# Settings → Database → Backups
```

### Code Backup

All code is in GitHub - no additional backup needed.

---

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use HTTPS for all URLs
- [ ] Keep API keys secret (never commit to git)
- [ ] Enable Supabase Row Level Security
- [ ] Regularly rotate API keys
- [ ] Monitor for unusual activity
