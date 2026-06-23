"use client";

import {
  SKILL_LANGUAGES,
  PROFICIENCY_LEVELS,
  PROFICIENCY_LABELS,
  PROFICIENCY_DESCRIPTIONS,
} from "@/types";
import type { LanguageProficiency, ProficiencyLevel } from "@/types";

/**
 * Language proficiency picker — shows a grid of language buttons.
 * When a language is selected, it expands to show a proficiency slider
 * and years of experience input.
 */
interface SkillProficiencyPickerProps {
  proficiencies: LanguageProficiency[];
  onChange: (_proficiencies: LanguageProficiency[]) => void;
}

export function SkillProficiencyPicker({
  proficiencies,
  onChange,
}: SkillProficiencyPickerProps) {
  const selectedLanguages = proficiencies.map((p) => p.language);

  const toggleLanguage = (language: string) => {
    if (selectedLanguages.includes(language)) {
      onChange(proficiencies.filter((p) => p.language !== language));
    } else {
      onChange([
        ...proficiencies,
        { language, proficiency: "INTERMEDIATE", yearsOfExperience: 1 },
      ]);
    }
  };

  const updateProficiency = (
    language: string,
    proficiency: ProficiencyLevel
  ) => {
    onChange(
      proficiencies.map((p) =>
        p.language === language ? { ...p, proficiency } : p
      )
    );
  };

  const updateYears = (language: string, years: number) => {
    onChange(
      proficiencies.map((p) =>
        p.language === language
          ? { ...p, yearsOfExperience: Math.max(0, Math.min(20, years)) }
          : p
      )
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">
        Programming Languages
        <span className="text-accent-magenta ml-1">*</span>
      </label>
      <p className="text-xs text-text-secondary mb-3">
        Select your languages, then rate your proficiency in each
      </p>

      {/* Language selection grid */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SKILL_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguages.includes(lang);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLanguage(lang)}
              className={`px-3 py-1.5 rounded-md text-sm font-mono border transition-all duration-200 min-h-[44px] ${
                isSelected
                  ? "bg-accent-green/10 border-accent-green text-accent-green shadow-[0_0_12px_rgba(57,255,20,0.1)]"
                  : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary hover:text-text-primary"
              }`}
            >
              {lang}
            </button>
          );
        })}
      </div>

      {/* Proficiency details for selected languages */}
      {proficiencies.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted font-display uppercase tracking-wider">
            Rate your proficiency
          </p>
          {proficiencies.map((prof) => (
            <div
              key={prof.language}
              className="p-4 rounded-xl border border-border bg-bg-secondary/50 space-y-3 animate-fade-in"
            >
              {/* Language name + remove button */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-display font-bold text-accent-green">
                  {prof.language}
                </span>
                <button
                  type="button"
                  onClick={() => toggleLanguage(prof.language)}
                  className="text-xs text-text-muted hover:text-accent-magenta transition-colors"
                  aria-label={`Remove ${prof.language}`}
                >
                  Remove
                </button>
              </div>

              {/* Proficiency level buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROFICIENCY_LEVELS.map((level) => {
                  const isActive = prof.proficiency === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => updateProficiency(prof.language, level)}
                      className={`px-2 py-2 rounded-lg border text-center transition-all duration-200 min-h-[44px] ${
                        isActive
                          ? "bg-accent-gold/10 border-accent-gold text-accent-gold"
                          : "bg-bg-tertiary border-border text-text-secondary hover:border-text-muted"
                      }`}
                    >
                      <span className="block text-xs font-display font-semibold">
                        {PROFICIENCY_LABELS[level]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Proficiency description */}
              <p className="text-[11px] text-text-muted italic">
                {PROFICIENCY_DESCRIPTIONS[prof.proficiency]}
              </p>

              {/* Years of experience */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-text-secondary whitespace-nowrap">
                  Years of experience:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateYears(
                        prof.language,
                        prof.yearsOfExperience - 1
                      )
                    }
                    className="w-7 h-7 rounded-md border border-border bg-bg-tertiary text-text-secondary hover:border-text-muted hover:text-text-primary flex items-center justify-center text-sm transition-colors"
                    disabled={prof.yearsOfExperience <= 0}
                    aria-label="Decrease years"
                  >
                    −
                  </button>
                  <span className="text-sm font-mono text-text-primary w-8 text-center">
                    {prof.yearsOfExperience}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateYears(
                        prof.language,
                        prof.yearsOfExperience + 1
                      )
                    }
                    className="w-7 h-7 rounded-md border border-border bg-bg-tertiary text-text-secondary hover:border-text-muted hover:text-text-primary flex items-center justify-center text-sm transition-colors"
                    disabled={prof.yearsOfExperience >= 20}
                    aria-label="Increase years"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
