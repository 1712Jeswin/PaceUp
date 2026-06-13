"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * /dashboard/new-group — Create a new project group.
 *
 * Form with group name input and submit button.
 * On success: redirects to the new group's dashboard.
 */
export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to create group");
        return;
      }

      router.push(`/dashboard/group/${data.data.id}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-2">Create a Group</h1>
      <p className="text-text-secondary text-sm mb-8">
        Start a new project group. You&apos;ll get an invite code to share with
        your team.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="group-name"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Group Name
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Team Alpha — Capstone Project"
            maxLength={100}
            required
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted font-body text-sm neon-focus disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-accent-magenta text-sm" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || name.trim().length === 0}
          className="w-full py-2.5 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            "Create Group"
          )}
        </button>
      </form>
    </div>
  );
}
