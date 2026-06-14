"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

  const getStrokeColor = (): string => {
    if (clamped >= 70) return "#ffd700"; // gold
    if (clamped >= 30) return "#00cfff"; // blue
    return "#ff00ff"; // magenta
  };

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center w-28 h-28 glass-panel rounded-full", className)}>
      <svg className="absolute inset-0 w-full h-full transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          className="stroke-border/30 fill-transparent"
          strokeWidth="6"
        />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          className="fill-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          strokeWidth="6"
          strokeLinecap="round"
          stroke={getStrokeColor()}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="flex flex-col items-center justify-center z-10">
        <span className={cn("text-2xl font-display font-bold", getColor())}>
          {clamped}%
        </span>
        <span className="text-text-muted text-[9px] font-mono tracking-widest mt-0.5">HEALTH</span>
      </div>
    </div>
  );
}
