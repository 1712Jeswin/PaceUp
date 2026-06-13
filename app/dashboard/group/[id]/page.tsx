import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { CopyButton } from "@/components/copy-button";
import { HealthGauge } from "@/components/health-gauge";
import { ArrowRight, FileText, ListTodo, Users } from "lucide-react";

interface GroupDashboardProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/group/[id] — Group dashboard.
 *
 * Shows: group name, invite code (copy), member list with roles,
 * project brief summary, task board link, health score.
 */
export default async function GroupDashboardPage({
  params,
}: GroupDashboardProps) {
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
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    redirect("/dashboard");
  }

  // Fetch group details
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      createdById: true,
      members: {
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      projectBrief: {
        select: {
          id: true,
          ideaStatement: true,
          solutionApproach: true,
          deadline: true,
          scopeStatement: true,
          status: true,
        },
      },
    },
  });

  if (!group) {
    redirect("/dashboard");
  }

  const isCreator = group.createdById === user.id;
  const hasBrief = !!group.projectBrief;

  // Calculate health score (Phase 1: simple % of tasks DONE)
  let healthPercentage = 0;
  let totalTasks = 0;
  let doneTasks = 0;

  if (group.projectBrief) {
    const tasks = await db.task.findMany({
      where: { projectBriefId: group.projectBrief.id },
      select: { status: true },
    });

    totalTasks = tasks.length;
    doneTasks = tasks.filter((t) => t.status === "DONE").length;
    healthPercentage = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  }

  const deadlineStr = group.projectBrief
    ? new Date(group.projectBrief.deadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">{group.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-sm">Invite code:</span>
            <CopyButton text={group.inviteCode} label="invite code" />
          </div>
        </div>
        {hasBrief && <HealthGauge percentage={healthPercentage} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Members & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Members */}
          <div className="neon-card p-5">
            <h2 className="text-sm font-display font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({group.members.length})
            </h2>
            <div className="space-y-2">
              {group.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-bg-tertiary flex items-center justify-center">
                      <span className="text-[10px] font-display font-bold text-text-primary">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-text-primary">
                      {member.user.name}
                    </span>
                    {member.userId === group.createdById && (
                      <span className="text-[10px] text-accent-gold font-mono">
                        creator
                      </span>
                    )}
                  </div>
                  {member.role && (
                    <span className="text-[10px] text-accent-blue font-mono">
                      {member.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            {isCreator && !hasBrief && (
              <Link
                href={`/dashboard/group/${groupId}/brief`}
                className="flex items-center justify-between w-full p-3 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm font-display hover:bg-accent-green/15 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Submit Project Brief
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {hasBrief && (
              <Link
                href={`/dashboard/group/${groupId}/tasks`}
                className="flex items-center justify-between w-full p-3 rounded-lg border border-border text-text-primary text-sm font-display neon-hover"
              >
                <span className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  Task Board
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Right column: Brief summary & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {hasBrief && group.projectBrief ? (
            <>
              {/* Brief summary */}
              <div className="neon-card p-5">
                <h2 className="text-sm font-display font-semibold text-text-primary mb-4">
                  Project Brief
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">
                      Idea
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {group.projectBrief.ideaStatement}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">
                      Approach
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {group.projectBrief.solutionApproach}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">
                      Scope
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {group.projectBrief.scopeStatement}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t border-border">
                    <div>
                      <p className="text-[10px] text-text-muted font-mono">
                        DEADLINE
                      </p>
                      <p className="text-sm text-text-primary font-display">
                        {deadlineStr}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted font-mono">
                        STATUS
                      </p>
                      <p className="text-sm text-accent-gold font-display">
                        {group.projectBrief.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task stats */}
              <div className="neon-card p-5">
                <h2 className="text-sm font-display font-semibold text-text-primary mb-4">
                  Progress
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-bg-primary/50">
                    <p className="text-2xl font-display font-bold text-text-primary">
                      {doneTasks}/{totalTasks}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">
                      TASKS DONE
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-primary/50">
                    <p className="text-2xl font-display font-bold text-text-primary">
                      {Math.round(healthPercentage)}%
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">
                      HEALTH
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="neon-card p-8 text-center">
              <p className="text-text-secondary text-sm mb-2">
                No project brief submitted yet.
              </p>
              {isCreator && (
                <p className="text-text-muted text-xs">
                  Submit a brief to get AI-assigned roles and tasks for your
                  team.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
