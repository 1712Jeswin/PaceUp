import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCommit, GitPullRequest, FileCode2, AlertTriangle } from "lucide-react";

interface CommitsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/group/[id]/commits - Commit feed page.
 * Shows all commits ingested from the linked GitHub repo.
 */
export default async function CommitsPage({ params }: CommitsPageProps) {
  const { id: groupId } = await params;
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Verify membership
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    select: { id: true },
  });

  if (!membership) {
    redirect("/dashboard");
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      githubRepoUrl: true,
    },
  });

  if (!group) {
    redirect("/dashboard");
  }

  // Fetch commits with their task links
  const commits = await db.commit.findMany({
    where: { groupId },
    select: {
      id: true,
      sha: true,
      message: true,
      authorGithubUsername: true,
      filesChanged: true,
      timestamp: true,
      taskLinks: {
        select: {
          confidence: true,
          task: {
            select: { id: true, title: true },
          },
        },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  // Fetch pull requests
  const pullRequests = await db.pullRequest.findMany({
    where: { groupId },
    select: {
      id: true,
      number: true,
      title: true,
      authorGithubUsername: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const confidenceColors: Record<string, string> = {
    HIGH: "border-accent-gold/50 text-accent-gold bg-accent-gold/5",
    MEDIUM: "border-accent-blue/50 text-accent-blue bg-accent-blue/5",
    LOW: "border-text-muted text-text-secondary",
  };

  const prStatusColors: Record<string, string> = {
    OPEN: "border-accent-green/50 text-accent-green bg-accent-green/5",
    MERGED: "border-accent-blue/50 text-accent-blue bg-accent-blue/5",
    CLOSED: "border-accent-magenta/50 text-accent-magenta bg-accent-magenta/5",
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient-neon mb-2">
            Commit Feed
          </h1>
          <Badge
            variant="outline"
            className="border-border text-text-secondary bg-bg-secondary/50 font-mono text-xs"
          >
            {group.name}
          </Badge>
        </div>
        {group.githubRepoUrl && (
          <a
            href={group.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-blue hover:underline font-mono"
          >
            {group.githubRepoUrl}
          </a>
        )}
      </div>

      {!group.githubRepoUrl ? (
        <Card className="glass-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <GitCommit className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2">
              No repository linked
            </h3>
            <p className="text-text-secondary text-sm max-w-sm mx-auto">
              Link a GitHub repository in group settings to start tracking commits.
            </p>
          </CardContent>
        </Card>
      ) : commits.length === 0 ? (
        <Card className="glass-card border-dashed border-accent-gold/30">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <GitCommit className="w-12 h-12 text-accent-gold mb-4 opacity-50" />
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2">
              Waiting for commits
            </h3>
            <p className="text-text-secondary text-sm max-w-sm mx-auto">
              Push code to the linked repository and commits will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Commits column */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-display font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-accent-green" />
              Commits ({commits.length})
            </h2>

            <div className="space-y-2">
              {commits.map((commit) => {
                const files = commit.filesChanged as string[];
                return (
                  <Card key={commit.id} className="glass-card hover:border-border/60 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary font-medium truncate">
                            {commit.message.split("\n")[0]}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-accent-blue font-mono">
                              {commit.sha.slice(0, 7)}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              {commit.authorGithubUsername}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              {new Date(commit.timestamp).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Files changed */}
                          {files.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <FileCode2 className="h-3 w-3 text-text-muted shrink-0" />
                              {files.slice(0, 3).map((file) => (
                                <span
                                  key={file}
                                  className="text-[10px] text-text-muted font-mono bg-bg-tertiary/50 px-1.5 py-0.5 rounded"
                                >
                                  {file.split("/").pop()}
                                </span>
                              ))}
                              {files.length > 3 && (
                                <span className="text-[10px] text-text-muted">
                                  +{files.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Task links */}
                          {commit.taskLinks.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {commit.taskLinks.map((link) => (
                                <Badge
                                  key={link.task.id}
                                  variant="outline"
                                  className={`text-[10px] font-mono ${confidenceColors[link.confidence]}`}
                                >
                                  {link.task.title} ({link.confidence})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Pull requests column */}
          <div className="space-y-4">
            <h2 className="text-sm font-display font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-accent-blue" />
              Pull Requests ({pullRequests.length})
            </h2>

            {pullRequests.length === 0 ? (
              <Card className="glass-card border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-xs text-text-muted">No pull requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pullRequests.map((pr) => (
                  <Card key={pr.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-text-primary font-medium truncate">
                            {pr.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-text-muted font-mono">
                              #{pr.number}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              {pr.authorGithubUsername}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono shrink-0 ${prStatusColors[pr.status]}`}
                        >
                          {pr.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Placeholder for conflict alerts */}
            <ConflictAlerts groupId={groupId} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Server component that shows unresolved conflict alerts for the group.
 */
async function ConflictAlerts({ groupId }: { groupId: string }) {
  const conflicts = await db.conflictAlert.findMany({
    where: { groupId, resolvedAt: null },
    select: {
      id: true,
      filename: true,
      memberIds: true,
      detectedAt: true,
    },
    orderBy: { detectedAt: "desc" },
    take: 10,
  });

  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-4 mt-6">
      <h2 className="text-sm font-display font-semibold text-accent-magenta uppercase tracking-wider flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Conflicts ({conflicts.length})
      </h2>
      <div className="space-y-2">
        {conflicts.map((conflict) => (
          <Card key={conflict.id} className="glass-card border-accent-magenta/20">
            <CardContent className="p-4">
              <p className="text-sm text-text-primary font-mono truncate">
                {conflict.filename}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {new Date(conflict.detectedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
