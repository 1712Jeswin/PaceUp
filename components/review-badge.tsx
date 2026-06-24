import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface ReviewBadgeProps {
  result: "PASS" | "FAIL" | "NEEDS_REVISION";
  className?: string;
}

const REVIEW_CONFIG = {
  PASS: {
    label: "Passed",
    className: "border-accent-gold/50 text-accent-gold bg-accent-gold/5",
    icon: CheckCircle2,
  },
  FAIL: {
    label: "Failed",
    className: "border-accent-magenta/50 text-accent-magenta bg-accent-magenta/5",
    icon: XCircle,
  },
  NEEDS_REVISION: {
    label: "Needs Revision",
    className: "border-accent-blue/50 text-accent-blue bg-accent-blue/5",
    icon: RotateCcw,
  },
} as const;

/**
 * Badge component for displaying code review results.
 * PASS = gold, FAIL = magenta, NEEDS_REVISION = blue.
 */
export function ReviewBadge({ result, className }: ReviewBadgeProps) {
  const config = REVIEW_CONFIG[result];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-mono gap-1 ${config.className} ${className ?? ""}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
