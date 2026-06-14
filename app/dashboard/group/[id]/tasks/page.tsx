export const dynamic = 'force-dynamic';

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { TaskBoard } from "./task-board";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TasksPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/group/[id]/tasks — Task board page.
 *
 * Server component that fetches all tasks grouped by member.
 * Passes data to the client-side TaskBoard component for interactivity.
 */
export default async function TasksPage({ params }: TasksPageProps) {
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

  // Verify user is a member of this group
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

  // Fetch the group and check if user is the creator
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      createdById: true,
    },
  });

  if (!group) {
    redirect("/dashboard");
  }

  const isCreator = group.createdById === user.id;

  // Fetch all tasks for this group, grouped by member
  const brief = await db.projectBrief.findUnique({
    where: { groupId },
    select: { id: true, status: true },
  });

  if (!brief) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in relative py-8">
        <h1 className="text-3xl font-display font-bold mb-8 text-gradient-neon">Project Tasks</h1>
        <Card className="glass-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <FileText className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2">
              No project brief submitted yet
            </h3>
            <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">
              The group creator needs to submit a project brief before the AI can generate and assign tasks.
            </p>
            {isCreator && (
              <Button asChild className="bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus font-bold">
                <Link href={`/dashboard/group/${groupId}/brief`}>
                  Submit Project Brief
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasks = await db.task.findMany({
    where: { projectBriefId: brief.id },
    select: {
      id: true,
      title: true,
      description: true,
      estimatedDays: true,
      status: true,
      assignedUserId: true,
      assignedUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Brief exists but no tasks — AI hasn't run or failed
  if (tasks.length === 0) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in relative py-8">
        <h1 className="text-3xl font-display font-bold mb-8 text-gradient-neon">Project Tasks</h1>
        <Card className="glass-card border-dashed border-accent-gold/30">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="p-4 bg-accent-gold/10 rounded-full mb-6 ring-1 ring-accent-gold/30">
              <RotateCcw className="w-10 h-10 text-accent-gold" />
            </div>
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2">
              Task Generation Pending
            </h3>
            <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">
              {brief.status === "DRAFT"
                ? "A project brief exists, but AI task assignment hasn't been completed yet."
                : "No tasks were generated for this project."}
            </p>
            {isCreator && (
              <Button asChild className="bg-accent-gold text-bg-primary hover:bg-accent-gold/80 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] font-bold">
                <Link href={`/dashboard/group/${groupId}/brief`}>
                  {brief.status === "DRAFT" ? "Retry AI Assignment" : "Re-submit Brief"}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group tasks by member
  const memberTaskMap = new Map<
    string,
    { name: string; userId: string; tasks: typeof tasks }
  >();

  for (const task of tasks) {
    const key = task.assignedUserId;
    if (!memberTaskMap.has(key)) {
      memberTaskMap.set(key, {
        name: task.assignedUser.name,
        userId: task.assignedUserId,
        tasks: [],
      });
    }
    memberTaskMap.get(key)!.tasks.push(task);
  }

  const memberTasks = Array.from(memberTaskMap.values());

  // Fetch roles
  const members = await db.groupMember.findMany({
    where: { groupId },
    select: {
      userId: true,
      role: true,
    },
  });

  const roleMap = new Map(members.map((m) => [m.userId, m.role]));

  return (
    <div className="max-w-7xl mx-auto animate-fade-in py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient-neon mb-2">Project Task Board</h1>
          <Badge variant="outline" className="border-border text-text-secondary bg-bg-secondary/50 font-mono text-xs">
            {group.name}
          </Badge>
        </div>
      </div>

      <TaskBoard
        memberTasks={memberTasks}
        roleMap={Object.fromEntries(roleMap)}
        currentUserId={user.id}
        isCreator={isCreator}
      />
    </div>
  );
}
