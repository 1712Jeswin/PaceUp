import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { JoinGroupButton } from "./join-button";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

/**
 * /join/[code] — Public page for joining a group via invite code.
 *
 * If user is signed in: shows group info + "Join Group" button.
 * If user is not signed in: redirects to sign-up with a redirect back.
 */
export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;

  // Fetch the group by invite code
  const group = await db.group.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      name: true,
      _count: {
        select: { members: true },
      },
    },
  });

  if (!group) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-accent-magenta mb-4">
            Invalid Invite Code
          </h1>
          <p className="text-text-secondary text-sm">
            This invite link is invalid or has expired. Please check with your
            team leader.
          </p>
        </div>
      </main>
    );
  }

  const { userId: clerkId } = await auth();

  // Not signed in → redirect to sign-up with a redirect back
  if (!clerkId) {
    redirect(`/sign-up?redirect_url=/join/${code}`);
  }

  // Check if user is already a member
  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  let isAlreadyMember = false;
  if (user) {
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      select: { id: true },
    });
    isAlreadyMember = !!membership;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm w-full text-center animate-fade-in">
        <div className="neon-card p-8">
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-4">
            You&apos;ve been invited to join
          </p>
          <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
            {group.name}
          </h1>
          <p className="text-text-secondary text-sm mb-8">
            {group._count.members}{" "}
            {group._count.members === 1 ? "member" : "members"} already in this
            group
          </p>

          {isAlreadyMember ? (
            <div className="space-y-3">
              <p className="text-accent-gold text-sm font-mono">
                You&apos;re already a member
              </p>
              <a
                href={`/dashboard/group/${group.id}`}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-border text-text-primary font-display text-sm neon-hover"
              >
                Go to Group Dashboard
              </a>
            </div>
          ) : (
            <JoinGroupButton inviteCode={code} groupId={group.id} />
          )}
        </div>
      </div>
    </main>
  );
}
