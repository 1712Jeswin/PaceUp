import type { AIProvider, TaskStatus, UserLevel, BriefStatus } from "@prisma/client";

// ============================================
// API Response
// ============================================

/**
 * Consistent API response shape used by all route handlers.
 * Every API route must return this shape — no exceptions.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// AI Task Assignment
// ============================================

/**
 * Shape of a single task returned by the AI assignment engine.
 */
export interface AITaskItem {
  title: string;
  description: string;
  estimatedDays: number;
}

/**
 * Shape of a single member assignment returned by the AI assignment engine.
 * The AI returns an array of these — one per group member.
 */
export interface AIAssignment {
  userId: string;
  role: string;
  tasks: AITaskItem[];
}

/**
 * Full response shape from the AI assignment engine.
 */
export type AIAssignmentResponse = AIAssignment[];

// ============================================
// Provider Config
// ============================================

/**
 * Configuration for an AI provider displayed in the settings UI.
 */
export interface ProviderConfig {
  provider: AIProvider;
  label: string;
  models: string[];
}

// ============================================
// Profile Setup
// ============================================

/**
 * Available programming languages for the skill profile.
 */
export const SKILL_LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "Rust",
  "Go",
  "Other",
] as const;

export type SkillLanguage = (typeof SKILL_LANGUAGES)[number];

/**
 * Available domain areas for the skill profile.
 */
export const SKILL_DOMAINS = [
  "Frontend",
  "Backend",
  "DevOps",
  "ML/AI",
  "Hardware",
  "Mobile",
  "Design",
  "Research",
] as const;

export type SkillDomain = (typeof SKILL_DOMAINS)[number];

// ============================================
// Re-exports for convenience
// ============================================

export type { AIProvider, TaskStatus, UserLevel, BriefStatus };
