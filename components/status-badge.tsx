import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

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
    className: "border-border/50 text-text-secondary bg-bg-secondary/50",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "border-accent-blue/40 text-accent-blue bg-accent-blue/10",
  },
  DONE: {
    label: "Done",
    className: "border-accent-gold/40 text-accent-gold bg-accent-gold/10",
  },
  OVERDUE: {
    label: "Overdue",
    className: "border-accent-magenta/40 text-accent-magenta bg-accent-magenta/10",
  },
};

/**
 * Task status badge with Doom Neon colour coding.
 * Grey = not started, Blue = in progress, Gold = done, Magenta = overdue.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2.5 py-0.5 text-xs font-mono font-medium rounded-full",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
