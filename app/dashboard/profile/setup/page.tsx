"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  SKILL_DOMAINS,
  FRAMEWORKS,
  DEV_TOOLS,
  DATABASES,
  CLOUD_PLATFORMS,
  CURRENT_ROLES,
  PREFERRED_ROLES,
  COMMUNICATION_STYLES,
  WORK_SCHEDULES,
  TEAM_SIZES,
  CHALLENGE_PREFERENCES,
  FEEDBACK_PREFERENCES,
  PROFILE_STEPS,
} from "@/types";
import type {
  LanguageProficiency,
  PreviousProject,
  ExtendedProfileData,
} from "@/types";
import { ProfileStepIndicator } from "@/components/profile-setup/profile-step-indicator";
import { SkillProficiencyPicker } from "@/components/profile-setup/skill-proficiency-picker";
import { SearchableTagInput } from "@/components/profile-setup/searchable-tag-input";
import { StepCardSelector } from "@/components/profile-setup/step-card-selector";
import { ProjectEntryForm } from "@/components/profile-setup/project-entry-form";
import { ResumeUploadZone } from "@/components/profile-setup/resume-upload-zone";

/**
 * /dashboard/profile/setup — Comprehensive skill profile setup wizard.
 *
 * Hard block: users must complete this before accessing any other dashboard page.
 * 6 steps: About You, Technical Skills, Experience, Work Style, Goals, Resume.
 * Steps 1-3 are required, Steps 4-6 are optional.
 */

// ============================================
// Step validation helpers
// ============================================

function validateStep0(data: FormState): string | null {
  if (!data.headline.trim()) return "Professional headline is required";
  if (data.headline.trim().length < 5) return "Headline must be at least 5 characters";
  if (!data.bio.trim()) return "A short bio is required";
  if (data.bio.trim().length < 20) return "Bio must be at least 20 characters";
  return null;
}

function validateStep1(data: FormState): string | null {
  if (data.languageProficiencies.length === 0) {
    return "Select at least one programming language";
  }
  if (data.selectedDomains.length === 0) {
    return "Select at least one domain area";
  }
  return null;
}

function validateStep2(data: FormState): string | null {
  if (!data.currentRole) return "Select your current role";
  if (!data.education.trim()) return "Education field is required";
  return null;
}

// Steps 3, 4, 5 are optional — no validation needed

// ============================================
// Form state
// ============================================

interface FormState {
  // Step 0: About You
  headline: string;
  bio: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;

  // Step 1: Technical Skills
  languageProficiencies: LanguageProficiency[];
  selectedDomains: string[];
  frameworks: string[];
  tools: string[];
  databases: string[];
  cloudPlatforms: string[];

  // Step 2: Experience
  currentRole: string;
  yearsOfExperience: number;
  education: string;
  previousProjects: PreviousProject[];

  // Step 3: Work Style
  preferredRoles: string[];
  communicationStyle: string;
  availabilityHoursPerWeek: number;
  timezone: string;
  workSchedule: string;
  teamSizePreference: string;

  // Step 4: Goals
  learningGoals: string[];
  careerGoals: string;
  challengePreference: string;
  feedbackPreference: string;

  // Step 5: Resume
  resumeFile: File | null;
}

const INITIAL_FORM_STATE: FormState = {
  headline: "",
  bio: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  languageProficiencies: [],
  selectedDomains: [],
  frameworks: [],
  tools: [],
  databases: [],
  cloudPlatforms: [],
  currentRole: "",
  yearsOfExperience: 1,
  education: "",
  previousProjects: [],
  preferredRoles: [],
  communicationStyle: "",
  availabilityHoursPerWeek: 20,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  workSchedule: "",
  teamSizePreference: "",
  learningGoals: [],
  careerGoals: "",
  challengePreference: "",
  feedbackPreference: "",
  resumeFile: null,
};

/**
 * Derive the UserLevel enum from granular proficiency data.
 * WHY: The existing AI assignment engine reads `level` from the User model.
 * We derive it from the user's language proficiencies to avoid asking redundantly.
 */
