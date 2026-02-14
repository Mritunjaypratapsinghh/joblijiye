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
  profile: (token: string) => fetchAPI("/auth/profile", { token }),
  updateProfile: (token: string, data: Record<string, unknown>) =>
    fetchAPI("/auth/profile", { method: "PATCH", token, body: JSON.stringify(data) }),
};

// Jobs
export const jobs = {
  list: (params?: { query?: string; source?: string; location?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set("query", params.query);
    if (params?.source) searchParams.set("source", params.source);
    if (params?.location) searchParams.set("location", params.location);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    return fetchAPI<JobListResponse>(`/jobs?${searchParams}`);
  },
  get: (id: string) => fetchAPI<Job>(`/jobs/${id}`),
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
  atsScore: (token: string, data: { resume_json: Record<string, unknown>; job_description: string }) =>
    fetchAPI("/resumes/ats-score", { method: "POST", token, body: JSON.stringify(data) }),
  coverLetter: (token: string, jobId: string) =>
    fetchAPI<{ cover_letter: string }>("/resumes/cover-letter", {
      method: "POST",
      token,
      body: JSON.stringify({ job_id: jobId }),
    }),
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
};

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
  job_type?: string;
  experience_level?: string;
  remote_type?: string;
  apply_url: string;
  posted_at?: string;
  scraped_at?: string;
  required_skills: string[];
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
  jobs?: Job;
}
