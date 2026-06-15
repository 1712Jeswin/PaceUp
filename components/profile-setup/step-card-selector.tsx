"use client";

/**
 * Card-based single or multi-select component.
 * Renders a grid of selectable cards with optional icons and descriptions.
 * Used for work style preferences, communication style, challenge appetite, etc.
 */
interface CardOption {
  value: string;
  label: string;
  desc: string;
  icon?: string;
}

interface StepCardSelectorProps {
  label: string;
  options: readonly CardOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  isMultiSelect?: boolean;
  columns?: 2 | 3 | 4;
}

export function StepCardSelector({
  label,
  options,
  value,
  onChange,
  isMultiSelect = false,
  columns = 3,
}: StepCardSelectorProps) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const handleSelect = (optionValue: string) => {
    if (isMultiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const isAlreadySelected = currentValues.includes(optionValue);
      const newValues = isAlreadySelected
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
    }
  };

  const gridClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-3";

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-3">
        {label}
        {isMultiSelect && (
          <span className="ml-2 text-xs text-text-muted">(select all that apply)</span>
        )}
      </label>

      <div className={`grid ${gridClass} gap-3`}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group min-h-[44px] ${
                isSelected
                  ? "bg-accent-green/5 border-accent-green shadow-[0_0_20px_rgba(57,255,20,0.08)]"
                  : "bg-bg-tertiary border-border hover:border-text-muted hover:bg-bg-secondary"
              }`}
            >
              {/* Selection indicator */}
              {isMultiSelect && (
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-accent-green border-accent-green"
                      : "border-border group-hover:border-text-muted"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-bg-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              )}

              {/* Icon */}
              {option.icon && (
                <span className="text-xl mb-1 block">{option.icon}</span>
              )}

              {/* Label */}
              <span
                className={`block text-sm font-display font-semibold transition-colors ${
                  isSelected ? "text-accent-green" : "text-text-primary"
                }`}
              >
                {option.label}
              </span>

              {/* Description */}
              <span className="block text-xs text-text-secondary mt-1 leading-relaxed">
                {option.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
