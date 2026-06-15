"use client";

import { useState } from "react";
import type { PreviousProject } from "@/types";

/**
 * Dynamic form for adding up to 3 previous projects.
 * Each project has: name, description, role, and tech stack tags.
 */

const MAX_PROJECTS = 3;

interface ProjectEntryFormProps {
  projects: PreviousProject[];
  onChange: (projects: PreviousProject[]) => void;
}

export function ProjectEntryForm({
  projects,
  onChange,
}: ProjectEntryFormProps) {
  const [techInput, setTechInput] = useState<Record<number, string>>({});

  const addProject = () => {
    if (projects.length >= MAX_PROJECTS) return;
    onChange([
      ...projects,
      { name: "", description: "", role: "", techStack: [] },
    ]);
  };

  const removeProject = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  const updateProject = (
    index: number,
    field: keyof PreviousProject,
    value: string | string[]
  ) => {
    onChange(
      projects.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const addTechTag = (index: number) => {
    const tag = techInput[index]?.trim();
    if (!tag) return;
    const project = projects[index];
    if (project.techStack.includes(tag)) return;
    updateProject(index, "techStack", [...project.techStack, tag]);
    setTechInput({ ...techInput, [index]: "" });
  };

  const removeTechTag = (projectIndex: number, tag: string) => {
    const project = projects[projectIndex];
    updateProject(
      projectIndex,
      "techStack",
      project.techStack.filter((t) => t !== tag)
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="block text-sm font-medium text-text-primary">
            Notable Projects
          </label>
          <p className="text-xs text-text-secondary mt-0.5">
            Showcase up to {MAX_PROJECTS} projects you&apos;re proud of
          </p>
        </div>
        {projects.length < MAX_PROJECTS && (
          <button
            type="button"
            onClick={addProject}
            className="px-3 py-1.5 rounded-lg border border-accent-green/30 text-accent-green text-xs font-display font-semibold hover:bg-accent-green/10 transition-all min-h-[44px]"
          >
            + Add Project
          </button>
        )}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-8 rounded-xl border border-dashed border-border">
          <p className="text-text-muted text-sm">No projects added yet</p>
          <button
            type="button"
            onClick={addProject}
            className="mt-3 px-4 py-2 rounded-lg bg-accent-green/10 border border-accent-green/30 text-accent-green text-sm font-display font-semibold hover:bg-accent-green/15 transition-all min-h-[44px]"
          >
            + Add Your First Project
          </button>
        </div>
      )}

      <div className="space-y-4">
        {projects.map((project, index) => (
          <div
            key={index}
            className="p-4 rounded-xl border border-border bg-bg-secondary/50 space-y-3 animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold text-accent-blue uppercase tracking-wider">
                Project {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeProject(index)}
                className="text-xs text-text-muted hover:text-accent-magenta transition-colors"
                aria-label={`Remove project ${index + 1}`}
              >
                Remove
              </button>
            </div>

            {/* Project name */}
            <input
              type="text"
              value={project.name}
              onChange={(e) =>
                updateProject(index, "name", e.target.value)
              }
              placeholder="Project name"
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors min-h-[44px]"
            />

            {/* Description */}
            <textarea
              value={project.description}
              onChange={(e) =>
                updateProject(index, "description", e.target.value)
              }
              placeholder="Brief description of what you built and the impact"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors resize-none"
            />

            {/* Role */}
            <input
              type="text"
              value={project.role}
              onChange={(e) =>
                updateProject(index, "role", e.target.value)
              }
              placeholder="Your role (e.g., Lead Developer, UI Designer)"
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green focus:outline-none transition-colors min-h-[44px]"
            />

            {/* Tech stack tags */}
            <div>
              <p className="text-xs text-text-secondary mb-1">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {project.techStack.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-mono"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTechTag(index, tag)}
                      className="ml-0.5 hover:text-accent-magenta transition-colors"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={techInput[index] ?? ""}
                  onChange={(e) =>
                    setTechInput({ ...techInput, [index]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTechTag(index);
                    }
                  }}
                  placeholder="Add tech (e.g., React, Python)"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border text-xs text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none transition-colors min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => addTechTag(index)}
                  className="px-3 py-1.5 rounded-lg border border-accent-gold/30 text-accent-gold text-xs font-display hover:bg-accent-gold/10 transition-all min-h-[44px]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
