"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { alerts as alertsApi, JobAlert } from "@/lib/api";
import { toast } from "sonner";
import {
  Bell,
  Plus,
  X,
  Loader2,
  Trash2,
  Mail,
  MapPin,
  Clock,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";

export default function AlertsPage() {
  const { token } = useAuth();
  const [alertsList, setAlertsList] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAlert, setNewAlert] = useState({
    keywords: "",
    locations: "",
    remote_only: false,
    frequency: "daily",
  });

  useEffect(() => {
    if (token) loadAlerts();
  }, [token]);

  const loadAlerts = async () => {
    try {
      const data = await alertsApi.list(token!);
      setAlertsList(data.alerts || []);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!newAlert.keywords.trim()) {
      toast.error("Enter at least one keyword");
      return;
    }
    setSaving(true);
    try {
      await alertsApi.create(token!, {
        keywords: newAlert.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        locations: newAlert.locations ? newAlert.locations.split(",").map((l) => l.trim()).filter(Boolean) : [],
        job_types: [],
        remote_only: newAlert.remote_only,
        frequency: newAlert.frequency,
        is_active: true,
      });
      toast.success("Alert created!");
      setShowCreate(false);
      setNewAlert({ keywords: "", locations: "", remote_only: false, frequency: "daily" });
      loadAlerts();
    } catch {
      toast.error("Failed to create alert");
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (alert: JobAlert) => {
    try {
      await alertsApi.update(token!, alert.id, { is_active: !alert.is_active });
      setAlertsList((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_active: !a.is_active } : a))
      );
      toast.success(alert.is_active ? "Alert paused" : "Alert activated");
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await alertsApi.delete(token!, id);
      setAlertsList((prev) => prev.filter((a) => a.id !== id));
      toast.success("Alert deleted");
    } catch {
      toast.error("Failed to delete alert");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job Alerts</h1>
          <p className="text-muted-foreground">Get notified when new jobs match your criteria</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Alert
        </Button>
      </div>

      {/* Create Alert Modal */}
      {showCreate && (
        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Create Job Alert</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Keywords (comma separated)</label>
                <Input
                  value={newAlert.keywords}
                  onChange={(e) => setNewAlert({ ...newAlert, keywords: e.target.value })}
                  placeholder="software engineer, react, python"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Locations (optional)</label>
                <Input
                  value={newAlert.locations}
                  onChange={(e) => setNewAlert({ ...newAlert, locations: e.target.value })}
                  placeholder="Bangalore, Mumbai, Remote"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAlert.remote_only}
                    onChange={(e) => setNewAlert({ ...newAlert, remote_only: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Remote only</span>
                </label>
                <select
                  value={newAlert.frequency}
                  onChange={(e) => setNewAlert({ ...newAlert, frequency: e.target.value })}
                  className="px-3 py-2 border rounded-lg bg-background text-sm"
                >
                  <option value="instant">Instant</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={createAlert} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                  Create Alert
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      {alertsList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create an alert to get notified when new jobs match your criteria.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Alert
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {alertsList.map((alert) => (
            <Card key={alert.id} className={!alert.is_active ? "opacity-60" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className={`w-4 h-4 ${alert.is_active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-semibold">
                        {alert.keywords.slice(0, 3).join(", ")}
                        {alert.keywords.length > 3 && ` +${alert.keywords.length - 3}`}
                      </span>
                      <Badge variant={alert.is_active ? "default" : "secondary"}>
                        {alert.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {alert.locations.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {alert.locations.join(", ")}
                        </span>
                      )}
                      {alert.remote_only && (
                        <Badge variant="outline" className="text-xs">Remote Only</Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alert.frequency}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {alert.last_sent_at
                          ? `Last sent ${new Date(alert.last_sent_at).toLocaleDateString()}`
                          : "Never sent"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => toggleAlert(alert)}>
                      {alert.is_active ? (
                        <ToggleRight className="w-5 h-5 text-primary" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteAlert(alert.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
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
