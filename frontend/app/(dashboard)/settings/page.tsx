"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { auth } from "@/lib/api";
import { 
  User, 
  Bell, 
  Mail, 
  Shield, 
  Palette,
  Save,
  Check,
  Loader2,
  Sun,
  Moon,
  Trash2,
  LogOut
} from "lucide-react";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "oled", label: "OLED", icon: Moon },
] as const;

const ACCENTS = [
  { name: "indigo", color: "#6366f1" },
  { name: "blue", color: "#3b82f6" },
  { name: "green", color: "#10b981" },
  { name: "purple", color: "#8b5cf6" },
  { name: "pink", color: "#ec4899" },
  { name: "orange", color: "#f97316" },
] as const;

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  });
  const [notifications, setNotifications] = useState({
    email_new_jobs: true,
    email_application_updates: true,
    email_weekly_digest: false,
    browser_notifications: true,
  });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await auth.updateProfile(token!, { full_name: profile.full_name });
      localStorage.setItem("notifications", JSON.stringify(notifications));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem("notifications");
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Profile</h2>
              <p className="text-sm text-muted-foreground">Your personal information</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize how JobTracker looks</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">Theme</label>
              <div className="flex gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                      theme === t.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-3">Accent Color</label>
              <div className="flex gap-3">
                {ACCENTS.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => setAccent(a.name as typeof accent)}
                    className={`w-10 h-10 rounded-full transition-transform ${
                      accent === a.name ? "ring-2 ring-offset-2 ring-offset-background scale-110" : ""
                    }`}
                    style={{ backgroundColor: a.color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Choose what updates you receive</p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div>
                <div className="font-medium">New Job Matches</div>
                <div className="text-sm text-muted-foreground">Get notified when new jobs match your profile</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_new_jobs}
                onChange={(e) => setNotifications({ ...notifications, email_new_jobs: e.target.checked })}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div>
                <div className="font-medium">Application Updates</div>
                <div className="text-sm text-muted-foreground">Status changes on your applications</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_application_updates}
                onChange={(e) => setNotifications({ ...notifications, email_application_updates: e.target.checked })}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div>
                <div className="font-medium">Weekly Digest</div>
                <div className="text-sm text-muted-foreground">Summary of your job search activity</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_weekly_digest}
                onChange={(e) => setNotifications({ ...notifications, email_weekly_digest: e.target.checked })}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div>
                <div className="font-medium">Browser Notifications</div>
                <div className="text-sm text-muted-foreground">Show desktop notifications</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.browser_notifications}
                onChange={(e) => setNotifications({ ...notifications, browser_notifications: e.target.checked })}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-semibold">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">Irreversible actions</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <Button variant="outline" className="text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={loading}
        className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : saved ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {saved ? "Saved!" : loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
