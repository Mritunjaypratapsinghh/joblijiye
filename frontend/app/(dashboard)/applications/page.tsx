"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { applications as appsApi, Application } from "@/lib/api";
import { toast } from "sonner";
import { 
  ClipboardList, 
  Building2, 
  Calendar,
  MoreHorizontal,
  Loader2,
  Send,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
  Edit,
  ExternalLink,
  StickyNote,
  X,
  Save
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  applied: { 
    label: "Applied", 
    color: "text-blue-600 dark:text-blue-400", 
    icon: Send,
    bgColor: "bg-blue-50 dark:bg-blue-900/20"
  },
  screening: { 
    label: "Screening", 
    color: "text-purple-600 dark:text-purple-400", 
    icon: Eye,
    bgColor: "bg-purple-50 dark:bg-purple-900/20"
  },
  interview: { 
    label: "Interview", 
    color: "text-orange-600 dark:text-orange-400", 
    icon: MessageSquare,
    bgColor: "bg-orange-50 dark:bg-orange-900/20"
  },
  offer: { 
    label: "Offer", 
    color: "text-green-600 dark:text-green-400", 
    icon: CheckCircle2,
    bgColor: "bg-green-50 dark:bg-green-900/20"
  },
  rejected: { 
    label: "Rejected", 
    color: "text-red-600 dark:text-red-400", 
    icon: XCircle,
    bgColor: "bg-red-50 dark:bg-red-900/20"
  },
};

const pipelineStages = ["applied", "screening", "interview", "offer"];

export default function ApplicationsPage() {
  const { token } = useAuth();
  const [applicationsList, setApplicationsList] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<Application | null>(null);
  const [notesText, setNotesText] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) loadApplications();
  }, [token]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await appsApi.list(token!);
      setApplicationsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load applications:", err);
      setApplicationsList([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await appsApi.update(token!, id, { status });
      await loadApplications();
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    }
    setOpenMenu(null);
  };

  const openNotesModal = (app: Application) => {
    setNotesModal(app);
    setNotesText(app.notes || "");
    setFollowUpDate(app.follow_up_date || "");
    setOpenMenu(null);
  };

  const saveNotes = async () => {
    if (!notesModal) return;
    setSavingNotes(true);
    try {
      await appsApi.update(token!, notesModal.id, { 
        notes: notesText,
        follow_up_date: followUpDate || null,
      });
      await loadApplications();
      toast.success("Saved successfully");
      setNotesModal(null);
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSavingNotes(false);
    }
  };

  const getApplicationsByStatus = (status: string) => {
    return applicationsList.filter(app => app.status.toLowerCase() === status);
  };

  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">Track and manage your job applications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === "pipeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("pipeline")}
            >
              Pipeline
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => {
          const config = statusConfig[stage];
          const count = getApplicationsByStatus(stage).length;
          return (
            <Card key={stage} className={`${config.bgColor} border-0`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                  <config.icon className={`w-8 h-8 ${config.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {applicationsList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-4">
              Start applying to jobs to track your progress here.
            </p>
            <Button asChild>
              <a href="/jobs">Browse Jobs</a>
            </Button>
          </div>
        </Card>
      ) : viewMode === "pipeline" ? (
        /* Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipelineStages.map((stage, stageIndex) => {
            const config = statusConfig[stage];
            const stageApps = getApplicationsByStatus(stage);
            return (
              <div key={stage} className="space-y-3">
                <div className={`flex items-center gap-2 p-3 rounded-xl ${config.bgColor}`}>
                  <config.icon className={`w-5 h-5 ${config.color}`} />
                  <span className={`font-medium ${config.color}`}>{config.label}</span>
                  <Badge variant="secondary" className="ml-auto">{stageApps.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {stageApps.map((app) => (
                    <Card key={app.id} className="card-hover cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                            {app.jobs?.company?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{app.jobs?.title || "Unknown Role"}</h4>
                            <p className="text-sm text-muted-foreground truncate">{app.jobs?.company || "Unknown Company"}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(app.applied_at)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {stageApps.length === 0 && (
                    <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                      No applications
                    </div>
                  )}
                </div>
                {stageIndex < pipelineStages.length - 1 && (
                  <div className="hidden lg:flex justify-center">
                    <ArrowRight className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {applicationsList.map((app) => {
            const config = statusConfig[app.status.toLowerCase()] || statusConfig.applied;
            return (
              <Card key={app.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                      {app.jobs?.company?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{app.jobs?.title || "Unknown Role"}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>{app.jobs?.company || "Unknown Company"}</span>
                        {app.notes && (
                          <Badge variant="outline" className="text-xs ml-2">
                            <StickyNote className="w-3 h-3 mr-1" />
                            Notes
                          </Badge>
                        )}
                        {app.follow_up_date && (
                          <Badge variant="outline" className={`text-xs ml-2 ${
                            new Date(app.follow_up_date) <= new Date() 
                              ? "border-amber-500 text-amber-600 dark:text-amber-400" 
                              : ""
                          }`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            Follow-up: {formatDate(app.follow_up_date)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${config.bgColor} ${config.color} border-0`}>
                        <config.icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(app.applied_at)}
                      </p>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="icon" onClick={() => setOpenMenu(openMenu === app.id ? null : app.id)}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      {openMenu === app.id && (
                        <div ref={menuRef} className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-lg shadow-lg py-1 z-50">
                          <button onClick={() => openNotesModal(app)} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                            <StickyNote className="w-4 h-4" /> {app.notes ? "Edit Notes" : "Add Notes"}
                          </button>
                          <button onClick={() => updateStatus(app.id, "screening")} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Move to Screening
                          </button>
                          <button onClick={() => updateStatus(app.id, "interview")} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Move to Interview
                          </button>
                          <button onClick={() => updateStatus(app.id, "offer")} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Move to Offer
                          </button>
                          <button onClick={() => updateStatus(app.id, "rejected")} className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Mark Rejected
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Application Details</h2>
                  <p className="text-sm text-muted-foreground">
                    {notesModal.jobs?.title} at {notesModal.jobs?.company}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setNotesModal(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">You&apos;ll get a reminder notification on this date</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Notes</label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add notes about this application (interview prep, contact info, follow-ups...)"
                    className="w-full min-h-[150px] px-3 py-2 border rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setNotesModal(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
