"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analytics, AnalyticsDashboard, FunnelData, SourcePerformance, TimelineData } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { 
  Eye, 
  MousePointer, 
  Send, 
  Users, 
  Trophy,
  TrendingUp,
  BarChart3,
  Loader2,
  ArrowRight
} from "lucide-react";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadAnalytics();
  }, [token]);

  const loadAnalytics = async () => {
    if (!token) return;
    try {
      const result = await analytics.getDashboard(token);
      setData(result);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Analytics Data</h2>
        <p className="text-muted-foreground">Start browsing and applying to jobs to see your analytics.</p>
      </div>
    );
  }

  const { funnel, sources, timeline } = data;
  const maxTimelineValue = Math.max(...timeline.map(t => Math.max(t.views, t.clicks, t.applied)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your job search progress</p>
      </div>

      {/* Funnel Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <FunnelCard icon={Eye} label="Viewed" value={funnel.viewed} color="text-blue-500" />
        <FunnelCard icon={MousePointer} label="Clicked Apply" value={funnel.clicked} color="text-purple-500" />
        <FunnelCard icon={Send} label="Applied" value={funnel.applied} color="text-green-500" />
        <FunnelCard icon={Users} label="Interviewing" value={funnel.interviewing} color="text-orange-500" />
        <FunnelCard icon={Trophy} label="Offers" value={funnel.offers} color="text-yellow-500" />
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Application Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {[
              { label: "Viewed", value: funnel.viewed, color: "bg-blue-500" },
              { label: "Clicked", value: funnel.clicked, color: "bg-purple-500" },
              { label: "Applied", value: funnel.applied, color: "bg-green-500" },
              { label: "Interview", value: funnel.interviewing, color: "bg-orange-500" },
              { label: "Offer", value: funnel.offers, color: "bg-yellow-500" },
            ].map((stage, i, arr) => (
              <div key={stage.label} className="flex items-center flex-1">
                <div className="flex-1 text-center">
                  <div 
                    className={`${stage.color} mx-auto rounded-lg flex items-center justify-center text-white font-bold transition-all`}
                    style={{ 
                      width: `${Math.max(40, (stage.value / Math.max(funnel.viewed, 1)) * 100)}%`,
                      minWidth: "40px",
                      height: "48px"
                    }}
                  >
                    {stage.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stage.label}</p>
                  {funnel.viewed > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {((stage.value / funnel.viewed) * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
                {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {timeline.slice(-14).map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 flex gap-1 h-5">
                      <div 
                        className="bg-blue-500/80 rounded-sm" 
                        style={{ width: `${(day.views / maxTimelineValue) * 100}%` }}
                        title={`${day.views} views`}
                      />
                      <div 
                        className="bg-purple-500/80 rounded-sm" 
                        style={{ width: `${(day.clicks / maxTimelineValue) * 100}%` }}
                        title={`${day.clicks} clicks`}
                      />
                      <div 
                        className="bg-green-500/80 rounded-sm" 
                        style={{ width: `${(day.applied / maxTimelineValue) * 100}%` }}
                        title={`${day.applied} applied`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {day.views}/{day.clicks}/{day.applied}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm" /> Views</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded-sm" /> Clicks</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm" /> Applied</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Performance by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {sources.map((source) => {
                  const total = source.applied;
                  const responseRate = total > 0 ? ((source.interviews + source.offers) / total * 100).toFixed(0) : 0;
                  return (
                    <div key={source.source} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{source.source}</span>
                        <span className="text-xs text-muted-foreground">{responseRate}% response rate</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{source.applied}</p>
                          <p className="text-muted-foreground">Applied</p>
                        </div>
                        <div>
                          <p className="font-semibold text-orange-500">{source.interviews}</p>
                          <p className="text-muted-foreground">Interviews</p>
                        </div>
                        <div>
                          <p className="font-semibold text-green-500">{source.offers}</p>
                          <p className="text-muted-foreground">Offers</p>
                        </div>
                        <div>
                          <p className="font-semibold text-red-500">{source.rejected}</p>
                          <p className="text-muted-foreground">Rejected</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ConversionCard 
              label="View → Click" 
              value={funnel.viewed > 0 ? (funnel.clicked / funnel.viewed * 100).toFixed(1) : 0} 
            />
            <ConversionCard 
              label="Click → Apply" 
              value={funnel.clicked > 0 ? (funnel.applied / funnel.clicked * 100).toFixed(1) : 0} 
            />
            <ConversionCard 
              label="Apply → Interview" 
              value={funnel.applied > 0 ? (funnel.interviewing / funnel.applied * 100).toFixed(1) : 0} 
            />
            <ConversionCard 
              label="Interview → Offer" 
              value={funnel.interviewing > 0 ? (funnel.offers / funnel.interviewing * 100).toFixed(1) : 0} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversionCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-4 bg-muted/30 rounded-lg">
      <p className="text-2xl font-bold text-primary">{value}%</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
