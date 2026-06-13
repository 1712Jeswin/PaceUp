"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JoinGroupButtonProps {
  inviteCode: string;
  groupId: string;
}

/**
 * Client component for the "Join Group" button on the invite page.
 * Calls POST /api/groups/join and redirects to the group dashboard on success.
 */
export function JoinGroupButton({ inviteCode, groupId }: JoinGroupButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to join group");
        return;
      }

      router.push(`/dashboard/group/${groupId}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleJoin}
        disabled={isLoading}
        className="w-full py-2.5 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
            Joining...
          </span>
        ) : (
          "Join Group"
        )}
      </button>

      {error && (
        <p className="text-accent-magenta text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
