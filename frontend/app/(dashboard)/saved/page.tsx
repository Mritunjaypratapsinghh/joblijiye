"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { savedJobs as savedJobsApi, Job } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import {
  Bookmark,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Briefcase,
  Loader2,
  Trash2,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function SavedJobsPage() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadSavedJobs();
  }, [token]);

  const loadSavedJobs = async () => {
    try {
      setLoading(true);
      const data = await savedJobsApi.list(token!);
      setJobs(data.saved_jobs.map((s) => s.jobs).filter(Boolean));
    } catch (err) {
      toast.error("Failed to load saved jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId: string) => {
    try {
      await savedJobsApi.unsave(token!, jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job removed from saved");
    } catch (err) {
      toast.error("Failed to remove job");
    }
  };

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return null;
    const symbol = currency === "INR" ? "₹" : "$";
    const format = (n: number) => {
      if (currency === "INR") {
        if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
        return `${(n / 1000).toFixed(0)}K`;
      }
      return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString();
    };
    if (min && max) return `${symbol}${format(min)} - ${symbol}${format(max)}`;
    if (min) return `From ${symbol}${format(min)}`;
    return `Up to ${symbol}${format(max!)}`;
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case "linkedin": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "indeed": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "glassdoor": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Saved Jobs</h1>
          <p className="text-muted-foreground">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/jobs">Browse More Jobs</Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No saved jobs</h3>
            <p className="text-muted-foreground mb-4">
              Save jobs you're interested in to review them later.
            </p>
            <Button asChild>
              <Link href="/jobs">Browse Jobs</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="group">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                    {job.company.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{job.title}</h3>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <Building2 className="w-4 h-4" />
                          <span>{job.company}</span>
                        </div>
                      </div>
                      <Badge className={getSourceColor(job.source)}>{job.source}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      {job.job_type && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          <span>{job.job_type}</span>
                        </div>
                      )}
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                        </div>
                      )}
                      {job.posted_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(job.posted_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button asChild className="bg-gradient-to-r from-primary to-purple-600">
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                        Apply
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/jobs?generate=${job.id}`}>
                        <FileText className="w-4 h-4 mr-2" />
                        Resume
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleUnsave(job.id)}
                      className="text-red-500 hover:text-red-600 hover:border-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
