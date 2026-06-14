import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { JoinGroupButton } from "./join-button";
import { getOrCreateUser } from "@/lib/user";
import { Users, AlertTriangle, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

/**
 * /join/[code] — Public page for joining a group via invite code.
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
      <main className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-magenta/10 rounded-full blur-[128px] pointer-events-none" />
        
        <Card className="glass-panel border-accent-magenta/30 max-w-sm w-full animate-fade-in z-10 relative">
          <CardContent className="pt-10 pb-10 text-center flex flex-col items-center">
            <div className="p-4 bg-accent-magenta/10 rounded-full mb-6 ring-1 ring-accent-magenta/30">
              <AlertTriangle className="w-10 h-10 text-accent-magenta" />
            </div>
            <h1 className="text-2xl font-display font-bold text-accent-magenta mb-4">
              Invalid Invite Code
            </h1>
            <p className="text-text-secondary text-sm">
              This invite link is invalid or has expired. Please check with your
              team leader.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { userId: clerkId } = await auth();

  // Not signed in → redirect to sign-up with a redirect back
  if (!clerkId) {
    redirect(`/sign-up?redirect_url=/join/${code}`);
  }

  // Check if user is already a member or has a pending request
  const user = await getOrCreateUser(clerkId);

  let isAlreadyMember = false;
  let hasPendingRequest = false;

  if (user) {
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      select: { isActive: true },
    });
    isAlreadyMember = !!membership?.isActive;

    if (!isAlreadyMember) {
      const pendingRequest = await db.invitation.findFirst({
        where: {
          groupId: group.id,
          userId: user.id,
          type: "JOIN_REQUEST",
          status: "PENDING",
        },
        select: { id: true },
      });
      hasPendingRequest = !!pendingRequest;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-[128px] pointer-events-none" />

      <Card className="glass-panel max-w-md w-full animate-fade-in z-10 relative">
        <CardContent className="pt-10 pb-10 text-center flex flex-col items-center">
          <div className="p-4 bg-bg-secondary/50 rounded-full mb-6 border border-border/50">
            <Users className="w-10 h-10 text-accent-blue" />
          </div>
          
          <p className="text-text-muted text-[11px] font-mono uppercase tracking-[0.2em] mb-3">
            You&apos;ve been invited to join
          </p>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-3 text-gradient-neon">
            {group.name}
          </h1>
          <p className="text-text-secondary text-sm mb-10 flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-text-muted" />
            {group._count.members} {group._count.members === 1 ? "member" : "members"} already in this group
          </p>

          <div className="w-full">
            {isAlreadyMember ? (
              <div className="space-y-4 w-full">
                <div className="p-3 bg-accent-gold/10 border border-accent-gold/20 rounded-lg flex items-center justify-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-accent-gold" />
                  <p className="text-accent-gold text-sm font-mono">
                    You&apos;re already a member
                  </p>
                </div>
                <Button asChild className="w-full bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus font-bold">
                  <Link href={`/dashboard/group/${group.id}`}>
                    Go to Group Dashboard
                  </Link>
                </Button>
              </div>
            ) : hasPendingRequest ? (
              <div className="space-y-4 w-full p-4 border border-accent-blue/30 bg-accent-blue/10 rounded-xl">
                <p className="text-accent-blue text-sm font-display font-bold">
                  Request already sent
                </p>
                <p className="text-text-secondary text-xs">
                  Waiting for the group creator to approve your request.
                </p>
              </div>
            ) : (
              <JoinGroupButton inviteCode={code} groupId={group.id} />
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
