"use client";

import { cn } from "@/lib/utils";

interface HealthGaugeProps {
  /** Percentage value from 0 to 100 */
  percentage: number;
  className?: string;
}

/**
 * Simple health score display for Phase 1.
 * Shows percentage of tasks marked DONE.
 *
 * Colour gradient:
 * - 0–30%: magenta (danger)
 * - 30–70%: blue (moderate)
 * - 70–100%: gold (healthy)
 */
export function HealthGauge({ percentage, className }: HealthGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  const getColor = (): string => {
    if (clamped >= 70) return "text-accent-gold";
    if (clamped >= 30) return "text-accent-blue";
    return "text-accent-magenta";
  };

  const getBorderColor = (): string => {
    if (clamped >= 70) return "border-accent-gold/30";
    if (clamped >= 30) return "border-accent-blue/30";
    return "border-accent-magenta/30";
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-24 h-24 rounded-full border-2",
        getBorderColor(),
        className
      )}
    >
      <span className={cn("text-2xl font-display font-bold", getColor())}>
        {clamped}%
      </span>
      <span className="text-text-muted text-[10px] font-mono">HEALTH</span>
    </div>
  );
}
