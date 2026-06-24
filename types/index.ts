import type { AIProvider, TaskStatus, UserLevel, BriefStatus, InvitationStatus, InvitationType, PRStatus, ConfidenceLevel, NotificationType, ReviewResult } from "@prisma/client";

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
// Profile Setup — Constants
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
  "C",
  "C#",
  "Rust",
  "Go",
  "Kotlin",
  "Swift",
  "Ruby",
  "PHP",
  "Dart",
  "Scala",
  "R",
  "MATLAB",
  "SQL",
  "Shell/Bash",
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
  "Data Science",
  "Cybersecurity",
  "Game Dev",
  "Blockchain",
  "Embedded Systems",
  "Cloud Architecture",
] as const;

export type SkillDomain = (typeof SKILL_DOMAINS)[number];

/**
 * Proficiency levels for individual skill ratings.
 */
export const PROFICIENCY_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

/** Human-readable labels for proficiency levels. */
export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

/** Descriptions for proficiency levels — shown in the UI. */
export const PROFICIENCY_DESCRIPTIONS: Record<ProficiencyLevel, string> = {
  BEGINNER: "Learning the basics, can write simple programs",
  INTERMEDIATE: "Comfortable building projects, understands core concepts",
  ADVANCED: "Can architect solutions, lead a module, mentor others",
  EXPERT: "Deep expertise, contributes to open source, industry-level",
};

/**
 * Popular frameworks and libraries — used as suggestions in the searchable tag input.
 */
export const FRAMEWORKS = [
  "React",
  "Next.js",
  "Vue.js",
  "Nuxt.js",
  "Angular",
  "Svelte",
  "Express.js",
  "Nest.js",
  "Django",
  "Flask",
  "FastAPI",
  "Spring Boot",
  "Ruby on Rails",
  "Laravel",
  "Flutter",
  "React Native",
  "SwiftUI",
  "Tailwind CSS",
  "Bootstrap",
  "Material UI",
  "Three.js",
  "TensorFlow",
  "PyTorch",
  "scikit-learn",
  "Pandas",
  "Node.js",
  "Deno",
  "Bun",
  "Electron",
  "Tauri",
  ".NET",
  "ASP.NET",
  "Gin",
  "Fiber",
  "Actix",
  "Rocket",
] as const;

/**
 * Developer tools — used in the multi-select grid.
 */
export const DEV_TOOLS = [
  "Git",
  "GitHub",
  "GitLab",
  "Docker",
  "Kubernetes",
  "Figma",
  "VS Code",
  "IntelliJ",
  "Vim/Neovim",
  "Postman",
  "Jira",
  "Linear",
  "Notion",
  "Slack",
  "Discord",
  "CI/CD Pipelines",
  "Terraform",
  "Ansible",
  "Nginx",
  "Webpack",
  "Vite",
  "ESLint",
  "Prettier",
  "Jest",
  "Cypress",
  "Playwright",
  "Storybook",
] as const;

/**
 * Databases — used in the multi-select.
 */
export const DATABASES = [
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "Firebase/Firestore",
  "Supabase",
  "DynamoDB",
  "Cassandra",
  "Neo4j",
  "Elasticsearch",
  "PlanetScale",
  "CockroachDB",
  "Prisma",
  "Drizzle",
] as const;

/**
 * Cloud platforms — used in the multi-select.
 */
export const CLOUD_PLATFORMS = [
  "AWS",
  "Google Cloud",
  "Azure",
  "Vercel",
  "Netlify",
  "Railway",
  "Render",
  "Fly.io",
  "DigitalOcean",
  "Heroku",
  "Cloudflare",
  "Supabase Cloud",
  "PlanetScale Cloud",
] as const;

/**
 * Professional role/status options for the experience section.
 */
export const CURRENT_ROLES = [
  "Student",
  "Intern",
  "Junior Developer",
  "Mid-Level Developer",
  "Senior Developer",
  "Tech Lead",
  "Staff Engineer",
  "UI/UX Designer",
  "Product Manager",
  "Data Scientist",
  "DevOps Engineer",
  "QA Engineer",
  "Researcher",
  "Freelancer",
  "Founder/Entrepreneur",
  "Other",
] as const;

/**
 * Preferred team roles — what a user wants to do on a project.
 */
export const PREFERRED_ROLES = [
  "Team Lead",
  "Backend Developer",
  "Frontend Developer",
  "Full-Stack Developer",
  "DevOps Engineer",
  "UI/UX Designer",
  "Data Scientist",
  "ML Engineer",
  "QA / Tester",
  "Technical Writer",
  "Project Manager",
  "Architect",
  "Mobile Developer",
  "Security Engineer",
] as const;

/**
 * Communication styles.
 */
export const COMMUNICATION_STYLES = [
  { value: "ASYNC", label: "Async-First", desc: "Prefer written updates, PRs, and async tools", icon: "📝" },
  { value: "MEETINGS", label: "Meeting-Oriented", desc: "Prefer live calls, standups, and face-to-face", icon: "📹" },
  { value: "HYBRID", label: "Hybrid", desc: "Flexible mix depending on the situation", icon: "🔄" },
] as const;

