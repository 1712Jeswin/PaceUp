import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { StandupClient } from "./standup-client";
import { Badge } from "@/components/ui/badge";

interface StandupPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/group/[id]/standup - Daily standup page.
 * Shows today's standup form if not submitted, and all responses for today.
 */
export default async function StandupPage({ params }: StandupPageProps) {
  const { id: groupId } = await params;
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, name: true },
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
    select: { id: true, name: true },
  });

  if (!group) {
    redirect("/dashboard");
  }

  // Check if user has already submitted today
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existingStandup = await db.standupResponse.findUnique({
    where: {
      userId_groupId_date: {
        userId: user.id,
        groupId,
        date: today,
      },
    },
    select: { id: true },
  });

  const hasSubmittedToday = !!existingStandup;

  // Fetch all today's responses
  const todayResponses = await db.standupResponse.findMany({
    where: { groupId, date: today },
    select: {
      id: true,
      didYesterday: true,
      planToday: true,
      blockers: true,
      submittedAt: true,
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  // Total active members
  const memberCount = await db.groupMember.count({
    where: { groupId, isActive: true },
  });

  return (
    <div className="max-w-3xl mx-auto animate-fade-in py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient-neon mb-2">
            Daily Standup
          </h1>
          <Badge
            variant="outline"
            className="border-border text-text-secondary bg-bg-secondary/50 font-mono text-xs"
          >
            {group.name}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`font-mono text-xs ${
              todayResponses.length === memberCount
                ? "border-accent-gold/50 text-accent-gold bg-accent-gold/5"
                : "border-accent-blue/50 text-accent-blue bg-accent-blue/5"
            }`}
          >
            {todayResponses.length}/{memberCount} submitted
          </Badge>
        </div>
      </div>

      <StandupClient
        groupId={groupId}
        userId={user.id}
        hasSubmittedToday={hasSubmittedToday}
        initialResponses={todayResponses.map((r) => ({
          ...r,
          submittedAt: r.submittedAt.toISOString(),
        }))}
      />
    </div>
  );
}
