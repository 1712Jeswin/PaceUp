"use client";

import { useState, useRef } from "react";

/**
 * Searchable tag input with dropdown suggestions.
 * Users can type to filter suggestions, select from the dropdown,
 * or add custom values. Selected tags appear as removable chips.
 */
interface SearchableTagInputProps {
  label: string;
  placeholder?: string;
  suggestions: readonly string[];
  selectedTags: string[];
  onTagsChange: (_tags: string[]) => void;
  maxTags?: number;
  allowCustom?: boolean;
}

export function SearchableTagInput({
  label,
  placeholder = "Type to search...",
  suggestions,
  selectedTags,
  onTagsChange,
  maxTags = 20,
  allowCustom = true,
}: SearchableTagInputProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(query.toLowerCase()) &&
      !selectedTags.includes(s)
  );

  const handleSelect = (tag: string) => {
    if (selectedTags.length >= maxTags) return;
    onTagsChange([...selectedTags, tag]);
    setQuery("");
    inputRef.current?.focus();
  };

  const handleRemove = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      // If the query matches a suggestion exactly, add it
      const exactMatch = suggestions.find(
        (s) => s.toLowerCase() === query.trim().toLowerCase()
      );
      if (exactMatch && !selectedTags.includes(exactMatch)) {
        handleSelect(exactMatch);
      } else if (
        allowCustom &&
        !selectedTags.includes(query.trim()) &&
        selectedTags.length < maxTags
      ) {
        handleSelect(query.trim());
      }
    } else if (
      e.key === "Backspace" &&
      !query &&
      selectedTags.length > 0
    ) {
      // Remove last tag on backspace when input is empty
      handleRemove(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label}
        {selectedTags.length > 0 && (
          <span className="ml-2 text-xs text-text-muted font-mono">
            {selectedTags.length}/{maxTags}
          </span>
        )}
      </label>

      {/* Selected tags */}
      <div
        className={`flex flex-wrap gap-1.5 p-2 rounded-lg border transition-all duration-200 min-h-[44px] cursor-text ${
          isFocused
            ? "border-accent-green bg-bg-secondary"
            : "border-border bg-bg-tertiary hover:border-text-muted"
        }`}
        onClick={() => inputRef.current?.focus()}
        role="listbox"
        aria-label={label}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(tag);
              }}
              className="ml-0.5 hover:text-accent-magenta transition-colors"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow click on dropdown
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          disabled={selectedTags.length >= maxTags}
        />
      </div>

      {/* Dropdown suggestions */}
      {isFocused && query && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-bg-secondary shadow-lg shadow-black/30">
          {filteredSuggestions.slice(0, 10).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-accent-green/10 hover:text-accent-green transition-colors font-mono"
            >
              {suggestion}
            </button>
          ))}
          {filteredSuggestions.length > 10 && (
            <p className="px-3 py-1.5 text-xs text-text-muted italic">
              {filteredSuggestions.length - 10} more — keep typing to narrow
            </p>
          )}
        </div>
      )}

      {/* Custom value hint */}
      {isFocused &&
        query.trim() &&
        filteredSuggestions.length === 0 &&
        allowCustom && (
          <p className="mt-1 text-xs text-text-muted">
            Press <kbd className="px-1 py-0.5 rounded bg-bg-tertiary border border-border text-[10px] font-mono">Enter</kbd> to add &quot;{query.trim()}&quot;
          </p>
        )}
    </div>
  );
}
