export type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  url: string;
  source: string;
  created_at: string;
};

export type Application = {
  id: string;
  job_id: string;
  user_id: string;
  status: ApplicationStatus;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
};

export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offered" | "rejected";

export type Resume = {
  id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
};

export type ATSScore = {
  score: number;
  suggestions: string[];
  matched_keywords: string[];
  missing_keywords: string[];
};

export type User = {
  id: string;
  email: string;
  name: string;
};
