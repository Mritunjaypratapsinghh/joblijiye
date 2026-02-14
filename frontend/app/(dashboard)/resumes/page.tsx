"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { resumes as resumesApi, Resume } from "@/lib/api";
import { 
  FileText, 
  Plus, 
  Sparkles, 
  Download, 
  Eye,
  MoreHorizontal,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Trash2
} from "lucide-react";

export default function ResumesPage() {
  const { token } = useAuth();
  const [resumesList, setResumesList] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<Resume | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) loadResumes();
  }, [token]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const data = await resumesApi.list(token!);
      setResumesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load resumes:", err);
      setResumesList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Uploading file:", file.name);
      // TODO: Implement actual file upload to backend
      alert(`File "${file.name}" selected. Upload functionality coming soon!`);
    }
  };

  const handleDownload = (resume: Resume) => {
    const data = JSON.stringify(resume.resume_json, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${resume.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score?: number) => {
    if (!score) return "bg-muted";
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
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
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="text-muted-foreground">AI-optimized resumes tailored for each job</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Resume
        </Button>
      </div>

      {/* Upload Section */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Your Base Resume</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Upload your existing resume and our AI will optimize it for each job you apply to.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Create with AI
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumes Grid */}
      {resumesList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No resumes yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first AI-optimized resume to get started.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumesList.map((resume) => (
            <Card key={resume.id} className="card-hover group">
              <CardContent className="p-6">
                {/* Preview Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setOpenMenu(openMenu === resume.id ? null : resume.id)}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                    {openMenu === resume.id && (
                      <div ref={menuRef} className="absolute right-0 top-full mt-1 w-36 bg-popover border rounded-lg shadow-lg py-1 z-50">
                        <button onClick={() => { setShowViewModal(resume); setOpenMenu(null); }} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <button onClick={() => { handleDownload(resume); setOpenMenu(null); }} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                          <Download className="w-4 h-4" /> Download
                        </button>
                        <button className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resume Info */}
                <h3 className="font-semibold mb-1 truncate">
                  {(resume.resume_json as Record<string, unknown>)?.name as string || "Untitled Resume"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Created {formatDate(resume.created_at)}
                </p>

                {/* ATS Score */}
                <div className={`p-3 rounded-xl ${getScoreBg(resume.ats_score)} mb-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className={`w-5 h-5 ${getScoreColor(resume.ats_score)}`} />
                      <span className="text-sm font-medium">ATS Score</span>
                    </div>
                    <span className={`text-2xl font-bold ${getScoreColor(resume.ats_score)}`}>
                      {resume.ats_score || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Keywords */}
                {resume.keywords_matched && resume.keywords_matched.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Matched Keywords</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {resume.keywords_matched.slice(0, 4).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {kw}
                        </Badge>
                      ))}
                      {resume.keywords_matched.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{resume.keywords_matched.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {resume.keywords_missing && resume.keywords_missing.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span>Missing Keywords</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {resume.keywords_missing.slice(0, 3).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          {kw}
                        </Badge>
                      ))}
                      {resume.keywords_missing.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{resume.keywords_missing.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowViewModal(resume)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(resume)}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Create Resume</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mb-4">
                AI resume generation requires a job to tailor the resume for. Go to Jobs page and click Apply on a job to generate a tailored resume.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => { setShowCreateModal(false); window.location.href = "/jobs"; }}>
                  Browse Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{showViewModal.resume_json?.name || "Resume"}</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowViewModal(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(showViewModal.resume_json, null, 2)}
              </pre>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowViewModal(null)}>
                  Close
                </Button>
                <Button className="flex-1" onClick={() => handleDownload(showViewModal)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
