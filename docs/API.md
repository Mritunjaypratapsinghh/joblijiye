# API Documentation

## Base URL

- **Development**: `http://localhost:8000/api`
- **Production**: `https://yourapp-api.railway.app/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-02-11T10:00:00Z"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-02-11T10:00:00Z"
}
```

---

## Profile Endpoints

### Get Profile
```http
GET /api/profile
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "full_name": "John Doe",
  "phone": "+91-9876543210",
  "location": "Bangalore, India",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe",
  "portfolio_url": "https://johndoe.dev",
  "master_resume_url": "/uploads/resume.pdf",
  "skills": ["Python", "JavaScript", "React", "FastAPI"],
  "experience": [
    {
      "company": "Tech Corp",
      "title": "Senior Software Engineer",
      "start_date": "2022-01",
      "end_date": "present",
      "description": "Led development of microservices..."
    }
  ],
  "education": [
    {
      "institution": "IIT Delhi",
      "degree": "B.Tech Computer Science",
      "year": "2020"
    }
  ],
  "preferences": {
    "roles": ["Software Engineer", "Backend Developer"],
    "locations": ["Bangalore", "Remote"],
    "salary_min": 2000000,
    "companies": ["Google", "Meta", "Amazon"]
  }
}
```

### Update Profile
```http
PUT /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "phone": "+91-9876543210",
  "skills": ["Python", "JavaScript", "React"],
  "preferences": {
    "roles": ["Software Engineer"],
    "locations": ["Bangalore", "Remote"]
  }
}
```

### Upload Resume
```http
POST /api/profile/resume
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <resume.pdf>
```

**Response** (200):
```json
{
  "message": "Resume uploaded successfully",
  "url": "/uploads/resume_uuid.pdf",
  "parsed_data": {
    "skills_extracted": ["Python", "React", "AWS"],
    "experience_years": 5
  }
}
```

---

## Jobs Endpoints

### List Jobs
```http
GET /api/jobs?page=1&per_page=20&search=software+engineer&location=bangalore&company=google
Authorization: Bearer <token>
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 1) |
| per_page | int | Items per page (default: 20, max: 100) |
| search | string | Search in title and description |
| location | string | Filter by location |
| company | string | Filter by company name |
| source | string | Filter by source (linkedin, indeed, etc.) |
| posted_after | datetime | Jobs posted after this date |
| salary_min | int | Minimum salary |

**Response** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "company": "Google",
      "title": "Senior Software Engineer",
      "location": "Bangalore, India",
      "description": "We are looking for...",
      "salary_min": 3000000,
      "salary_max": 5000000,
      "job_type": "full-time",
      "apply_url": "https://careers.google.com/jobs/123",
      "source": "linkedin",
      "posted_at": "2026-02-10T10:00:00Z",
      "match_score": 85
    }
  ],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "pages": 8
}
```

### Get Job Details
```http
GET /api/jobs/:id
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "id": "uuid",
  "company": "Google",
  "title": "Senior Software Engineer",
  "location": "Bangalore, India",
  "description": "Full job description...",
  "salary_min": 3000000,
  "salary_max": 5000000,
  "job_type": "full-time",
  "experience_level": "senior",
  "apply_url": "https://careers.google.com/jobs/123",
  "source": "linkedin",
  "posted_at": "2026-02-10T10:00:00Z",
  "required_skills": ["Python", "Distributed Systems", "Kubernetes"],
  "match_score": 85,
  "matching_skills": ["Python", "Kubernetes"],
  "missing_skills": ["Distributed Systems"]
}
```

### Get Matched Jobs
```http
GET /api/jobs/matched?limit=10
Authorization: Bearer <token>
```

Returns jobs sorted by match score based on user profile.

---

## Resume Endpoints

### Generate Tailored Resume
```http
POST /api/resumes/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_id": "uuid"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "job_id": "uuid",
  "resume_json": {
    "summary": "Experienced software engineer with 5+ years...",
    "experience": [...],
    "skills": [...],
    "education": [...]
  },
  "resume_pdf_url": "/resumes/uuid.pdf",
  "ats_score": 87,
  "keywords_matched": ["Python", "microservices", "AWS"],
  "keywords_missing": ["Kubernetes"],
  "changes_made": [
    "Added 'microservices' keyword 3 times",
    "Highlighted AWS experience",
    "Reordered projects by relevance"
  ],
  "created_at": "2026-02-11T10:00:00Z"
}
```

### Get Resume
```http
GET /api/resumes/:id
Authorization: Bearer <token>
```

### Download Resume PDF
```http
GET /api/resumes/:id/pdf
Authorization: Bearer <token>
```

Returns PDF file.

### List Resume History
```http
GET /api/resumes/history?page=1&per_page=10
Authorization: Bearer <token>
```

---

## Application Endpoints

### List Applications
```http
GET /api/applications?status=applied&page=1
Authorization: Bearer <token>
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (saved, applied, interview, offer, rejected) |
| page | int | Page number |
| per_page | int | Items per page |

**Response** (200):
```json
{
  "items": [
    {
      "id": "uuid",
      "job": {
        "id": "uuid",
        "company": "Google",
        "title": "Senior Software Engineer",
        "location": "Bangalore"
      },
      "resume_id": "uuid",
      "status": "applied",
      "applied_at": "2026-02-11T10:00:00Z",
      "notes": "Applied via LinkedIn Easy Apply",
      "follow_up_date": "2026-02-18"
    }
  ],
  "total": 25,
  "page": 1,
  "per_page": 20
}
```

### Create Application
```http
POST /api/applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_id": "uuid",
  "resume_id": "uuid",
  "status": "applied",
  "notes": "Applied via LinkedIn"
}
```

### Update Application
```http
PATCH /api/applications/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "interview",
  "notes": "Phone screen scheduled for Feb 15"
}
```

### Delete Application
```http
DELETE /api/applications/:id
Authorization: Bearer <token>
```

### Get Analytics
```http
GET /api/applications/analytics
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "total_applications": 50,
  "by_status": {
    "saved": 10,
    "applied": 25,
    "interview": 8,
    "offer": 2,
    "rejected": 5
  },
  "response_rate": 30,
  "avg_response_time_days": 7,
  "top_companies": [
    {"company": "Google", "count": 5},
    {"company": "Meta", "count": 3}
  ],
  "applications_by_week": [
    {"week": "2026-W06", "count": 12},
    {"week": "2026-W05", "count": 8}
  ]
}
```

---

## Extension Endpoints

### Get Profile for Auto-fill
```http
GET /api/extension/profile
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+91-9876543210",
  "location": "Bangalore, India",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe",
  "skills": ["Python", "JavaScript", "React"],
  "experience_summary": "5 years of software development experience...",
  "education_summary": "B.Tech in Computer Science from IIT Delhi"
}
```

### Get Tailored Resume for Job
```http
GET /api/extension/resume/:job_id
Authorization: Bearer <token>
```

Returns resume data and PDF URL for the specified job.

### Report Application
```http
POST /api/extension/applied
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_url": "https://careers.google.com/jobs/123",
  "job_title": "Senior Software Engineer",
  "company": "Google",
  "resume_id": "uuid"
}
```

**Response** (200):
```json
{
  "message": "Application recorded",
  "application_id": "uuid"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request body",
  "errors": [
    {"field": "email", "message": "Invalid email format"}
  ]
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```