function deriveLevel(proficiencies: LanguageProficiency[]): string {
  if (proficiencies.length === 0) return "BEGINNER";

  const profMap: Record<string, number> = {
    BEGINNER: 1,
    INTERMEDIATE: 2,
    ADVANCED: 3,
    EXPERT: 4,
  };

  const avgScore =
    proficiencies.reduce(
      (sum, p) => sum + (profMap[p.proficiency] ?? 1),
      0
    ) / proficiencies.length;

  if (avgScore >= 3) return "ADVANCED";
  if (avgScore >= 2) return "MID";
  return "BEGINNER";
}

// ============================================
// Main Component
// ============================================

export default function ProfileSetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slide direction for CSS transition
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");

  const updateForm = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setError(null);
    },
    []
  );

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

  const goToStep = (step: number) => {
    if (step > currentStep) {
      setSlideDirection("left");
    } else {
      setSlideDirection("right");
    }
    setCurrentStep(step);
    setError(null);
  };

  const handleNext = () => {
    // Validate current step if required
    let validationError: string | null = null;

    if (currentStep === 0) validationError = validateStep0(form);
    else if (currentStep === 1) validationError = validateStep1(form);
    else if (currentStep === 2) validationError = validateStep2(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    // Mark step as completed
    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    if (currentStep < PROFILE_STEPS.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Only optional steps can be skipped
    if (PROFILE_STEPS[currentStep]?.isOptional) {
      if (currentStep < PROFILE_STEPS.length - 1) {
        goToStep(currentStep + 1);
      }
    }
  };

  // ----------------------------------------
  // Submit
  // ----------------------------------------

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Build the extended profile data
      const profileData: ExtendedProfileData = {
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        location: form.location.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        githubUrl: form.githubUrl.trim() || undefined,
        portfolioUrl: form.portfolioUrl.trim() || undefined,
        languageProficiencies: form.languageProficiencies,
        frameworks: form.frameworks,
        tools: form.tools,
        databases: form.databases,
        cloudPlatforms: form.cloudPlatforms,
        currentRole: form.currentRole,
        yearsOfExperience: form.yearsOfExperience,
        education: form.education.trim(),
        previousProjects: form.previousProjects.filter((p) => p.name.trim()),
        preferredRoles: form.preferredRoles.length > 0 ? form.preferredRoles : undefined,
        communicationStyle: form.communicationStyle || undefined,
        availabilityHoursPerWeek: form.availabilityHoursPerWeek || undefined,
        timezone: form.timezone || undefined,
        workSchedule: form.workSchedule || undefined,
        teamSizePreference: form.teamSizePreference || undefined,
        learningGoals: form.learningGoals.length > 0 ? form.learningGoals : undefined,
        careerGoals: form.careerGoals.trim() || undefined,
        challengePreference: form.challengePreference || undefined,
        feedbackPreference: form.feedbackPreference || undefined,
        hasResume: form.resumeFile !== null,
        resumeFileName: form.resumeFile?.name,
      };

      // Derive skills and level from the proficiency data
      const skills = form.languageProficiencies.map((p) => p.language);
      const domains = form.selectedDomains;
      const level = deriveLevel(form.languageProficiencies);

      // Handle resume file — convert to base64 for server-side parsing
      let resumeBase64: string | null = null;
      let resumeFileType: string | null = null;
      if (form.resumeFile) {
        const buffer = await form.resumeFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Convert to base64 in chunks to avoid call stack overflow on large files
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resumeBase64 = btoa(binary);
        resumeFileType = form.resumeFile.type;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills,
          domains,
          level,
          profileData,
          resumeBase64,
          resumeFileType,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to save profile");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------
  // Render steps
  // ----------------------------------------

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  // ----------------------------------------
  // Step 0: About You
  // ----------------------------------------

  const renderStep0 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Tell us about yourself
        </h2>
        <p className="text-sm text-text-secondary">
          A quick professional snapshot — this helps teammates and the AI leader understand who you are.
        </p>
      </div>

      {/* Headline */}
      <div>
        <label
          htmlFor="headline"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Professional Headline
          <span className="text-accent-magenta ml-1">*</span>
        </label>
        <p className="text-xs text-text-secondary mb-2">
          A one-line summary of who you are (e.g., &quot;Full-Stack Developer | ML Enthusiast&quot;)
        </p>
        <input
          id="headline"
          type="text"
          value={form.headline}
          onChange={(e) => updateForm("headline", e.target.value)}
          placeholder="Full-Stack Developer | ML Enthusiast"
          maxLength={100}
          className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors min-h-[44px]"
        />
        <p className="text-xs text-text-muted mt-1 text-right">
          {form.headline.length}/100
        </p>
      </div>

      {/* Bio */}
      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Professional Summary
          <span className="text-accent-magenta ml-1">*</span>
        </label>
        <p className="text-xs text-text-secondary mb-2">
          2–3 sentences about your experience, interests, and what you bring to a team
        </p>
        <textarea
          id="bio"
          value={form.bio}
          onChange={(e) => updateForm("bio", e.target.value)}
          placeholder="I'm a computer science student passionate about building scalable web applications. I enjoy working on backend systems and have experience leading small teams on hackathon projects."
          maxLength={500}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors resize-none"
        />
        <p className="text-xs text-text-muted mt-1 text-right">
          {form.bio.length}/500
        </p>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Location
        </label>
        <input
          id="location"
          type="text"
          value={form.location}
          onChange={(e) => updateForm("location", e.target.value)}
          placeholder="Chennai, India"
          className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors min-h-[44px]"
        />
      </div>

      {/* Links */}
      <div>
        <p className="text-sm font-medium text-text-primary mb-3">
          Professional Links
          <span className="ml-2 text-xs text-text-muted">(optional)</span>
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg w-6 text-center">🔗</span>
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={(e) => updateForm("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition-colors min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg w-6 text-center">🐙</span>
            <input
              type="url"
              value={form.githubUrl}
              onChange={(e) => updateForm("githubUrl", e.target.value)}
              placeholder="https://github.com/yourusername"
              className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition-colors min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg w-6 text-center">🌐</span>
            <input
              type="url"
              value={form.portfolioUrl}
              onChange={(e) => updateForm("portfolioUrl", e.target.value)}
              placeholder="https://yourportfolio.com"
              className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition-colors min-h-[44px]"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ----------------------------------------
  // Step 1: Technical Skills
  // ----------------------------------------

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Your Technical Arsenal
        </h2>
        <p className="text-sm text-text-secondary">
          What can you build with? Rate your proficiency so the AI leader can assign the right tasks.
        </p>
      </div>

      {/* Language proficiency picker */}
      <SkillProficiencyPicker
        proficiencies={form.languageProficiencies}
        onChange={(p) => updateForm("languageProficiencies", p)}
      />

      {/* Domain areas */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Domain Areas
          <span className="text-accent-magenta ml-1">*</span>
        </label>
        <p className="text-xs text-text-secondary mb-3">
          What areas of development are you interested in or experienced with?
        </p>
        <div className="flex flex-wrap gap-2">
          {SKILL_DOMAINS.map((domain) => {
            const isSelected = form.selectedDomains.includes(domain);
            return (
              <button
                key={domain}
                type="button"
                onClick={() => {
                  const newDomains = isSelected
                    ? form.selectedDomains.filter((d) => d !== domain)
                    : [...form.selectedDomains, domain];
                  updateForm("selectedDomains", newDomains);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-mono border transition-all duration-200 min-h-[44px] ${
                  isSelected
                    ? "bg-accent-blue/10 border-accent-blue text-accent-blue shadow-[0_0_12px_rgba(0,207,255,0.1)]"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {domain}
              </button>
            );
          })}
        </div>
      </div>

      {/* Frameworks */}
      <SearchableTagInput
        label="Frameworks & Libraries"
        placeholder="Search frameworks (React, Django, Flutter...)"
        suggestions={FRAMEWORKS}
        selectedTags={form.frameworks}
        onTagsChange={(tags) => updateForm("frameworks", tags)}
        maxTags={15}
      />

      {/* Tools */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Developer Tools
        </label>
        <p className="text-xs text-text-secondary mb-3">
          Tools and platforms you use regularly
        </p>
        <div className="flex flex-wrap gap-2">
          {DEV_TOOLS.map((tool) => {
            const isSelected = form.tools.includes(tool);
            return (
              <button
                key={tool}
                type="button"
                onClick={() => {
                  const newTools = isSelected
                    ? form.tools.filter((t) => t !== tool)
                    : [...form.tools, tool];
                  updateForm("tools", newTools);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all duration-200 min-h-[36px] ${
                  isSelected
                    ? "bg-accent-gold/10 border-accent-gold text-accent-gold"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {tool}
              </button>
            );
          })}
        </div>
      </div>

      {/* Databases */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Databases
        </label>
        <div className="flex flex-wrap gap-2">
          {DATABASES.map((db) => {
            const isSelected = form.databases.includes(db);
            return (
              <button
                key={db}
                type="button"
                onClick={() => {
                  const newDbs = isSelected
                    ? form.databases.filter((d) => d !== db)
                    : [...form.databases, db];
                  updateForm("databases", newDbs);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all duration-200 min-h-[36px] ${
                  isSelected
                    ? "bg-accent-magenta/10 border-accent-magenta text-accent-magenta"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {db}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cloud Platforms */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Cloud & Deployment
        </label>
        <div className="flex flex-wrap gap-2">
          {CLOUD_PLATFORMS.map((platform) => {
            const isSelected = form.cloudPlatforms.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => {
                  const newPlatforms = isSelected
                    ? form.cloudPlatforms.filter((p) => p !== platform)
                    : [...form.cloudPlatforms, platform];
                  updateForm("cloudPlatforms", newPlatforms);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all duration-200 min-h-[36px] ${
                  isSelected
                    ? "bg-accent-blue/10 border-accent-blue text-accent-blue"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {platform}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ----------------------------------------
  // Step 2: Experience & Education
  // ----------------------------------------

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Your Journey So Far
        </h2>
        <p className="text-sm text-text-secondary">
          Tell us about your experience — this helps the AI leader calibrate task complexity and role assignments.
        </p>
      </div>

      {/* Current Role */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Current Role / Status
          <span className="text-accent-magenta ml-1">*</span>
        </label>
        <p className="text-xs text-text-secondary mb-3">
          What best describes your current position?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CURRENT_ROLES.map((role) => {
            const isSelected = form.currentRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => updateForm("currentRole", role)}
                className={`px-3 py-2.5 rounded-lg border text-sm text-center transition-all duration-200 min-h-[44px] ${
                  isSelected
                    ? "bg-accent-green/10 border-accent-green text-accent-green font-semibold"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Years of experience */}
      <div>
        <label
          htmlFor="years"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Years of Coding Experience
        </label>
        <div className="flex items-center gap-4">
          <input
            id="years"
            type="range"
            min={0}
            max={15}
            value={form.yearsOfExperience}
            onChange={(e) =>
              updateForm("yearsOfExperience", parseInt(e.target.value, 10))
            }
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-accent-green bg-bg-tertiary"
          />
          <span className="text-sm font-mono text-accent-green font-bold min-w-[50px] text-center bg-bg-tertiary px-3 py-1.5 rounded-lg border border-border">
            {form.yearsOfExperience === 15
              ? "15+"
              : form.yearsOfExperience}
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
          <span>Just started</span>
          <span>5 years</span>
          <span>10 years</span>
          <span>15+ years</span>
        </div>
      </div>

      {/* Education */}
      <div>
        <label
          htmlFor="education"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Education
          <span className="text-accent-magenta ml-1">*</span>
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Your degree, field, and institution (e.g., &quot;B.Tech Computer Science — IIT Madras&quot;)
        </p>
        <input
          id="education"
          type="text"
          value={form.education}
          onChange={(e) => updateForm("education", e.target.value)}
          placeholder="B.Tech Computer Science — University Name"
          className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors min-h-[44px]"
        />
      </div>

      {/* Previous Projects */}
      <ProjectEntryForm
        projects={form.previousProjects}
        onChange={(p) => updateForm("previousProjects", p)}
      />
    </div>
  );

  // ----------------------------------------
  // Step 3: Work Preferences (optional)
  // ----------------------------------------

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          How Do You Work Best?
        </h2>
        <p className="text-sm text-text-secondary">
          These preferences help the AI leader assign you roles and tasks that match your work style.
        </p>
        <p className="text-xs text-accent-blue mt-1 italic">
          This step is optional — skip it if you&apos;re not sure yet.
        </p>
      </div>

      {/* Preferred Roles */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Preferred Team Roles
        </label>
        <p className="text-xs text-text-secondary mb-3">
          What roles do you gravitate towards on a team?
        </p>
        <div className="flex flex-wrap gap-2">
          {PREFERRED_ROLES.map((role) => {
            const isSelected = form.preferredRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  const newRoles = isSelected
                    ? form.preferredRoles.filter((r) => r !== role)
                    : [...form.preferredRoles, role];
                  updateForm("preferredRoles", newRoles);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-mono border transition-all duration-200 min-h-[44px] ${
                  isSelected
                    ? "bg-accent-green/10 border-accent-green text-accent-green"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Communication Style */}
      <StepCardSelector
        label="Communication Style"
        options={COMMUNICATION_STYLES}
        value={form.communicationStyle}
        onChange={(v) => updateForm("communicationStyle", v as string)}
        columns={3}
      />

      {/* Availability */}
      <div>
        <label
          htmlFor="availability"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Weekly Availability
        </label>
        <p className="text-xs text-text-secondary mb-2">
          How many hours per week can you dedicate to project work?
        </p>
        <div className="flex items-center gap-4">
          <input
            id="availability"
            type="range"
            min={1}
            max={40}
            value={form.availabilityHoursPerWeek}
            onChange={(e) =>
              updateForm(
                "availabilityHoursPerWeek",
                parseInt(e.target.value, 10)
              )
            }
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-accent-blue bg-bg-tertiary"
          />
          <span className="text-sm font-mono text-accent-blue font-bold min-w-[60px] text-center bg-bg-tertiary px-3 py-1.5 rounded-lg border border-border">
            {form.availabilityHoursPerWeek}h/wk
          </span>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label
          htmlFor="timezone"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Timezone
        </label>
        <input
          id="timezone"
          type="text"
          value={form.timezone}
          onChange={(e) => updateForm("timezone", e.target.value)}
          placeholder="Asia/Kolkata"
          className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors min-h-[44px]"
        />
      </div>

      {/* Work Schedule */}
      <StepCardSelector
        label="When Are You Most Productive?"
        options={WORK_SCHEDULES}
        value={form.workSchedule}
        onChange={(v) => updateForm("workSchedule", v as string)}
        columns={4}
      />

      {/* Team Size */}
      <StepCardSelector
        label="Ideal Team Size"
        options={TEAM_SIZES}
        value={form.teamSizePreference}
        onChange={(v) => updateForm("teamSizePreference", v as string)}
        columns={4}
      />
    </div>
  );

  // ----------------------------------------
  // Step 4: Goals & Growth (optional)
  // ----------------------------------------

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Where Are You Heading?
        </h2>
        <p className="text-sm text-text-secondary">
          Your growth goals help the AI leader assign tasks that develop your skills — not just get work done.
        </p>
        <p className="text-xs text-accent-blue mt-1 italic">
          This step is optional — skip it if you prefer.
        </p>
      </div>

      {/* Learning Goals */}
      <SearchableTagInput
        label="Skills You Want to Develop"
        placeholder="What do you want to learn? (e.g., System Design, React, ML)"
        suggestions={[
          "System Design",
          "Distributed Systems",
          "Machine Learning",
          "Deep Learning",
          "React",
          "Next.js",
          "GraphQL",
          "Kubernetes",
          "AWS",
          "Data Structures",
          "Algorithms",
          "UI/UX Design",
          "DevOps",
          "CI/CD",
          "Testing",
          "Security",
          "Blockchain",
          "Mobile Development",
          "Technical Writing",
          "Leadership",
          "Project Management",
          "API Design",
          "Database Design",
          "Performance Optimization",
          "Accessibility",
        ]}
        selectedTags={form.learningGoals}
        onTagsChange={(tags) => updateForm("learningGoals", tags)}
        maxTags={10}
      />

      {/* Career Goals */}
      <div>
        <label
          htmlFor="career-goals"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Career Direction
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Where do you see yourself in 2–3 years? What kind of work excites you?
        </p>
        <textarea
          id="career-goals"
          value={form.careerGoals}
          onChange={(e) => updateForm("careerGoals", e.target.value)}
          placeholder="I want to become a strong backend engineer who can design scalable systems. I'm also interested in transitioning into ML engineering..."
          maxLength={500}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors resize-none"
        />
        <p className="text-xs text-text-muted mt-1 text-right">
          {form.careerGoals.length}/500
        </p>
      </div>

      {/* Challenge Preference */}
      <StepCardSelector
        label="Challenge Appetite"
        options={CHALLENGE_PREFERENCES}
        value={form.challengePreference}
        onChange={(v) => updateForm("challengePreference", v as string)}
        columns={3}
      />

      {/* Feedback Preference */}
      <StepCardSelector
        label="How Do You Prefer Feedback?"
        options={FEEDBACK_PREFERENCES}
        value={form.feedbackPreference}
        onChange={(v) => updateForm("feedbackPreference", v as string)}
        columns={3}
      />
    </div>
  );

  // ----------------------------------------
  // Step 5: Resume Upload (optional)
  // ----------------------------------------

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Supercharge Your Profile
        </h2>
        <p className="text-sm text-text-secondary">
          Upload your resume and the AI leader will parse it to deeply understand your background,
          experience, and expertise — leading to more accurate task assignments.
        </p>
        <p className="text-xs text-accent-blue mt-1 italic">
          This step is completely optional — you can skip it.
        </p>
      </div>

      <ResumeUploadZone
        file={form.resumeFile}
        onFileChange={(file) => updateForm("resumeFile", file)}
      />

      {/* Info box */}
      <div className="p-4 rounded-xl border border-border bg-bg-secondary/50">
        <h3 className="text-sm font-display font-semibold text-text-primary mb-2">
          🔒 How your resume is used
        </h3>
        <ul className="space-y-1.5 text-xs text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-0.5">✓</span>
            Parsed to extract key skills, experience, and education data
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-0.5">✓</span>
            Used by the AI leader for better role and task assignments
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-green mt-0.5">✓</span>
            Stored securely in your profile — only you can see it
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-magenta mt-0.5">✗</span>
            Never shared with other users or external services
          </li>
        </ul>
      </div>
    </div>
  );

  // ----------------------------------------
  // Is final step?
  // ----------------------------------------

  const isFinalStep = currentStep === PROFILE_STEPS.length - 1;
  const isOptionalStep = PROFILE_STEPS[currentStep]?.isOptional ?? false;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-text-primary">
          Set Up Your Profile
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          The more the AI leader knows about you, the better it can assign roles and tasks.
        </p>
      </div>

      {/* Step indicator */}
      <ProfileStepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Step content with slide animation */}
      <div className="relative overflow-hidden">
        <div
          key={currentStep}
          className={`transition-all duration-300 ease-out ${
            slideDirection === "left"
              ? "animate-fade-in"
              : "animate-fade-in"
          }`}
        >
          <div className="p-6 rounded-2xl border border-border bg-bg-secondary/30 backdrop-blur-sm">
            {renderStep()}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-accent-magenta/10 border border-accent-magenta/30">
          <p className="text-accent-magenta text-sm" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6 gap-3">
        {/* Back button */}
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className={`px-5 py-2.5 rounded-lg font-display font-semibold text-sm transition-all duration-200 min-h-[44px] ${
            currentStep === 0
              ? "opacity-0 pointer-events-none"
              : "border border-border text-text-secondary hover:border-text-secondary hover:text-text-primary"
          }`}
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {/* Skip button for optional steps */}
          {isOptionalStep && !isFinalStep && (
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2.5 rounded-lg text-text-muted text-sm hover:text-text-secondary transition-colors min-h-[44px]"
            >
              Skip
            </button>
          )}

          {/* Next / Submit button */}
          {isFinalStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-8 py-2.5 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 min-h-[44px] shadow-[0_0_20px_rgba(57,255,20,0.15)]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  Saving Profile...
                </span>
              ) : (
                "Complete Setup ✓"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200 min-h-[44px]"
            >
              Continue →
            </button>
          )}
        </div>
      </div>

      {/* Skip to finish for optional steps */}
      {isOptionalStep && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="text-xs text-text-muted hover:text-accent-green transition-colors underline underline-offset-2"
          >
            Skip remaining optional steps and finish setup
          </button>
        </div>
      )}
    </div>
  );
}
