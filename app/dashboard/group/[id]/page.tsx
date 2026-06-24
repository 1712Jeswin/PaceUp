import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { CopyButton } from "@/components/copy-button";
import { HealthGauge } from "@/components/health-gauge";
import { GroupInvitePanel } from "@/components/group-invite-panel";
import { ArrowRight, FileText, ListTodo, Users, ShieldAlert, GitCommit, MessageSquare, Settings } from "lucide-react";
import { getOrCreateUser } from "@/lib/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GroupDashboardProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/group/[id] — Group dashboard.
 */
export default async function GroupDashboardPage({ params }: GroupDashboardProps) {
  const { id: groupId } = await params;
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const user = await getOrCreateUser(clerkId);
  if (!user) {
    redirect("/sign-in");
  }

  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    select: { id: true, isActive: true },
  });

  if (!membership || !membership.isActive) {
    redirect("/dashboard");
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      createdById: true,
      members: {
        where: { isActive: true },
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, name: true, email: true } },
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
    <div className="max-w-5xl mx-auto animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-border/50">
        <div>
          <h1 className="text-3xl font-display font-bold mb-3 text-text-primary">
            {group.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-border text-text-secondary bg-bg-secondary">
              Invite code
            </Badge>
            <CopyButton text={group.inviteCode} label="invite code" />
            {isCreator && (
              <Badge variant="outline" className="border-accent-gold/30 text-accent-gold bg-accent-gold/5 flex gap-1 items-center">
                <ShieldAlert className="w-3 h-3" /> Creator
              </Badge>
            )}
          </div>
        </div>
        {hasBrief && <HealthGauge percentage={healthPercentage} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Members, Quick Actions, Invite Panel */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Members Card */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/30 bg-bg-secondary/30">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-blue" />
                Team Members ({group.members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {group.members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-4 hover:bg-bg-tertiary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                        <span className="text-xs font-display font-bold text-accent-blue">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-text-primary font-medium">
                          {member.user.name}
                        </span>
                        {member.userId === group.createdById && (
                          <span className="text-[10px] text-accent-gold font-mono">
                            CREATOR
                          </span>
                        )}
                      </div>
                    </div>
                    {member.role ? (
                      <Badge variant="outline" className="text-[10px] text-accent-green border-accent-green/20 bg-accent-green/5 font-mono uppercase">
                        {member.role}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-text-muted font-mono">Unassigned</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="space-y-3">
            {isCreator && !hasBrief && (
              <Button asChild className="w-full h-12 bg-accent-green/10 hover:bg-accent-green/20 border border-accent-green/30 text-accent-green neon-focus transition-all group">
                <Link href={`/dashboard/group/${groupId}/brief`} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Submit Project Brief
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            )}

            {hasBrief && (
              <Button asChild variant="outline" className="w-full h-12 glass-panel hover:border-accent-blue/50 hover:text-accent-blue transition-all group">
                <Link href={`/dashboard/group/${groupId}/tasks`} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Task Board
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            )}

            <Button asChild variant="outline" className="w-full h-12 glass-panel hover:border-accent-blue/50 hover:text-accent-blue transition-all group">
              <Link href={`/dashboard/group/${groupId}/commits`} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4" />
                  Commit Feed
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full h-12 glass-panel hover:border-accent-green/50 hover:text-accent-green transition-all group">
              <Link href={`/dashboard/group/${groupId}/standup`} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Daily Standup
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            {isCreator && (
              <Button asChild variant="outline" className="w-full h-12 glass-panel hover:border-accent-gold/50 hover:text-accent-gold transition-all group">
                <Link href={`/dashboard/group/${groupId}/settings`} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Group Settings
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            )}
          </div>

          {/* Invite / Leave panel */}
          <GroupInvitePanel groupId={groupId} isCreator={isCreator} />
        </div>

        {/* Right column: Brief summary & Stats */}
        <div className="lg:col-span-2 space-y-8">
          {hasBrief && group.projectBrief ? (
            <>
              {/* Task stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-card">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-4xl font-display font-bold text-gradient-neon mb-2">
                      {doneTasks}<span className="text-text-muted text-2xl">/{totalTasks}</span>
                    </p>
                    <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase">
                      Tasks Completed
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-4xl font-display font-bold text-accent-gold mb-2">
                      {Math.round(healthPercentage)}%
                    </p>
                    <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase">
                      Project Health
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Brief summary */}
              <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-display">Project Brief Overview</CardTitle>
                    <Badge variant="outline" className={`font-mono text-[10px] ${
                        group.projectBrief.status === "ANALYSED"
                          ? "border-accent-gold/50 text-accent-gold bg-accent-gold/5"
                          : "border-text-muted text-text-secondary"
                    }`}>
                      {group.projectBrief.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] text-accent-blue font-mono tracking-wider uppercase">
                      Idea
                    </h4>
                    <p className="text-sm text-text-secondary leading-relaxed bg-bg-tertiary/20 p-3 rounded-md border border-border/30">
                      {group.projectBrief.ideaStatement}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-[11px] text-accent-blue font-mono tracking-wider uppercase">
                      Approach
                    </h4>
                    <p className="text-sm text-text-secondary leading-relaxed bg-bg-tertiary/20 p-3 rounded-md border border-border/30">
                      {group.projectBrief.solutionApproach}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-[11px] text-accent-blue font-mono tracking-wider uppercase">
                      Scope
                    </h4>
                    <p className="text-sm text-text-secondary leading-relaxed bg-bg-tertiary/20 p-3 rounded-md border border-border/30">
                      {group.projectBrief.scopeStatement}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                    <div>
                      <h4 className="text-[11px] text-text-muted font-mono tracking-wider uppercase mb-1">
                        Deadline
                      </h4>
                      <p className="text-sm text-text-primary font-display font-medium">
                        {deadlineStr}
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-card border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
                <FileText className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                <h3 className="text-lg font-display font-semibold text-text-primary mb-2">
                  No project brief submitted yet
                </h3>
                <p className="text-text-secondary text-sm max-w-sm mx-auto">
                  {isCreator 
                    ? "Submit a brief to unlock AI-assigned roles and automatically generate task boards for your team."
                    : "The group creator has not submitted a project brief yet. Check back soon."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
