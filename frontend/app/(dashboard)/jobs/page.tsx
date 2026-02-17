"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobs as jobsApi, resumes as resumesApi, savedJobs as savedJobsApi, analytics, Job, JobListResponse, PendingConfirmation } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { 
  Search, 
  MapPin,
  Clock, 
  DollarSign, 
  ExternalLink,
  Briefcase,
  Sparkles,
  Loader2,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  Target,
  CheckCircle2,
  AlertCircle,
  Layout,
  History,
  LayoutGrid,
  List,
  Building2,
  Zap
} from "lucide-react";
import { ResumePDFDocument, PDFDownloadLink, TEMPLATES, TemplateType } from "@/components/resume-pdf";

const sources = ["All", "LinkedIn", "Indeed", "Glassdoor", "Lever", "Greenhouse"];
const remoteTypes = ["All", "Remote", "Hybrid", "Onsite"];
const experienceLevels = ["All", "Entry", "Mid", "Senior", "Lead"];
const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "match", label: "Best Match" },
  { value: "salary_desc", label: "Highest Salary" },
  { value: "salary_asc", label: "Lowest Salary" },
];
const ITEMS_PER_PAGE = 20;
const MAX_SEARCH_HISTORY = 10;

// Company logo with fallback
function CompanyLogo({ company, size = "md" }: { company: string; size?: "sm" | "md" | "lg" }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-14 h-14 text-base" };
  
  // Try multiple logo sources
  const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const logoUrl = `https://logo.clearbit.com/${cleanCompany}.com`;
  
  const fallback = (
    <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border border-violet-200 dark:border-violet-800 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400 shrink-0`}>
      {company.charAt(0).toUpperCase()}
    </div>
  );
  
  if (error) return fallback;
  
  return (
    <div className={`${sizeClasses[size]} relative shrink-0`}>
      {!loaded && fallback}
      <img
        src={logoUrl}
        alt={company}
        className={`${sizeClasses[size]} rounded-xl object-contain bg-white border border-gray-200 dark:border-gray-700 p-1.5 absolute inset-0 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

function JobCardSkeleton({ view }: { view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="flex items-center gap-4 p-4 bg-card rounded-xl border">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <div className="hidden md:flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    );
  }
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

interface GeneratedResume {
  id: string;
  resume_json: Record<string, unknown>;
  ats_score: number;
  keywords_matched: string[];
  keywords_missing: string[];
  suggestions: string[];
}

interface SearchHistoryItem {
  query: string;
  location?: string;
  timestamp: number;
}

export default function JobsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedRemote, setSelectedRemote] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("modern");
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [jobsData, setJobsData] = useState<JobListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Check for pending confirmations on mount and when returning to page
  const checkPendingConfirmations = useCallback(async () => {
    if (!token) return;
    try {
      const { pending } = await analytics.getPending(token);
      if (pending.length > 0) {
        setPendingConfirmations(pending);
        setShowConfirmModal(true);
      }
    } catch (err) {
      console.error("Failed to check pending confirmations:", err);
    }
  }, [token]);

  useEffect(() => {
    // Load bookmarks from localStorage first, then sync with DB
    const saved = localStorage.getItem("bookmarkedJobs");
    if (saved) setBookmarked(new Set(JSON.parse(saved)));
    
    // Load search history
    const history = localStorage.getItem("searchHistory");
    if (history) setSearchHistory(JSON.parse(history));
    
    // Sync with database if logged in
    if (token) {
      syncBookmarks();
      checkPendingConfirmations();
    }

    // Check for pending when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && token) {
        checkPendingConfirmations();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [token]);

  const syncBookmarks = async () => {
    if (!token) return;
    try {
      // Get bookmarks from DB
      const { job_ids } = await savedJobsApi.getIds(token);
      const dbSet = new Set(job_ids);
      
      // Merge with localStorage
      const localStr = localStorage.getItem("bookmarkedJobs");
      const localIds: string[] = localStr ? JSON.parse(localStr) : [];
      
      // Sync local to DB (new bookmarks)
      const toSync = localIds.filter(id => !dbSet.has(id));
      if (toSync.length > 0) {
        await savedJobsApi.sync(token, toSync);
      }
      
      // Merge both sets
      const merged = new Set([...job_ids, ...localIds]);
      setBookmarked(merged);
      localStorage.setItem("bookmarkedJobs", JSON.stringify([...merged]));
    } catch (err) {
      console.error("Failed to sync bookmarks:", err);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [page, selectedSource, selectedRemote, selectedLevel, sortBy]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await jobsApi.list({
        query: searchQuery || undefined,
        location: location || undefined,
        source: selectedSource !== "All" ? selectedSource.toLowerCase() : undefined,
        remote_type: selectedRemote !== "All" ? selectedRemote.toLowerCase() : undefined,
        experience_level: selectedLevel !== "All" ? selectedLevel.toLowerCase() : undefined,
        sort_by: sortBy,
        page,
        limit: ITEMS_PER_PAGE,
      }, token || undefined);
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
    
    // Save to search history
    const newHistory: SearchHistoryItem[] = [
      { query: searchQuery, location: location || undefined, timestamp: Date.now() },
      ...searchHistory.filter(h => h.query !== searchQuery || h.location !== location)
    ].slice(0, MAX_SEARCH_HISTORY);
    setSearchHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    
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

  const applySearchHistory = (item: SearchHistoryItem) => {
    setSearchQuery(item.query);
    setLocation(item.location || "");
    setPage(1);
    loadJobs();
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  const toggleBookmark = async (jobId: string) => {
    const isCurrentlyBookmarked = bookmarked.has(jobId);
    
    // Optimistic update
    setBookmarked(prev => {
      const next = new Set(prev);
      if (isCurrentlyBookmarked) next.delete(jobId);
      else next.add(jobId);
      localStorage.setItem("bookmarkedJobs", JSON.stringify([...next]));
      return next;
    });

    // Sync with DB if logged in
    if (token) {
      try {
        if (isCurrentlyBookmarked) {
          await savedJobsApi.unsave(token, jobId);
        } else {
          await savedJobsApi.save(token, jobId);
        }
      } catch (err) {
        // Revert on error
        setBookmarked(prev => {
          const next = new Set(prev);
          if (isCurrentlyBookmarked) next.add(jobId);
          else next.delete(jobId);
          localStorage.setItem("bookmarkedJobs", JSON.stringify([...next]));
          return next;
        });
        toast.error("Failed to save bookmark");
      }
    }
  };

  const handleApplyClick = (job: Job) => {
    // Track the click (fire and forget - don't block the redirect)
    if (token) {
      analytics.trackClick(token, job.id, job.apply_url).catch(() => {});
    }
    // Open apply URL in new tab immediately
    window.open(job.apply_url, "_blank", "noopener,noreferrer");
  };

  const handleConfirmApplication = async (jobId: string, applied: boolean) => {
    if (!token) return;
    try {
      await analytics.confirmApply(token, jobId, applied);
      setPendingConfirmations(prev => prev.filter(p => p.job_id !== jobId));
      if (applied) {
        toast.success("Application tracked!");
      }
    } catch (err) {
      console.error("Failed to confirm application:", err);
    }
  };

  const handleGenerateResume = async (job: Job) => {
    if (!token) {
      toast.error("Please login to generate resume");
      return;
    }
    setGeneratingFor(job.id);
    setSelectedJob(job);
    try {
      const result = await resumesApi.generate(token, job.id);
      setGeneratedResume(result as GeneratedResume);
      toast.success("Resume generated successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate resume";
      toast.error(message);
      setSelectedJob(null);
    } finally {
      setGeneratingFor(null);
    }
  };

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return null;
    const symbol = currency === "INR" ? "₹" : "$";
    const format = (n: number) => {
      if (currency === "INR") {
        if (n >= 10000000) return `${(n/10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `${(n/100000).toFixed(1)}L`;
        return `${(n/1000).toFixed(0)}K`;
      }
      return n >= 1000 ? `${(n/1000).toFixed(0)}K` : n.toString();
    };
    if (min && max) return `${symbol}${format(min)} - ${symbol}${format(max)}`;
    if (min) return `From ${symbol}${format(min)}`;
    return `Up to ${symbol}${format(max!)}`;
  };

  const formatJobDescription = (text: string) => {
    // Escape HTML
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Split into lines and process
    const lines = html.split('\n');
    const result: string[] = [];
    let inList = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push('<br/>');
        continue;
      }
      
      // Check if it's a bullet point
      const bulletMatch = trimmed.match(/^[-•●▪◦]\s*(.+)$/);
      if (bulletMatch) {
        if (!inList) { result.push('<ul class="list-disc pl-4 my-2 space-y-1">'); inList = true; }
        result.push(`<li>${bulletMatch[1]}</li>`);
        continue;
      }
      
      // Check if it's a header (ends with : or all caps short line)
      if ((trimmed.endsWith(':') && trimmed.length < 60) || (trimmed === trimmed.toUpperCase() && trimmed.length < 40 && trimmed.length > 2)) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push(`<h4 class="font-semibold text-foreground mt-3 mb-1">${trimmed}</h4>`);
        continue;
      }
      
      // Regular text
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<p class="mb-2">${trimmed}</p>`);
    }
    
    if (inList) result.push('</ul>');
    return result.join('');
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case "linkedin": return "bg-[#0A66C2] text-white";
      case "indeed": return "bg-[#2164F3] text-white";
      case "glassdoor": return "bg-[#0CAA41] text-white";
      case "lever": return "bg-orange-500 text-white";
      case "greenhouse": return "bg-teal-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getRemoteColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "remote": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "hybrid": return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "onsite": return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default: return "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
  };

  const jobsList = jobsData?.jobs || [];
  const totalPages = jobsData?.total_pages || 1;
  const total = jobsData?.total || 0;

  return (
    <div className="space-y-6">
      {/* Hero Search Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full">
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span className="text-xs font-medium text-white/90">AI-Powered Search</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Find Your Dream Job</h1>
          <p className="text-white/70 text-sm mb-6">Search across LinkedIn, Indeed, Glassdoor and more</p>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Job title, skills, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                className="pl-12 h-12 bg-white border-0 text-gray-900 placeholder:text-gray-500 rounded-xl shadow-lg"
              />
            </div>
            <div className="relative md:w-52">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                className="pl-12 h-12 bg-white border-0 text-gray-900 placeholder:text-gray-500 rounded-xl shadow-lg"
              />
            </div>
            <Button 
              onClick={handleScrape} 
              disabled={scraping || !searchQuery.trim()}
              size="lg"
              className="h-12 px-8 bg-white text-violet-700 hover:bg-gray-100 rounded-xl shadow-lg font-semibold"
            >
              {scraping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span className="ml-2">{scraping ? "Searching..." : "Search Jobs"}</span>
            </Button>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <History className="w-4 h-4 text-white/50" />
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 4).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => applySearchHistory(item)}
                    className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/90 rounded-full backdrop-blur-sm transition-colors"
                  >
                    {item.query}{item.location && ` • ${item.location}`}
                  </button>
                ))}
                <button onClick={clearSearchHistory} className="px-2 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Select value={selectedSource} onValueChange={(v) => { setSelectedSource(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 rounded-lg bg-background"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              {sources.map((s) => <SelectItem key={s} value={s}>{s === "All" ? "All Sources" : s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedRemote} onValueChange={(v) => { setSelectedRemote(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-9 rounded-lg bg-background"><SelectValue placeholder="Work Type" /></SelectTrigger>
            <SelectContent>
              {remoteTypes.map((t) => <SelectItem key={t} value={t}>{t === "All" ? "All Types" : t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedLevel} onValueChange={(v) => { setSelectedLevel(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 rounded-lg bg-background"><SelectValue placeholder="Experience" /></SelectTrigger>
            <SelectContent>
              {experienceLevels.map((l) => <SelectItem key={l} value={l}>{l === "All" ? "All Levels" : l}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-9 rounded-lg bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{total > 0 ? `${total} jobs` : "No jobs"}</span>
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
          {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} view={viewMode} />)}
        </div>
      ) : jobsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-6">
            <Briefcase className="w-10 h-10 text-violet-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Search for a job title, skill, or company to discover opportunities across multiple platforms.
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="space-y-2">
          {jobsList.map((job) => (
            <div
              key={job.id}
              className="group flex items-center gap-4 p-4 bg-card hover:bg-accent/50 rounded-xl border hover:border-violet-200 dark:hover:border-violet-800 transition-all cursor-pointer"
              onClick={() => router.push(`/jobs/${job.id}`)}
            >
              <CompanyLogo company={job.company} size="md" />
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                  {job.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{job.company}</span>
                  {job.location && (
                    <>
                      <span>•</span>
                      <span className="truncate">{job.location}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                {job.match_score !== undefined && job.match_score !== null && (
                  <Badge className={`text-xs font-medium ${
                    job.match_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    job.match_score >= 60 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    job.match_score >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    <Target className="w-3 h-3 mr-1" />
                    {job.match_score}% Match
                  </Badge>
                )}
                {(job.salary_min || job.salary_max) && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                  </Badge>
                )}
                {job.remote_type && (
                  <Badge variant="outline" className={`text-xs border ${getRemoteColor(job.remote_type)}`}>
                    {job.remote_type}
                  </Badge>
                )}
                <Badge className={`text-[10px] ${getSourceColor(job.source)}`}>{job.source}</Badge>
              </div>

              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => toggleBookmark(job.id)}
                >
                  {bookmarked.has(job.id) ? <BookmarkCheck className="w-4 h-4 text-violet-500" /> : <Bookmark className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleGenerateResume(job)}
                  disabled={generatingFor === job.id}
                >
                  {generatingFor === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </Button>
                <Button size="sm" className="h-8 bg-violet-600 hover:bg-violet-700" onClick={() => handleApplyClick(job)}>
                  Apply
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobsList.map((job) => (
            <Card key={job.id} className="group overflow-hidden hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800 transition-all cursor-pointer" onClick={() => router.push(`/jobs/${job.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <CompanyLogo company={job.company} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                      {job.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{job.company}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 -mr-2 -mt-1"
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(job.id); }}
                  >
                    {bookmarked.has(job.id) ? <BookmarkCheck className="w-4 h-4 text-violet-500" /> : <Bookmark className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {job.location && (
                    <Badge variant="outline" className="text-xs font-normal">
                      <MapPin className="w-3 h-3 mr-1" />{job.location}
                    </Badge>
                  )}
                  {job.remote_type && (
                    <Badge variant="outline" className={`text-xs font-normal border ${getRemoteColor(job.remote_type)}`}>
                      {job.remote_type}
                    </Badge>
                  )}
                </div>

                {/* Match Score - shown prominently if available */}
                {job.match_score !== undefined && job.match_score !== null && (
                  <div className={`mb-3 p-2.5 rounded-lg border ${
                    job.match_score >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" :
                    job.match_score >= 60 ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" :
                    job.match_score >= 40 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" :
                    "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className={`flex items-center gap-2 ${
                      job.match_score >= 80 ? "text-emerald-700 dark:text-emerald-400" :
                      job.match_score >= 60 ? "text-blue-700 dark:text-blue-400" :
                      job.match_score >= 40 ? "text-amber-700 dark:text-amber-400" :
                      "text-gray-600 dark:text-gray-400"
                    }`}>
                      <Target className="w-4 h-4" />
                      <span className="font-semibold text-sm">{job.match_score}% {job.match_label || "Match"}</span>
                    </div>
                  </div>
                )}

                {/* Salary - shown prominently if available */}
                {(job.salary_min || job.salary_max) && (
                  <div className="mb-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-sm">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                    </div>
                  </div>
                )}

                {/* Skills */}
                {job.required_skills && job.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.required_skills.slice(0, 4).map((skill, i) => (
                      <span key={i} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{skill}</span>
                    ))}
                    {job.required_skills.length > 4 && (
                      <span className="text-[11px] text-violet-600 dark:text-violet-400">+{job.required_skills.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] px-2 ${getSourceColor(job.source)}`}>{job.source}</Badge>
                    {job.posted_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(job.posted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => handleGenerateResume(job)}
                    disabled={generatingFor === job.id}
                  >
                    {generatingFor === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span className="ml-1.5">AI Resume</span>
                  </Button>
                  <Button size="sm" className="flex-1 h-9 bg-violet-600 hover:bg-violet-700" onClick={() => handleApplyClick(job)}>
                    Apply <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && jobsList.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "ghost"}
                  size="sm"
                  className={`h-9 w-9 p-0 ${page === pageNum ? "bg-violet-600 hover:bg-violet-700" : ""}`}
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
            className="h-9 px-3"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Generated Resume Modal */}
      {generatedResume && selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setGeneratedResume(null); setSelectedJob(null); }}>
          <Card className="w-full max-w-lg max-h-[85vh] overflow-auto border-0 shadow-2xl" onClick={e => e.stopPropagation()}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="font-semibold text-lg">Resume Generated</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedJob.title} at {selectedJob.company}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1" onClick={() => { setGeneratedResume(null); setSelectedJob(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* ATS Score */}
              <div className={`flex items-center justify-between p-4 rounded-xl mb-5 ${
                generatedResume.ats_score >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" :
                generatedResume.ats_score >= 60 ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" : 
                "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
              }`}>
                <div className="flex items-center gap-3">
                  <Target className={`w-5 h-5 ${
                    generatedResume.ats_score >= 80 ? "text-emerald-600" :
                    generatedResume.ats_score >= 60 ? "text-amber-600" : "text-red-600"
                  }`} />
                  <div>
                    <p className="text-sm font-medium">ATS Compatibility Score</p>
                    <p className="text-xs text-muted-foreground">How well your resume matches the job</p>
                  </div>
                </div>
                <span className={`text-3xl font-bold ${
                  generatedResume.ats_score >= 80 ? "text-emerald-600" :
                  generatedResume.ats_score >= 60 ? "text-amber-600" : "text-red-600"
                }`}>{generatedResume.ats_score}</span>
              </div>

              {/* Keywords */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />Keywords Matched
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {generatedResume.keywords_matched.slice(0, 6).map((kw, i) => (
                      <Badge key={i} className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{kw}</Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 mb-2">
                    <AlertCircle className="w-3.5 h-3.5" />Missing Keywords
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {generatedResume.keywords_missing.slice(0, 6).map((kw, i) => (
                      <Badge key={i} className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{kw}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Template Selector */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
                  <Layout className="w-4 h-4" />Choose Template
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setSelectedTemplate(t.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedTemplate === t.value 
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30" 
                          : "border-border hover:border-violet-300 dark:hover:border-violet-700"
                      }`}
                    >
                      <p className="text-xs font-semibold">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => window.location.href = "/resumes"}>
                  View All Resumes
                </Button>
                <PDFDownloadLink
                  document={<ResumePDFDocument data={generatedResume.resume_json} template={selectedTemplate} />}
                  fileName={`resume-${selectedJob.company}-${selectedTemplate}.pdf`}
                  className="flex-1"
                >
                  {({ loading: pdfLoading }) => (
                    <Button className="w-full bg-violet-600 hover:bg-violet-700" disabled={pdfLoading}>
                      {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      <span className="ml-2">Download PDF</span>
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Job Details Modal */}
      {viewingJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingJob(null)}>
          <Card className="w-full max-w-2xl max-h-[85vh] overflow-auto border-0 shadow-2xl" onClick={e => e.stopPropagation()}>
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-5">
                <CompanyLogo company={viewingJob.company} size="lg" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-xl leading-tight">{viewingJob.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{viewingJob.company}</span>
                    <Badge className={`text-[10px] ${getSourceColor(viewingJob.source)}`}>{viewingJob.source}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setViewingJob(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                {viewingJob.location && (
                  <Badge variant="outline" className="text-xs py-1.5 px-3">
                    <MapPin className="w-3.5 h-3.5 mr-1.5" />{viewingJob.location}
                  </Badge>
                )}
                {viewingJob.remote_type && (
                  <Badge variant="outline" className={`text-xs py-1.5 px-3 border ${getRemoteColor(viewingJob.remote_type)}`}>
                    {viewingJob.remote_type}
                  </Badge>
                )}
                {viewingJob.job_type && (
                  <Badge variant="outline" className="text-xs py-1.5 px-3">{viewingJob.job_type}</Badge>
                )}
                {viewingJob.experience_level && (
                  <Badge variant="outline" className="text-xs py-1.5 px-3">{viewingJob.experience_level}</Badge>
                )}
                {formatSalary(viewingJob.salary_min, viewingJob.salary_max, viewingJob.salary_currency) && (
                  <Badge className="text-xs py-1.5 px-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                    {formatSalary(viewingJob.salary_min, viewingJob.salary_max, viewingJob.salary_currency)}
                  </Badge>
                )}
              </div>

              {/* Skills */}
              {viewingJob.required_skills && viewingJob.required_skills.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingJob.required_skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs py-1 px-2.5">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Job Description</h3>
                <div 
                  className="text-sm max-h-72 overflow-auto p-4 bg-muted/30 rounded-xl prose prose-sm dark:prose-invert max-w-none [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-4 [&_h4]:mb-2 [&_p]:text-muted-foreground [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1 [&_li]:text-muted-foreground"
                  dangerouslySetInnerHTML={{ 
                    __html: viewingJob.description 
                      ? formatJobDescription(viewingJob.description)
                      : "<p>No description available.</p>" 
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => toggleBookmark(viewingJob.id)}
                  className={bookmarked.has(viewingJob.id) ? "text-violet-600 border-violet-300 dark:border-violet-700" : ""}
                >
                  {bookmarked.has(viewingJob.id) ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
                  {bookmarked.has(viewingJob.id) ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setViewingJob(null); handleGenerateResume(viewingJob); }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />Generate AI Resume
                </Button>
                <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={() => { setViewingJob(null); handleApplyClick(viewingJob); }}>
                  Apply Now<ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Application Confirmation Modal */}
      {showConfirmModal && pendingConfirmations.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-0 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Did you apply?</h2>
                  <p className="text-sm text-muted-foreground">Help us track your applications</p>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-auto">
                {pendingConfirmations.map((pending) => (
                  <div key={pending.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{pending.jobs.title}</p>
                      <p className="text-xs text-muted-foreground">{pending.jobs.company}</p>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => handleConfirmApplication(pending.job_id, false)}
                      >
                        No
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-violet-600 hover:bg-violet-700"
                        onClick={() => handleConfirmApplication(pending.job_id, true)}
                      >
                        Yes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => setShowConfirmModal(false)}
              >
                Ask me later
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
