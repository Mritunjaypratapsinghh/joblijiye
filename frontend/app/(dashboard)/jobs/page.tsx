"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { jobs as jobsApi, Job, JobListResponse } from "@/lib/api";
import { toast } from "sonner";
import { 
  Search, 
  MapPin, 
  Building2, 
  Clock, 
  DollarSign, 
  ExternalLink,
  Briefcase,
  Filter,
  Sparkles,
  Loader2,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const sources = ["All", "LinkedIn", "Indeed", "Glassdoor"];
const ITEMS_PER_PAGE = 20;

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [jobsData, setJobsData] = useState<JobListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem("bookmarkedJobs");
    if (saved) setBookmarked(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [page, selectedSource]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await jobsApi.list({
        query: searchQuery || undefined,
        location: location || undefined,
        source: selectedSource !== "All" ? selectedSource.toLowerCase() : undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setJobsData(data);
    } catch (err) {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadJobs();
  };

  const handleScrape = async () => {
    if (!searchQuery.trim()) return;
    try {
      setScraping(true);
      const result = await jobsApi.scrape({ 
        query: searchQuery, 
        location: location || undefined,
        sources: selectedSource !== "All" ? [selectedSource.toLowerCase()] : undefined
      });
      toast.success(`Found ${result.scraped} jobs, saved ${result.saved} new`);
      setPage(1);
      await loadJobs();
    } catch (err) {
      toast.error("Failed to search jobs");
    } finally {
      setScraping(false);
    }
  };

  const toggleBookmark = (jobId: string) => {
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      localStorage.setItem("bookmarkedJobs", JSON.stringify([...next]));
      return next;
    });
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    const format = (n: number) => n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;
    if (min && max) return `$${format(min)} - $${format(max)}`;
    if (min) return `From $${format(min)}`;
    return `Up to $${format(max!)}`;
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case "linkedin": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "indeed": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "glassdoor": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const jobsList = jobsData?.jobs || [];
  const totalPages = jobsData?.total_pages || 1;
  const total = jobsData?.total || 0;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 p-6 border">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">AI-Powered Job Search</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Find Your Perfect Role</h1>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Job title, company, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 h-12 bg-background"
              />
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 h-12 bg-background"
              />
            </div>
            <Button 
              onClick={handleScrape} 
              disabled={scraping || !searchQuery.trim()}
              className="h-12 px-6 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search Jobs
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Filter by:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => (
            <Button
              key={source}
              variant={selectedSource === source ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedSource(source); setPage(1); }}
              className={selectedSource === source ? "bg-primary" : ""}
            >
              {source}
            </Button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{jobsList.length}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> jobs
        </p>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : jobsList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Try searching for a job title or company to get started.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {jobsList.map((job) => (
              <Card key={job.id} className="card-hover group">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                      {job.company.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Building2 className="w-4 h-4" />
                            <span>{job.company}</span>
                          </div>
                        </div>
                        <Badge className={getSourceColor(job.source)}>
                          {job.source}
                        </Badge>
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
                        {formatSalary(job.salary_min, job.salary_max) && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <DollarSign className="w-4 h-4" />
                            <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                          </div>
                        )}
                        {job.posted_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(job.posted_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.required_skills.slice(0, 5).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.required_skills.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{job.required_skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button asChild className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90">
                        <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                          Apply
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => toggleBookmark(job.id)}
                        className={bookmarked.has(job.id) ? "text-primary border-primary" : ""}
                      >
                        {bookmarked.has(job.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-10"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
