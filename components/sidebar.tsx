"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  KeyRound,
  UserCircle,
  Plus,
} from "lucide-react";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  hasBadge?: boolean;
}

/**
 * Sidebar navigation for the dashboard.
 * Fetches pending invitation count for the "New Group" badge.
 */
export function Sidebar() {
  const pathname = usePathname();
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/invitations/count");
        const data = await res.json();
        if (data.success) {
          setInviteCount(data.data.count);
        }
      } catch {
        // WHY: Silent fail — badge just won't show
      }
    };

    fetchCount();

    // Re-check every 30 seconds for new invitations
    const POLL_INTERVAL_MS = 30_000;
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const sidebarLinks: SidebarLink[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/dashboard/new-group",
      label: "New Group",
      icon: <Plus className="h-4 w-4" />,
      hasBadge: inviteCount > 0,
    },
    {
      href: "/dashboard/settings/keys",
      label: "AI Keys",
      icon: <KeyRound className="h-4 w-4" />,
    },
    {
      href: "/dashboard/profile/setup",
      label: "Profile",
      icon: <UserCircle className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-bg-secondary border-r border-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-display font-bold text-gradient-neon">
            PaceUp
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-body transition-all duration-200",
                isActive
                  ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-transparent"
              )}
            >
              {link.icon}
              {link.label}
              {link.hasBadge && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-accent-magenta text-[10px] font-mono font-bold text-white animate-pulse">
                  {inviteCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-border">
        <p className="text-text-muted text-xs font-mono px-3">
          Phase 1 — MVP Core
        </p>
      </div>
    </aside>
  );
}