/**
 * Work schedule preferences.
 */
export const WORK_SCHEDULES = [
  { value: "EARLY_BIRD", label: "Early Bird", desc: "Most productive in the morning", icon: "🌅" },
  { value: "AFTERNOON", label: "Afternoon", desc: "Hit my stride after lunch", icon: "☀️" },
  { value: "NIGHT_OWL", label: "Night Owl", desc: "Best work happens after midnight", icon: "🌙" },
  { value: "FLEXIBLE", label: "Flexible", desc: "Productive any time of day", icon: "⚡" },
] as const;

/**
 * Team size preferences.
 */
export const TEAM_SIZES = [
  { value: "SOLO", label: "Solo", desc: "Work best alone" },
  { value: "SMALL", label: "Small (2–4)", desc: "Tight-knit team" },
  { value: "MEDIUM", label: "Medium (5–8)", desc: "Balanced team" },
  { value: "LARGE", label: "Large (9+)", desc: "Large cross-functional team" },
] as const;

/**
 * Challenge appetite levels.
 */
export const CHALLENGE_PREFERENCES = [
  { value: "COMFORT", label: "Comfort Zone", desc: "Tasks that match my current skills", icon: "🛡️" },
  { value: "STRETCH", label: "Stretch Goals", desc: "Push my boundaries with guidance", icon: "🎯" },
  { value: "DEEP_END", label: "Deep End", desc: "Throw me in — I'll figure it out", icon: "🚀" },
] as const;

/**
 * Feedback style preferences.
 */
export const FEEDBACK_PREFERENCES = [
  { value: "DIRECT", label: "Direct & Blunt", desc: "Tell me exactly what's wrong, no sugar-coating", icon: "⚔️" },
  { value: "CONSTRUCTIVE", label: "Constructive", desc: "Point out issues with actionable suggestions", icon: "🔧" },
  { value: "ENCOURAGING", label: "Encouraging", desc: "Lead with positives, then address improvements", icon: "💪" },
] as const;

// ============================================
// Profile Setup — Interfaces
// ============================================

/**
 * Proficiency rating for a single programming language.
 */
export interface LanguageProficiency {
  language: string;
  proficiency: ProficiencyLevel;
  yearsOfExperience: number;
}

/**
 * A previous project entry for the experience section.
 */
export interface PreviousProject {
  name: string;
  description: string;
  role: string;
  techStack: string[];
}

/**
 * Full extended profile data stored in the `profileData` JSON column.
 * This powers the AI leader's understanding of each team member.
 */
export interface ExtendedProfileData {
  // Step 1: About You
  headline: string;
  bio: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;

  // Step 2: Technical Skills (granular)
  languageProficiencies: LanguageProficiency[];
  frameworks: string[];
  tools: string[];
  databases: string[];
  cloudPlatforms: string[];

  // Step 3: Experience & Education
  currentRole: string;
  yearsOfExperience: number;
  education: string;
  previousProjects: PreviousProject[];

  // Step 4: Work Preferences (optional)
  preferredRoles?: string[];
  communicationStyle?: string;
  availabilityHoursPerWeek?: number;
  timezone?: string;
  workSchedule?: string;
  teamSizePreference?: string;

  // Step 5: Goals & Growth (optional)
  learningGoals?: string[];
  careerGoals?: string;
  challengePreference?: string;
  feedbackPreference?: string;

  // Step 6: Resume (optional)
  hasResume?: boolean;
  resumeFileName?: string;
}

/**
 * Step definition for the profile setup wizard.
 */
export interface ProfileStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  isOptional: boolean;
}

/**
 * All 6 steps of the profile setup wizard.
 */
export const PROFILE_STEPS: ProfileStep[] = [
  { id: 0, title: "About You", subtitle: "Personal overview", icon: "👤", isOptional: false },
  { id: 1, title: "Technical Skills", subtitle: "Your tech arsenal", icon: "⚡", isOptional: false },
  { id: 2, title: "Experience", subtitle: "Your journey", icon: "💼", isOptional: false },
  { id: 3, title: "Work Style", subtitle: "How you work best", icon: "🎯", isOptional: true },
  { id: 4, title: "Goals", subtitle: "Where you're heading", icon: "🚀", isOptional: true },
  { id: 5, title: "Resume", subtitle: "Optional upload", icon: "📄", isOptional: true },
];

// ============================================
// Re-exports for convenience
// ============================================

export type { AIProvider, TaskStatus, UserLevel, BriefStatus, InvitationStatus, InvitationType };

// Phase 2 re-exports
export type { PRStatus, ConfidenceLevel, NotificationType, ReviewResult };

// ============================================
// Phase 2 — Data Shapes
// ============================================

/**
 * Shape of the standup form submission.
 */
export interface StandupFormData {
  groupId: string;
  didYesterday: string;
  planToday: string;
  blockers?: string;
}

/**
 * Shape of a code review result returned from the AI.
 */
export interface CodeReviewResult {
  result: ReviewResult;
  feedback: string;
  issues: string[];
}
