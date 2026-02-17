const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type FetchOptions = RequestInit & { token?: string };

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    // Auto-logout on invalid token
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; full_name: string }) =>
    fetchAPI<{ access_token: string }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchAPI<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  google: (credential: string) =>
    fetchAPI<{ access_token: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  me: (token: string) => fetchAPI<{ id: string; email: string; full_name: string }>("/auth/me", { token }),
  profile: (token: string) => fetchAPI<ProfileData>("/auth/profile", { token }),
  updateProfile: (token: string, data: ProfileData | Record<string, unknown>) =>
    fetchAPI("/auth/profile", { method: "PATCH", token, body: JSON.stringify(data) }),
  forgotPassword: (email: string) =>
    fetchAPI<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    fetchAPI<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
};

// Jobs
export const jobs = {
  list: (params?: { 
    query?: string; 
    source?: string; 
    location?: string; 
    remote_type?: string;
    experience_level?: string;
    sort_by?: string;
    page?: number; 
    limit?: number 
  }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set("query", params.query);
    if (params?.source) searchParams.set("source", params.source);
    if (params?.location) searchParams.set("location", params.location);
    if (params?.remote_type) searchParams.set("remote_type", params.remote_type);
    if (params?.experience_level) searchParams.set("experience_level", params.experience_level);
    if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    return fetchAPI<JobListResponse>(`/jobs?${searchParams}`, token ? { token } : {});
  },
  matched: (token: string, limit?: number) =>
    fetchAPI<{ jobs: Job[] }>(`/jobs/matched${limit ? `?limit=${limit}` : ""}`, { token }),
  get: (id: string) => fetchAPI<Job>(`/jobs/${id}`),
  getFormattedDescription: (id: string) => fetchAPI<{ formatted: string | null }>(`/jobs/${id}/formatted-description`),
  scrape: (data: { query: string; location?: string; sources?: string[] }) =>
    fetchAPI<{ scraped: number; saved: number }>("/jobs/scrape", { method: "POST", body: JSON.stringify(data) }),
};

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Resumes
export const resumes = {
  list: async (token: string) => {
    const data = await fetchAPI<Resume[] | { resumes: Resume[] }>("/resumes", { token });
    return Array.isArray(data) ? data : (data.resumes || []);
  },
  generate: (token: string, jobId: string) =>
    fetchAPI("/resumes/generate", { method: "POST", token, body: JSON.stringify({ job_id: jobId }) }),
  createFromProfile: (token: string) =>
    fetchAPI("/resumes/from-profile", { method: "POST", token }),
  atsScore: (token: string, data: { resume_json: Record<string, unknown>; job_description: string }) =>
    fetchAPI("/resumes/ats-score", { method: "POST", token, body: JSON.stringify(data) }),
  coverLetter: (token: string, jobId: string) =>
    fetchAPI<{ cover_letter: string }>("/resumes/cover-letter", {
      method: "POST",
      token,
      body: JSON.stringify({ job_id: jobId }),
    }),
  upload: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/resumes/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail);
    }
    return res.json();
  },
  delete: (token: string, id: string) =>
    fetchAPI(`/resumes/${id}`, { method: "DELETE", token }),
};

