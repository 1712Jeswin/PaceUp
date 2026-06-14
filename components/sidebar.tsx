"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/dashboard/new-group",
      label: "New Group",
      icon: <Plus className="h-5 w-5" />,
      hasBadge: inviteCount > 0,
    },
    {
      href: "/dashboard/settings/keys",
      label: "AI Keys",
      icon: <KeyRound className="h-5 w-5" />,
    },
    {
      href: "/dashboard/profile/setup",
      label: "Profile",
      icon: <UserCircle className="h-5 w-5" />,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-bg-secondary/60 backdrop-blur-xl border-r border-border/50 fixed left-0 top-0 z-40 shadow-xl">
      {/* Logo */}
      <div className="flex items-center justify-start px-6 py-6 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-105">
          <div className="relative w-8 h-8">
            <Image
              src="/assets/paceup-icon.png"
              alt="PaceUp"
              fill
              className="object-contain drop-shadow-[0_0_8px_rgba(57,255,20,0.4)]"
              priority
            />
          </div>
          <span className="text-2xl font-display font-bold text-text-primary tracking-wide">PaceUp</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {sidebarLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className="block relative group"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-accent-green/10 rounded-lg border border-accent-green/30"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium font-body transition-all duration-300 z-10",
                  isActive
                    ? "text-accent-green"
                    : "text-text-secondary group-hover:text-text-primary group-hover:bg-bg-tertiary/50"
                )}
              >
                {link.icon}
                {link.label}
                {link.hasBadge && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-accent-magenta text-[10px] font-mono font-bold text-white shadow-[0_0_10px_rgba(255,0,255,0.6)] animate-pulse">
                    {inviteCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-6 py-5 border-t border-border/50 bg-bg-tertiary/20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_8px_rgba(57,255,20,0.8)]" />
          <p className="text-text-secondary text-xs font-mono">
            System Online
          </p>
        </div>
      </div>
    </aside>
  );
}
