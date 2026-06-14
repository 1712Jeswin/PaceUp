"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

interface JoinGroupButtonProps {
  inviteCode: string;
  groupId: string;
}

/**
 * Client component for the "Request to Join" button on the invite page.
 * Calls POST /api/groups/join to submit a join request (pending creator approval).
 */
export function JoinGroupButton({ inviteCode }: JoinGroupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRequestSent, setIsRequestSent] = useState(false);

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
        setError(data.error ?? "Failed to submit join request");
        return;
      }

      setIsRequestSent(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isRequestSent) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-accent-blue">
          <Clock className="h-5 w-5" />
          <span className="text-sm font-mono">Request sent</span>
        </div>
        <p className="text-text-muted text-xs">
          Waiting for the group creator to approve your request.
        </p>
      </div>
    );
  }

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
            Sending Request...
          </span>
        ) : (
          "Request to Join"
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
