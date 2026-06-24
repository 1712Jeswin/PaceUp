"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Github,
  Link2,
  Unlink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from "lucide-react";

interface SettingsClientProps {
  groupId: string;
  initialRepoUrl: string | null;
  isLinked: boolean;
}

/**
 * Client component for group settings — GitHub repo linking.
 */
export function SettingsClient({
  groupId,
  initialRepoUrl,
  isLinked: initialIsLinked,
}: SettingsClientProps) {
  const [repoUrl, setRepoUrl] = useState(initialRepoUrl ?? "");
  const [githubPat, setGithubPat] = useState("");
  const [isLinked, setIsLinked] = useState(initialIsLinked);
  const [linkedUrl, setLinkedUrl] = useState(initialRepoUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLink = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!repoUrl.trim()) {
      setError("Please enter a GitHub repo URL");
      return;
    }

    if (!githubPat.trim()) {
      setError("Please enter your GitHub Personal Access Token");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubRepoUrl: repoUrl.trim(),
          githubPat: githubPat.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to link repository");
        return;
      }

      setIsLinked(true);
      setLinkedUrl(repoUrl.trim());
      setGithubPat("");
      setSuccessMessage("Repository linked successfully! Webhooks are now active.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/settings`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to unlink repository");
        return;
      }

      setIsLinked(false);
      setLinkedUrl(null);
      setRepoUrl("");
      setSuccessMessage("Repository unlinked. Webhooks removed.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* GitHub Integration Card */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-bg-secondary/30">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Github className="h-5 w-5 text-text-primary" />
            GitHub Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Current status */}
          {isLinked && linkedUrl ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent-green/5 border border-accent-green/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent-green" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Repository Linked
                  </p>
                  <a
                    href={linkedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                  >
                    {linkedUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={isLoading}
                className="border-accent-magenta/30 text-accent-magenta hover:bg-accent-magenta/10 hover:border-accent-magenta/50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Unlink className="h-4 w-4 mr-1" />
                    Unlink
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-url" className="text-text-secondary text-sm">
                    Repository URL
                  </Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/owner/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="pl-10 bg-bg-tertiary border-border text-text-primary placeholder:text-text-muted focus:border-accent-green focus:ring-accent-green/20"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Must be a GitHub repository you have admin access to.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github-pat" className="text-text-secondary text-sm flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5" />
                    Personal Access Token (PAT)
                  </Label>
                  <Input
                    id="github-pat"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubPat}
                    onChange={(e) => setGithubPat(e.target.value)}
                    className="bg-bg-tertiary border-border text-text-primary placeholder:text-text-muted focus:border-accent-green focus:ring-accent-green/20 font-mono text-sm"
                    disabled={isLoading}
                  />
                  <p className="text-[11px] text-text-muted">
                    Required scopes: <Badge variant="outline" className="text-[10px] text-accent-blue border-accent-blue/30 py-0 px-1.5">admin:repo_hook</Badge>{" "}
                    and <Badge variant="outline" className="text-[10px] text-accent-blue border-accent-blue/30 py-0 px-1.5">repo</Badge>.
                    Your token is encrypted before storage.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleLink}
                disabled={isLoading || !repoUrl.trim() || !githubPat.trim()}
                className="w-full h-11 bg-accent-green/10 hover:bg-accent-green/20 border border-accent-green/30 text-accent-green font-display font-semibold transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Link Repository
                  </>
                )}
              </Button>
            </>
          )}

          {/* Status messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-magenta/5 border border-accent-magenta/20">
              <AlertCircle className="h-4 w-4 text-accent-magenta shrink-0 mt-0.5" />
              <p className="text-sm text-accent-magenta">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-green/5 border border-accent-green/20">
              <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
              <p className="text-sm text-accent-green">{successMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="glass-card border-dashed border-accent-blue/20">
        <CardContent className="p-6">
          <h3 className="text-sm font-display font-semibold text-text-primary mb-3">
            What happens when you link a repo?
          </h3>
          <ul className="space-y-2 text-xs text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent-green mt-0.5">1.</span>
              PaceUp registers a webhook on your repo for push and pull request events.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green mt-0.5">2.</span>
              Every commit is automatically ingested and matched to assigned tasks using AI.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green mt-0.5">3.</span>
              File conflicts are detected when two members edit the same file on the same day.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green mt-0.5">4.</span>
              The group creator can trigger AI code reviews on completed tasks.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
