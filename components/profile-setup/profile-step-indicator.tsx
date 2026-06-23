"use client";

import { PROFILE_STEPS } from "@/types";
import type { ProfileStep } from "@/types";

/**
 * Step indicator / progress bar for the profile setup wizard.
 * Shows all 6 steps with completion status, current step highlight,
 * and optional step labels.
 */
interface ProfileStepIndicatorProps {
  currentStep: number;
  completedSteps: Set<number>;
}

export function ProfileStepIndicator({
  currentStep,
  completedSteps,
}: ProfileStepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      {/* Desktop: horizontal stepper */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        {/* Progress line filled */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-accent-green transition-all duration-500 ease-out"
          style={{
            width: `${(currentStep / (PROFILE_STEPS.length - 1)) * 100}%`,
          }}
        />

        {PROFILE_STEPS.map((step: ProfileStep) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = step.id < currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10"
            >
              {/* Step circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-bold border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-accent-green/20 border-accent-green text-accent-green"
                    : isCurrent
                    ? "bg-accent-green/10 border-accent-green text-accent-green animate-glow-pulse"
                    : isPast
                    ? "bg-bg-tertiary border-accent-green/50 text-accent-green/50"
                    : "bg-bg-tertiary border-border text-text-muted"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center">
                <p
                  className={`text-xs font-display font-semibold transition-colors ${
                    isCurrent
                      ? "text-accent-green"
                      : isCompleted || isPast
                      ? "text-text-primary"
                      : "text-text-muted"
                  }`}
                >
                  {step.title}
                </p>
                {step.isOptional && (
                  <span className="text-[10px] text-text-muted italic">
                    optional
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: compact progress */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-display font-semibold text-accent-green">
            {PROFILE_STEPS[currentStep]?.icon}{" "}
            {PROFILE_STEPS[currentStep]?.title}
          </span>
          <span className="text-xs text-text-secondary font-mono">
            {currentStep + 1} / {PROFILE_STEPS.length}
          </span>
        </div>
        <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-green to-accent-blue rounded-full transition-all duration-500"
            style={{
              width: `${((currentStep + 1) / PROFILE_STEPS.length) * 100}%`,
            }}
          />
        </div>
        {PROFILE_STEPS[currentStep]?.isOptional && (
          <p className="text-[10px] text-text-muted italic mt-1">
            This step is optional — you can skip it
          </p>
        )}
      </div>
    </div>
  );
}
