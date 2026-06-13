import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "badge-not-started",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "badge-in-progress",
  },
  DONE: {
    label: "Done",
    className: "badge-done",
  },
  OVERDUE: {
    label: "Overdue",
    className: "badge-overdue",
  },
};

/**
 * Task status badge with Doom Neon colour coding.
 * Grey = not started, Blue = in progress, Gold = done, Magenta = overdue.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
