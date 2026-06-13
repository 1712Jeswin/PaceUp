import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TaskBoard } from "./task-board";

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
    select: { id: true },
  });

  if (!brief) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display font-bold mb-4">Task Board</h1>
        <div className="neon-card p-8 text-center">
          <p className="text-text-secondary text-sm">
            No project brief has been submitted yet. The group creator needs to
            submit a brief first.
          </p>
        </div>
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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Task Board</h1>
        <span className="text-text-secondary text-sm font-mono">
          {group.name}
        </span>
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