// Profile
export const profile = {
  importLinkedIn: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/auth/profile/import-linkedin`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Import failed" }));
      throw new Error(error.detail || "Import failed");
    }
    return res.json();
  },
};

// Applications
export const applications = {
  list: async (token: string) => {
    const data = await fetchAPI<Application[] | { applications: Application[] }>("/applications", { token });
    return Array.isArray(data) ? data : (data.applications || []);
  },
  create: (token: string, data: { job_id: string; resume_id?: string }) =>
    fetchAPI("/applications", { method: "POST", token, body: JSON.stringify(data) }),
  update: (token: string, id: string, data: { status?: string; notes?: string }) =>
    fetchAPI(`/applications/${id}`, { method: "PATCH", token, body: JSON.stringify(data) }),
};

// Analytics & Tracking
export const analytics = {
  trackView: (token: string, job_id: string, source?: string) =>
    fetchAPI("/analytics/track/view", { method: "POST", token, body: JSON.stringify({ job_id, source }) }),
  trackClick: (token: string, job_id: string, apply_url: string) =>
    fetchAPI("/analytics/track/click", { method: "POST", token, body: JSON.stringify({ job_id, apply_url }) }),
  confirmApply: (token: string, job_id: string, applied: boolean) =>
    fetchAPI("/analytics/track/confirm", { method: "POST", token, body: JSON.stringify({ job_id, applied }) }),
  getPending: (token: string) =>
    fetchAPI<{ pending: PendingConfirmation[] }>("/analytics/pending", { token }),
  getFunnel: (token: string) =>
    fetchAPI<FunnelData>("/analytics/funnel", { token }),
  getSources: (token: string) =>
    fetchAPI<{ sources: SourcePerformance[] }>("/analytics/sources", { token }),
  getTimeline: (token: string, days?: number) =>
    fetchAPI<{ timeline: TimelineData[] }>(`/analytics/timeline${days ? `?days=${days}` : ""}`, { token }),
  getDashboard: (token: string) =>
    fetchAPI<AnalyticsDashboard>("/analytics/dashboard", { token }),
};

export interface PendingConfirmation {
  id: string;
  job_id: string;
  clicked_at: string;
  jobs: { title: string; company: string };
}

export interface FunnelData {
  viewed: number;
  clicked: number;
  applied: number;
  interviewing: number;
  offers: number;
}

export interface SourcePerformance {
  source: string;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
}

export interface TimelineData {
  date: string;
  views: number;
  clicks: number;
  applied: number;
}

export interface AnalyticsDashboard {
  funnel: FunnelData;
  sources: SourcePerformance[];
  timeline: TimelineData[];
  pending_confirmations: number;
  pending_jobs: PendingConfirmation[];
}

// Notifications
export const notifications = {
  list: (token: string, params?: { limit?: number; unread_only?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.unread_only) searchParams.set("unread_only", "true");
    return fetchAPI<{ notifications: Notification[]; unread_count: number }>(`/notifications?${searchParams}`, { token });
  },
  markRead: (token: string, id: string) =>
    fetchAPI(`/notifications/${id}`, { method: "PATCH", token, body: JSON.stringify({ read: true }) }),
  markAllRead: (token: string) =>
    fetchAPI("/notifications/mark-all-read", { method: "POST", token }),
  delete: (token: string, id: string) =>
    fetchAPI(`/notifications/${id}`, { method: "DELETE", token }),
};

// Dashboard
export const dashboard = {
  stats: (token: string) =>
    fetchAPI<DashboardStats>("/dashboard/stats", { token }),
  analytics: (token: string) =>
    fetchAPI<Analytics>("/dashboard/analytics", { token }),
  salaryInsights: (token: string) =>
    fetchAPI<SalaryInsights>("/dashboard/salary-insights", { token }),
};

export interface SalaryInsights {
  has_data: boolean;
  message?: string;
  overall?: { min: number; max: number; avg: number; count: number };
  by_level?: Record<string, { min: number; max: number; avg: number; count: number }>;
  top_companies?: Array<{ company: string; min: number; max: number; avg: number; count: number }>;
  distribution?: Record<string, number>;
  total_jobs_with_salary?: number;
}

export interface Analytics {
  status_distribution: Record<string, number>;
  timeline: Array<{ date: string; count: number }>;
  funnel: Array<{ stage: string; count: number; percentage: number }>;
  metrics: {
    total_applications: number;
    response_rate: number;
    interview_rate: number;
    offer_rate: number;
    avg_response_days: number;
  };
}

// Saved Jobs (Bookmarks)
export const savedJobs = {
  list: (token: string) =>
    fetchAPI<{ saved_jobs: Array<{ job_id: string; jobs: Job }>; count: number }>("/saved-jobs", { token }),
  getIds: (token: string) =>
    fetchAPI<{ job_ids: string[] }>("/saved-jobs/ids", { token }),
  save: (token: string, jobId: string) =>
    fetchAPI("/saved-jobs", { method: "POST", token, body: JSON.stringify({ job_id: jobId }) }),
  unsave: (token: string, jobId: string) =>
    fetchAPI(`/saved-jobs/${jobId}`, { method: "DELETE", token }),
  sync: (token: string, jobIds: string[]) =>
    fetchAPI<{ synced: number }>("/saved-jobs/sync", { method: "POST", token, body: JSON.stringify({ job_ids: jobIds }) }),
};

// Job Alerts
export const alerts = {
  list: (token: string) =>
    fetchAPI<{ alerts: JobAlert[]; count: number }>("/alerts", { token }),
  create: (token: string, data: Omit<JobAlert, "id" | "user_id" | "created_at">) =>
    fetchAPI<{ alert: JobAlert }>("/alerts", { method: "POST", token, body: JSON.stringify(data) }),
  update: (token: string, id: string, data: Partial<JobAlert>) =>
    fetchAPI<{ alert: JobAlert }>(`/alerts/${id}`, { method: "PATCH", token, body: JSON.stringify(data) }),
  delete: (token: string, id: string) =>
    fetchAPI(`/alerts/${id}`, { method: "DELETE", token }),
};

export interface JobAlert {
  id: string;
  user_id: string;
  keywords: string[];
  locations: string[];
  job_types: string[];
  remote_only: boolean;
  min_salary?: number;
  frequency: string;
  is_active: boolean;
  last_sent_at?: string;
  created_at: string;
}

// Types
export interface DashboardStats {
  total_applications: number;
  in_progress: number;
  interviews: number;
  offers: number;
  rejected: number;
  applied: number;
  resumes_count: number;
  saved_jobs_count: number;
  recent_applications: {
    id: string;
    company: string;
    role: string;
    status: string;
    date: string;
  }[];
}

// Types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  external_id?: string;
  source: string;
  company: string;
  title: string;
  location?: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  job_type?: string;
  experience_level?: string;
  remote_type?: string;
  apply_url: string;
  posted_at?: string;
  scraped_at?: string;
  required_skills: string[];
  match_score?: number;
  match_label?: string;
}

export interface Resume {
  id: string;
  user_id: string;
  job_id?: string;
  resume_json: Record<string, unknown>;
  ats_score?: number;
  keywords_matched: string[];
  keywords_missing: string[];
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  resume_id?: string;
  status: string;
  applied_at?: string;
  notes?: string;
  follow_up_date?: string;
  jobs?: Job;
}

export interface ProfileData {
  id?: string;
  user_id?: string;
  full_name?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  skills?: string[];
  experience?: Array<{
    id?: string;
    company: string;
    title: string;
    location?: string;
    start_date: string;
    end_date: string;
    current?: boolean;
    description: string;
  }>;
  education?: Array<{
    id?: string;
    institution: string;
    degree: string;
    field: string;
    start_year: string;
    end_year: string;
    gpa?: string;
  }>;
}
