"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  groupId: string | null;
  group: { name: string } | null;
}

const POLL_INTERVAL_MS = 30_000;

const TYPE_ICONS: Record<string, string> = {
  TASK_OVERDUE: "⚠️",
  STANDUP_MISSING: "📋",
  CONFLICT_DETECTED: "🔀",
  REVIEW_REQUIRED: "🔍",
};

/**
 * Notification bell component for the sidebar.
 * Polls for unread notifications every 30 seconds.
 */
export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data.notifications);
          setUnreadCount(data.data.unreadCount);
        }
      } catch {
        // WHY: Silent fail — bell just won't update
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/mark-read/${notificationId}`, {
        method: "POST",
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // WHY: Silent fail — notification will be marked on next poll
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
          isOpen
            ? "bg-accent-green/10 text-accent-green"
            : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50"
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-accent-magenta text-[9px] font-mono font-bold text-white shadow-[0_0_8px_rgba(255,0,255,0.6)] animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-12 w-80 bg-bg-secondary border border-border/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold text-text-primary">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] text-accent-magenta font-mono">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-text-muted">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 15).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 border-b border-border/20 hover:bg-bg-tertiary/30 transition-colors flex items-start gap-3",
                      !notification.readAt && "bg-accent-green/[0.02]"
                    )}
                  >
                    <span className="text-sm mt-0.5 shrink-0">
                      {TYPE_ICONS[notification.type] ?? "📌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs leading-relaxed",
                          notification.readAt
                            ? "text-text-secondary"
                            : "text-text-primary"
                        )}
                      >
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {notification.group && (
                          <span className="text-[10px] text-text-muted font-mono">
                            {notification.group.name}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!notification.readAt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="shrink-0 p-1 rounded hover:bg-bg-tertiary/50 text-text-muted hover:text-accent-green transition-colors"
                        aria-label="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Formats a date string into a relative time string (e.g., "2h ago", "3d ago").
 */
function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;

  const MINUTE_MS = 60_000;
  const HOUR_MS = 3_600_000;
  const DAY_MS = 86_400_000;

  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  return `${Math.floor(diffMs / DAY_MS)}d ago`;
}
