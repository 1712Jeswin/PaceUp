"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Loader2,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  Clock,
} from "lucide-react";

interface StandupResponse {
  id: string;
  didYesterday: string;
  planToday: string;
  blockers: string | null;
  submittedAt: string;
  user: {
    id: string;
    name: string;
  };
}

interface StandupClientProps {
  groupId: string;
  userId: string;
  hasSubmittedToday: boolean;
  initialResponses: StandupResponse[];
}

/**
 * Client component for daily standup — form and responses viewer.
 */
export function StandupClient({
  groupId,
  userId,
  hasSubmittedToday,
  initialResponses,
}: StandupClientProps) {
  const [hasSubmitted, setHasSubmitted] = useState(hasSubmittedToday);
  const [responses, setResponses] = useState<StandupResponse[]>(initialResponses);
  const [didYesterday, setDidYesterday] = useState("");
  const [planToday, setPlanToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!didYesterday.trim() || !planToday.trim()) {
      setError("Please fill in what you did yesterday and what you plan to do today.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          didYesterday: didYesterday.trim(),
          planToday: planToday.trim(),
          blockers: blockers.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to submit standup");
        return;
      }

      setHasSubmitted(true);
      setResponses((prev) => [...prev, data.data]);
      setDidYesterday("");
      setPlanToday("");
      setBlockers("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Standup Form */}
      {!hasSubmitted ? (
        <Card className="glass-card overflow-hidden border-accent-green/20">
          <CardHeader className="border-b border-border/30 bg-accent-green/5">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent-green" />
              Your Daily Standup
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm text-text-secondary font-medium block">
                What did you do yesterday?
              </label>
              <textarea
                value={didYesterday}
                onChange={(e) => setDidYesterday(e.target.value)}
                placeholder="Completed the login flow, fixed the navbar bug..."
                className="w-full min-h-[80px] p-3 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm placeholder:text-text-muted focus:border-accent-green focus:ring-1 focus:ring-accent-green/20 resize-none transition-colors outline-none"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-text-secondary font-medium block">
                What do you plan to do today?
              </label>
              <textarea
                value={planToday}
                onChange={(e) => setPlanToday(e.target.value)}
                placeholder="Implement the API route for task updates, write tests..."
                className="w-full min-h-[80px] p-3 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm placeholder:text-text-muted focus:border-accent-green focus:ring-1 focus:ring-accent-green/20 resize-none transition-colors outline-none"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-text-secondary font-medium block">
                Any blockers? <span className="text-text-muted">(optional)</span>
              </label>
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Waiting on API docs, need help with deployment..."
                className="w-full min-h-[60px] p-3 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm placeholder:text-text-muted focus:border-accent-magenta focus:ring-1 focus:ring-accent-magenta/20 resize-none transition-colors outline-none"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-magenta/5 border border-accent-magenta/20">
                <AlertCircle className="h-4 w-4 text-accent-magenta shrink-0 mt-0.5" />
                <p className="text-sm text-accent-magenta">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isLoading || !didYesterday.trim() || !planToday.trim()}
              className="w-full h-11 bg-accent-green/10 hover:bg-accent-green/20 border border-accent-green/30 text-accent-green font-display font-semibold transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Standup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-accent-gold/20">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent-gold" />
            <p className="text-sm text-accent-gold font-medium">
              You have submitted your standup for today.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Team Responses */}
      <div className="space-y-4">
        <h2 className="text-sm font-display font-semibold text-text-secondary uppercase tracking-wider">
          Team Responses
        </h2>

        {responses.length === 0 ? (
          <Card className="glass-card border-dashed">
            <CardContent className="p-8 text-center">
              <Clock className="h-8 w-8 text-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-text-muted">
                No standups submitted yet today. Be the first!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {responses.map((response) => (
              <Card
                key={response.id}
                className={`glass-card transition-colors ${
                  response.user.id === userId
                    ? "border-accent-green/20"
                    : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                        <span className="text-xs font-display font-bold text-accent-blue">
                          {response.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {response.user.name}
                          {response.user.id === userId && (
                            <span className="text-accent-green text-[10px] ml-2 font-mono">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-text-muted font-mono">
                          {new Date(response.submittedAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-accent-blue font-mono tracking-wider uppercase mb-1">
                        Yesterday
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed bg-bg-tertiary/20 p-3 rounded-md border border-border/30">
                        {response.didYesterday}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-accent-green font-mono tracking-wider uppercase mb-1">
                        Today
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed bg-bg-tertiary/20 p-3 rounded-md border border-border/30">
                        {response.planToday}
                      </p>
                    </div>
                    {response.blockers && (
                      <div>
                        <p className="text-[11px] text-accent-magenta font-mono tracking-wider uppercase mb-1">
                          Blockers
                        </p>
                        <p className="text-sm text-text-secondary leading-relaxed bg-accent-magenta/5 p-3 rounded-md border border-accent-magenta/20">
                          {response.blockers}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
