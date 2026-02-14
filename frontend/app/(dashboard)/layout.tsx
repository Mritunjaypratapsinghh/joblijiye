"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { notifications as notificationsApi, Notification } from "@/lib/api";
import { 
  Briefcase, 
  LayoutDashboard, 
  Search, 
  FileText, 
  ClipboardList, 
  LogOut, 
  ChevronRight,
  Bell,
  Sun,
  Moon,
  Palette,
  Settings,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Search },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/resumes", label: "Resumes", icon: FileText },
];

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "oled", label: "OLED" },
] as const;

const ACCENTS = [
  { name: "indigo", color: "#6366f1" },
  { name: "blue", color: "#3b82f6" },
  { name: "green", color: "#10b981" },
  { name: "purple", color: "#8b5cf6" },
  { name: "pink", color: "#ec4899" },
  { name: "orange", color: "#f97316" },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await notificationsApi.list(token, { limit: 20 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setShowThemeMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r flex flex-col z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">JobLijiye</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Theme Switcher */}
        <div className="px-4 pb-2" ref={themeRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {theme === "light" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === "oled" ? "OLED" : theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
            <Palette className="w-4 h-4 ml-auto" />
          </button>
          {showThemeMenu && (
            <div className="mt-2 p-3 bg-popover border rounded-xl shadow-lg">
              <div className="text-xs text-muted-foreground mb-2">Theme</div>
              <div className="flex gap-1 mb-3">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
                      theme === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mb-2">Accent Color</div>
              <div className="flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => setAccent(a.name as typeof accent)}
                    className={cn("w-6 h-6 rounded-full transition-transform", accent === a.name && "ring-2 ring-offset-2 ring-offset-popover scale-110")}
                    style={{ backgroundColor: a.color, boxShadow: accent === a.name ? `0 0 0 2px ${a.color}40` : undefined }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Section */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{user?.full_name || "User"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold capitalize">
              {pathname === "/" ? "Dashboard" : pathname.slice(1).split("/")[0]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={async () => {
                          if (token) {
                            await notificationsApi.markAllRead(token);
                            loadNotifications();
                          }
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                            !notif.read && "bg-primary/5"
                          )}
                          onClick={async () => {
                            if (!notif.read && token) {
                              await notificationsApi.markRead(token, notif.id);
                              loadNotifications();
                            }
                            if (notif.link) router.push(notif.link);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                              notif.type === "job_match" && "bg-blue-100 text-blue-600",
                              notif.type === "application_update" && "bg-purple-100 text-purple-600",
                              notif.type === "interview" && "bg-green-100 text-green-600",
                              notif.type === "status_change" && "bg-orange-100 text-orange-600",
                            )}>
                              {notif.type === "job_match" && <Briefcase className="w-4 h-4" />}
                              {notif.type === "application_update" && <FileText className="w-4 h-4" />}
                              {notif.type === "interview" && <CheckCircle2 className="w-4 h-4" />}
                              {notif.type === "status_change" && <Clock className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{notif.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/settings" onClick={() => setShowNotifications(false)}>
                    <div className="p-3 text-center text-sm text-primary hover:bg-muted/50 border-t">
                      Notification Settings
                    </div>
                  </Link>
                </div>
              )}
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
