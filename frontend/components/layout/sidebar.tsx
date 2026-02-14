import Link from "next/link";
import { Briefcase, FileText, LayoutDashboard, LogOut } from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/applications", icon: FileText, label: "Applications" },
  { href: "/resumes", icon: FileText, label: "Resumes" },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border p-4 flex flex-col">
      <div className="font-bold text-xl mb-8">Job Tracker</div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-muted-foreground">
        <LogOut className="w-5 h-5" />
        Logout
      </button>
    </aside>
  );
}
