"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/auth-provider";
import { auth, profile as profileApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Briefcase,
  GraduationCap,
  Code,
  Save,
  Loader2,
  User,
  MapPin,
  Phone,
  Link as LinkIcon,
  Trash2,
  Upload,
  Linkedin,
} from "lucide-react";

interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  start_year: string;
  end_year: string;
  gpa?: string;
}

interface Profile {
  full_name: string;
  phone: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
}

const emptyExperience: Experience = {
  id: "",
  company: "",
  title: "",
  location: "",
  start_date: "",
  end_date: "",
  current: false,
  description: "",
};

const emptyEducation: Education = {
  id: "",
  institution: "",
  degree: "",
  field: "",
  start_year: "",
  end_year: "",
};

export default function ProfilePage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const linkedinInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    phone: "",
    location: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    skills: [],
    experience: [],
    education: [],
  });

  useEffect(() => {
    if (token) loadProfile();
  }, [token]);

  const loadProfile = async () => {
    try {
      const data = await auth.profile(token!);
      setProfile({
        full_name: data.full_name || "",
        phone: data.phone || "",
        location: data.location || "",
        linkedin_url: data.linkedin_url || "",
        github_url: data.github_url || "",
        portfolio_url: data.portfolio_url || "",
        skills: data.skills || [],
        experience: (data.experience || []).map((exp, i: number) => ({
          ...exp,
          id: exp.id || crypto.randomUUID(),
          location: exp.location || "",
          current: exp.current || false,
        })),
        education: (data.education || []).map((edu, i: number) => ({
          ...edu,
          id: edu.id || crypto.randomUUID(),
        })),
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await auth.updateProfile(token!, profile);
      toast.success("Profile saved successfully");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLinkedInImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    
    setImporting(true);
    try {
      const result = await profileApi.importLinkedIn(token!, file);
      toast.success(`Imported: ${result.imported.skills_count} skills, ${result.imported.experience_count} jobs, ${result.imported.education_count} education`);
      loadProfile(); // Reload profile
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (linkedinInputRef.current) linkedinInputRef.current.value = "";
    }
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !profile.skills.includes(skill)) {
      setProfile({ ...profile, skills: [...profile.skills, skill] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: profile.skills.filter((s) => s !== skill) });
  };

  const addExperience = () => {
    setProfile({
      ...profile,
      experience: [...profile.experience, { ...emptyExperience, id: crypto.randomUUID() }],
    });
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    setProfile({
      ...profile,
      experience: profile.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const removeExperience = (id: string) => {
    setProfile({ ...profile, experience: profile.experience.filter((exp) => exp.id !== id) });
  };

  const addEducation = () => {
    setProfile({
      ...profile,
      education: [...profile.education, { ...emptyEducation, id: crypto.randomUUID() }],
    });
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setProfile({
      ...profile,
      education: profile.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const removeEducation = (id: string) => {
    setProfile({ ...profile, education: profile.education.filter((edu) => edu.id !== id) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Builder</h1>
          <p className="text-muted-foreground">Complete your profile for AI-powered resume generation</p>
        </div>
        <Button onClick={saveProfile} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Profile
        </Button>
      </div>

      {/* LinkedIn Import */}
      <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <Linkedin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Import from LinkedIn</h3>
              <p className="text-sm text-muted-foreground">
                Upload your LinkedIn PDF export to auto-fill your profile
              </p>
            </div>
            <input
              ref={linkedinInputRef}
              type="file"
              accept=".pdf"
              onChange={handleLinkedInImport}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => linkedinInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {importing ? "Importing..." : "Upload PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="Mumbai, India"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" /> Social Links
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input
              value={profile.linkedin_url}
              onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
              placeholder="linkedin.com/in/username"
            />
          </div>
          <div className="space-y-2">
            <Label>GitHub</Label>
            <Input
              value={profile.github_url}
              onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
              placeholder="github.com/username"
            />
          </div>
          <div className="space-y-2">
            <Label>Portfolio</Label>
            <Input
              value={profile.portfolio_url}
              onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
              placeholder="yourportfolio.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" /> Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="Add a skill (e.g., Python, React, AWS)"
              className="flex-1"
            />
            <Button onClick={addSkill} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                {skill}
                <button onClick={() => removeSkill(skill)} className="ml-2 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {profile.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills added yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Work Experience
          </CardTitle>
          <Button onClick={addExperience} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.experience.map((exp, idx) => (
            <div key={exp.id} className="border rounded-lg p-4 space-y-4 relative">
              <button
                onClick={() => removeExperience(exp.id)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                    placeholder="Google"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={exp.title}
                    onChange={(e) => updateExperience(exp.id, "title", e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={exp.location}
                    onChange={(e) => updateExperience(exp.id, "location", e.target.value)}
                    placeholder="Bangalore, India"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>Start Date</Label>
                    <Input
                      type="month"
                      value={exp.start_date}
                      onChange={(e) => updateExperience(exp.id, "start_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>End Date</Label>
                    <Input
                      type="month"
                      value={exp.end_date}
                      onChange={(e) => updateExperience(exp.id, "end_date", e.target.value)}
                      disabled={exp.current}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`current-${exp.id}`}
                  checked={exp.current}
                  onChange={(e) => updateExperience(exp.id, "current", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor={`current-${exp.id}`} className="text-sm font-normal">
                  I currently work here
                </Label>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                  placeholder="Describe your responsibilities and achievements..."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          ))}
          {profile.experience.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No work experience added yet. Click "Add" to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Education
          </CardTitle>
          <Button onClick={addEducation} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.education.map((edu) => (
            <div key={edu.id} className="border rounded-lg p-4 space-y-4 relative">
              <button
                onClick={() => removeEducation(edu.id)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                    placeholder="IIT Delhi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                    placeholder="B.Tech"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Field of Study</Label>
                  <Input
                    value={edu.field}
                    onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>Start Year</Label>
                    <Input
                      type="number"
                      value={edu.start_year}
                      onChange={(e) => updateEducation(edu.id, "start_year", e.target.value)}
                      placeholder="2018"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>End Year</Label>
                    <Input
                      type="number"
                      value={edu.end_year}
                      onChange={(e) => updateEducation(edu.id, "end_year", e.target.value)}
                      placeholder="2022"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {profile.education.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No education added yet. Click "Add" to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
