"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SKILL_LANGUAGES, SKILL_DOMAINS } from "@/types";

/**
 * /dashboard/profile/setup — Skill profile setup page.
 *
 * Hard block: users must complete this before accessing any other dashboard page.
 * Fields: programming languages, domain areas, comfort level.
 */
export default function ProfileSetupPage() {
  const router = useRouter();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [level, setLevel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedSkills.length === 0) {
      setError("Select at least one programming language");
      return;
    }
    if (selectedDomains.length === 0) {
      setError("Select at least one domain");
      return;
    }
    if (!level) {
      setError("Select your comfort level");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: selectedSkills,
          domains: selectedDomains,
          level,
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
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-2">
        Set Up Your Profile
      </h1>
      <p className="text-text-secondary text-sm mb-8">
        Tell us about your skills so the AI can assign you the right tasks.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Programming Languages */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Programming Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {SKILL_LANGUAGES.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-md text-sm font-mono border transition-all duration-200 ${
                  selectedSkills.includes(skill)
                    ? "bg-accent-green/10 border-accent-green text-accent-green"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Domain Areas */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Domain Areas
          </label>
          <div className="flex flex-wrap gap-2">
            {SKILL_DOMAINS.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => toggleDomain(domain)}
                className={`px-3 py-1.5 rounded-md text-sm font-mono border transition-all duration-200 ${
                  selectedDomains.includes(domain)
                    ? "bg-accent-blue/10 border-accent-blue text-accent-blue"
                    : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {/* Comfort Level */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Comfort Level
          </label>
          <div className="flex gap-3">
            {[
              { value: "BEGINNER", label: "Beginner", desc: "Just getting started" },
              { value: "MID", label: "Mid", desc: "Comfortable building things" },
              { value: "ADVANCED", label: "Advanced", desc: "Can lead a module" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLevel(option.value)}
                className={`flex-1 p-3 rounded-lg border text-left transition-all duration-200 ${
                  level === option.value
                    ? "bg-accent-gold/10 border-accent-gold"
                    : "bg-bg-tertiary border-border hover:border-text-secondary"
                }`}
              >
                <span
                  className={`block text-sm font-display font-semibold ${
                    level === option.value
                      ? "text-accent-gold"
                      : "text-text-primary"
                  }`}
                >
                  {option.label}
                </span>
                <span className="block text-xs text-text-secondary mt-0.5">
                  {option.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-accent-magenta text-sm" role="alert">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Profile"
          )}
        </button>
      </form>
    </div>
  );
}
