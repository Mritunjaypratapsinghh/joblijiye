"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { jobs as jobsApi, savedJobs as savedJobsApi, resumes as resumesApi, analytics, Job } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  Briefcase,
  Building2,
  Users,
  Globe,
  Bookmark,
  BookmarkCheck,
  Share2,
  Sparkles,
  Loader2,
  Calendar,
  CheckCircle2,
  Circle,
  Copy,
  Linkedin,
  Twitter,
} from "lucide-react";

// Company logo with fallback
function CompanyLogo({ company, size = "lg" }: { company: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const sizeClasses = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-20 h-20", xl: "w-24 h-24" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl", xl: "text-4xl" };
  const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const fallback = (
    <div className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border-2 border-violet-200 dark:border-violet-800 flex items-center justify-center font-bold ${textSizes[size]} text-violet-600 dark:text-violet-400`}>
      {company.charAt(0).toUpperCase()}
    </div>
  );
  
  if (error) return fallback;
  
  return (
    <div className={`${sizeClasses[size]} relative shrink-0`}>
      {!loaded && fallback}
      <img
        src={`https://logo.clearbit.com/${cleanCompany}.com`}
        alt={company}
        className={`${sizeClasses[size]} rounded-2xl object-contain bg-white border-2 border-gray-200 dark:border-gray-700 p-2 absolute inset-0 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

function formatSalary(min?: number, max?: number, currency?: string) {
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
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function getSourceColor(source: string) {
  switch (source.toLowerCase()) {
    case "linkedin": return "bg-[#0A66C2] text-white";
    case "indeed": return "bg-[#2164F3] text-white";
    case "glassdoor": return "bg-[#0CAA41] text-white";
    case "lever": return "bg-orange-500 text-white";
    case "greenhouse": return "bg-teal-500 text-white";
    default: return "bg-gray-500 text-white";
  }
}

function getRemoteColor(type?: string) {
  switch (type?.toLowerCase()) {
    case "remote": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
    case "hybrid": return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-300 dark:border-amber-800";
    case "onsite": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-300 dark:border-blue-800";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-300 dark:border-gray-700";
  }
}

function formatDescription(text: string) {
  // Escape HTML
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Fix common scraping artifacts - words stuck together at section boundaries
  const sectionWords = [
    'Overview', 'About', 'Description', 'Summary', 'Introduction',
    'Responsibilities', 'Duties', 'Role', 'What you',
    'Qualifications', 'Requirements', 'Skills', 'Experience', 'Education',
    'Required', 'Preferred', 'Nice to have', 'Bonus', 'Ideal candidate',
    'Benefits', 'Perks', 'Compensation', 'Salary',
    'Company', 'Who we are', 'About us',
    'Job Roles', 'Key Responsibilities', 'What will you', 'What you\'ll',
  ];
  
  // Add line breaks before section headers that are stuck to previous text
  for (const word of sectionWords) {
    // Match word stuck to end of previous word (lowercase letter followed by section word)
    const regex = new RegExp(`([a-z.!?])\\s*(${word})`, 'g');
    html = html.replace(regex, '$1\n\n$2');
  }
  
  // Fix bullet points that are stuck together
  html = html.replace(/\.([A-Z][a-z]+)/g, '.\n\n$1'); // Period followed by capitalized word
  html = html.replace(/([a-z])([A-Z]{2,})/g, '$1\n\n$2'); // camelCase to ALLCAPS transition
  
  // Split into paragraphs
  const paragraphs = html.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const result: string[] = [];
  
  for (const para of paragraphs) {
    const lower = para.toLowerCase();
    
    // Check if this is a section header
    const isHeader = sectionWords.some(w => {
      const wl = w.toLowerCase();
      return lower === wl || lower.startsWith(wl + ' ') || lower.startsWith(wl + ':') || 
             lower.endsWith(wl) || (para.length < 60 && lower.includes(wl));
    }) || (para.endsWith(':') && para.length < 80);
    
    if (isHeader) {
      const headerText = para.replace(/:$/, '').replace(/\s+/g, ' ');
      result.push(`<div class="mt-8 mb-4"><h3 class="font-semibold text-foreground text-lg border-l-4 border-violet-500 pl-4 py-1">${headerText}</h3></div>`);
      continue;
    }
    
    // Check if paragraph contains multiple sentences that look like bullet points
    const sentences = para.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.length > 10);
    
    if (sentences.length >= 3 && sentences.every(s => s.length < 200)) {
      // Render as bullet list
      result.push('<ul class="space-y-3 my-5">');
      for (const sentence of sentences) {
        result.push(`<li class="flex gap-3"><span class="text-violet-500 shrink-0 mt-0.5">•</span><span class="text-muted-foreground leading-7">${sentence}</span></li>`);
      }
      result.push('</ul>');
    } else {
      // Regular paragraph
      result.push(`<p class="text-muted-foreground leading-7 mb-4">${para.replace(/\s+/g, ' ')}</p>`);
    }
  }
  
  return result.join('');
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formattedDesc, setFormattedDesc] = useState<string | null>(null);
  const [formattingDesc, setFormattingDesc] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    loadJob();
    loadBookmarkStatus();
  }, [jobId]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const data = await jobsApi.get(jobId);
      setJob(data);
      // Auto-format description with AI if it looks unformatted
      if (data.description && !data.description.includes('\n\n')) {
        loadFormattedDescription();
      }
      // Load similar jobs
      if (data.required_skills?.length) {
        const similar = await jobsApi.list({ query: data.required_skills[0], limit: 4 });
        setSimilarJobs(similar.jobs.filter(j => j.id !== jobId).slice(0, 3));
      }
    } catch {
      toast.error("Failed to load job");
      router.push("/jobs");
    } finally {
      setLoading(false);
    }
  };

  const loadFormattedDescription = async () => {
    setFormattingDesc(true);
    try {
      const { formatted } = await jobsApi.getFormattedDescription(jobId);
      if (formatted) setFormattedDesc(formatted);
    } catch {
      // Silently fail, will use fallback formatter
    } finally {
      setFormattingDesc(false);
    }
  };

  const loadBookmarkStatus = async () => {
    const saved = localStorage.getItem("bookmarkedJobs");
    if (saved) {
      const ids = JSON.parse(saved);
      setBookmarked(ids.includes(jobId));
    }
  };

  const toggleBookmark = async () => {
    const newState = !bookmarked;
    setBookmarked(newState);
    
    const saved = localStorage.getItem("bookmarkedJobs");
    let ids: string[] = saved ? JSON.parse(saved) : [];
    if (newState) {
      ids.push(jobId);
      if (token) savedJobsApi.save(token, jobId).catch(() => {});
    } else {
      ids = ids.filter(id => id !== jobId);
      if (token) savedJobsApi.unsave(token, jobId).catch(() => {});
    }
    localStorage.setItem("bookmarkedJobs", JSON.stringify(ids));
    toast.success(newState ? "Job saved" : "Job removed from saved");
  };

  const handleApply = () => {
    if (token && job) {
      analytics.trackClick(token, job.id, job.apply_url).catch(() => {});
    }
    window.open(job?.apply_url, "_blank", "noopener,noreferrer");
  };

  const handleGenerateResume = async () => {
    if (!token) {
      toast.error("Please login to generate resume");
      return;
    }
    setGenerating(true);
    try {
      await resumesApi.generate(token, jobId);
      toast.success("Resume generated! Check your resumes page.");
      router.push("/resumes");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate resume");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
    setShowShareMenu(false);
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, "_blank");
    setShowShareMenu(false);
  };

  const shareTwitter = () => {
    const text = `Check out this job: ${job?.title} at ${job?.company}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, "_blank");
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton className="h-96" /></CardContent></Card>
          </div>
          <div className="space-y-6">
            <Card><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" />Back to Jobs
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 h-24" />
            <CardContent className="p-6 -mt-12">
              <div className="flex items-start gap-5">
                <CompanyLogo company={job.company} size="xl" />
                <div className="flex-1 min-w-0 pt-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold">{job.title}</h1>
                      <p className="text-lg text-muted-foreground mt-1">{job.company}</p>
                    </div>
                    <Badge className={`shrink-0 ${getSourceColor(job.source)}`}>{job.source}</Badge>
                  </div>
                  
                  {/* Quick Info */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {job.location && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />{job.location}
                      </span>
                    )}
                    {job.posted_at && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />{formatDate(job.posted_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {salary && (
              <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Salary</span>
                  </div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">{salary}</p>
                </CardContent>
              </Card>
            )}
            {job.remote_type && (
              <Card className={`border ${getRemoteColor(job.remote_type)}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1 opacity-70">
                    <Globe className="w-4 h-4" />
                    <span className="text-xs font-medium">Work Type</span>
                  </div>
                  <p className="font-semibold">{job.remote_type}</p>
                </CardContent>
              </Card>
            )}
            {job.job_type && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs font-medium">Job Type</span>
                  </div>
                  <p className="font-semibold">{job.job_type}</p>
                </CardContent>
              </Card>
            )}
            {job.experience_level && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Experience</span>
                  </div>
                  <p className="font-semibold">{job.experience_level}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Skills Section */}
          {job.required_skills && job.required_skills.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-violet-500" />
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job Description */}
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-xl">Job Description</h2>
                {formattingDesc && (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI formatting...
                  </span>
                )}
              </div>
              {job.description ? (
                <div 
                  className="max-w-none text-[15px] jd-content"
                  dangerouslySetInnerHTML={{ 
                    __html: formattedDesc || formatDescription(job.description) 
                  }}
                />
              ) : (
                <p className="text-muted-foreground">No description available.</p>
              )}
            </CardContent>
          </Card>
          
          {/* AI Description Styles */}
          <style jsx global>{`
            .jd-content .jd-section {
              font-weight: 600;
              font-size: 1.1rem;
              margin-top: 2rem;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 2px solid hsl(var(--border));
              color: hsl(var(--foreground));
            }
            .jd-content .jd-list {
              list-style: none;
              padding: 0;
              margin: 1rem 0;
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }
            .jd-content .jd-list li {
              display: flex;
              gap: 0.75rem;
              line-height: 1.7;
              color: hsl(var(--muted-foreground));
            }
            .jd-content .jd-list li::before {
              content: "•";
              color: hsl(262.1 83.3% 57.8%);
              font-weight: bold;
              flex-shrink: 0;
            }
            .jd-content .jd-para {
              line-height: 1.8;
              margin-bottom: 1rem;
              color: hsl(var(--muted-foreground));
            }
          `}</style>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Card - Sticky */}
          <div className="lg:sticky lg:top-4">
            <Card className="border-2 border-violet-200 dark:border-violet-800">
              <CardContent className="p-6">
                <Button 
                  className="w-full h-12 text-base bg-violet-600 hover:bg-violet-700 mb-3"
                  onClick={handleApply}
                >
                  Apply Now <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full h-10 mb-3"
                  onClick={handleGenerateResume}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate AI Resume
                </Button>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className={`flex-1 ${bookmarked ? 'text-violet-600 border-violet-300' : ''}`}
                    onClick={toggleBookmark}
                  >
                    {bookmarked ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
                    {bookmarked ? 'Saved' : 'Save'}
                  </Button>
                  <div className="relative">
                    <Button variant="outline" onClick={() => setShowShareMenu(!showShareMenu)}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {showShareMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-popover border rounded-lg shadow-lg p-2 z-10">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md" onClick={copyLink}>
                          <Copy className="w-4 h-4" />Copy Link
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md" onClick={shareLinkedIn}>
                          <Linkedin className="w-4 h-4" />LinkedIn
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md" onClick={shareTwitter}>
                          <Twitter className="w-4 h-4" />Twitter
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />About {job.company}
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <CompanyLogo company={job.company} size="md" />
                  <div>
                    <p className="font-medium">{job.company}</p>
                    {job.location && <p className="text-sm text-muted-foreground">{job.location}</p>}
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(job.company)}`} target="_blank" rel="noopener noreferrer">
                    Learn More <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Similar Jobs */}
            {similarJobs.length > 0 && (
              <Card className="mt-6">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Similar Jobs</h3>
                  <div className="space-y-3">
                    {similarJobs.map((sJob) => (
                      <div 
                        key={sJob.id} 
                        className="p-3 rounded-lg border hover:border-violet-300 dark:hover:border-violet-700 cursor-pointer transition-colors"
                        onClick={() => router.push(`/jobs/${sJob.id}`)}
                      >
                        <p className="font-medium text-sm line-clamp-1">{sJob.title}</p>
                        <p className="text-xs text-muted-foreground">{sJob.company}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Apply Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t lg:hidden z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button variant="outline" size="icon" onClick={toggleBookmark}>
            {bookmarked ? <BookmarkCheck className="w-5 h-5 text-violet-600" /> : <Bookmark className="w-5 h-5" />}
          </Button>
          <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={handleApply}>
            Apply Now <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
