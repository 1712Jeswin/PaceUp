import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SettingsClient } from "./settings-client";

interface SettingsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/group/[id]/settings - Group settings page.
 * Only accessible by the group creator.
 */
export default async function SettingsPage({ params }: SettingsPageProps) {
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

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      createdById: true,
      githubRepoUrl: true,
      githubWebhookId: true,
    },
  });

  if (!group) {
    redirect("/dashboard");
  }

  // Only the creator can access settings
  if (group.createdById !== user.id) {
    redirect(`/dashboard/group/${groupId}`);
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in py-8">
      <h1 className="text-3xl font-display font-bold text-gradient-neon mb-2">
        Group Settings
      </h1>
      <p className="text-text-secondary text-sm mb-8">{group.name}</p>

      <SettingsClient
        groupId={groupId}
        initialRepoUrl={group.githubRepoUrl}
        isLinked={!!group.githubWebhookId}
      />
    </div>
  );
}
