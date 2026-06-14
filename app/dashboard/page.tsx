import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Users, History, ArrowRight } from "lucide-react";
import { getOrCreateUser } from "@/lib/user";
import { CopyButton } from "@/components/copy-button";
import { PreviousGroupCard } from "@/components/previous-group-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * /dashboard — Dashboard home page.
 */
export default async function DashboardPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Ensure the user exists in the database
  const baseUser = await getOrCreateUser(clerkId);

  if (!baseUser) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-accent-green border-t-transparent rounded-full animate-spin mx-auto mb-4 drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]" />
          <p className="text-text-primary text-sm font-medium">
            Initializing system...
          </p>
        </div>
      </div>
    );
  }

  if (baseUser.level === null) {
    redirect("/dashboard/profile/setup");
  }

  const user = await db.user.findUnique({
    where: { id: baseUser.id },
    select: {
      id: true,
      name: true,
      userCode: true,
      groupMembers: {
        select: {
          role: true,
          isActive: true,
          leftAt: true,
          group: {
            select: {
              id: true,
              name: true,
              createdById: true,
              _count: {
                select: { members: true },
              },
              projectBrief: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const activeGroups = user.groupMembers.filter((gm) => gm.isActive);
  const previousGroups = user.groupMembers.filter((gm) => !gm.isActive);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">
            Welcome, <span className="text-accent-green">{user.name.split(" ")[0]}</span>
          </h1>
          {user.userCode && (
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-accent-green/30 text-accent-green">
                ID
              </Badge>
              <CopyButton text={user.userCode} label="user code" />
            </div>
          )}
          <p className="text-text-secondary text-sm mt-3">
            {activeGroups.length === 0
              ? "Create or join a group to get started."
              : `You are actively participating in ${activeGroups.length} ${activeGroups.length === 1 ? "group" : "groups"}.`}
          </p>
        </div>

        <Button asChild size="lg" className="bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus font-bold shadow-[0_0_15px_rgba(57,255,20,0.3)] hover:shadow-[0_0_25px_rgba(57,255,20,0.5)] transition-all">
          <Link href="/dashboard/new-group">
            <Plus className="h-5 w-5 mr-2" />
            New Group
          </Link>
        </Button>
      </div>

      {/* Active Groups */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-text-primary flex items-center gap-2">
          <Users className="w-5 h-5 text-accent-blue" />
          Active Groups
        </h2>

        {activeGroups.length === 0 ? (
          <Card className="glass-card border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-bg-tertiary rounded-full mb-4 ring-1 ring-border">
                <Users className="h-8 w-8 text-text-muted" />
              </div>
              <h3 className="text-text-primary font-medium mb-1">No active groups</h3>
              <p className="text-text-secondary text-sm max-w-sm">
                You haven't joined any groups yet. Create a new group or use an invite code to join an existing one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroups.map(({ group, role }) => (
              <Link key={group.id} href={`/dashboard/group/${group.id}`} className="block group">
                <Card className="glass-card h-full relative overflow-hidden transition-all duration-300 group-hover:-translate-y-1">
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-green/0 to-accent-blue/0 group-hover:from-accent-green/5 group-hover:to-accent-blue/5 transition-colors duration-500" />
                  
                  <CardContent className="p-6 relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-display font-semibold text-text-primary group-hover:text-accent-green transition-colors">
                        {group.name}
                      </h3>
                      {group.projectBrief ? (
                        <Badge variant="outline" className={`font-mono text-[10px] ${
                          group.projectBrief.status === "ANALYSED"
                            ? "border-accent-gold/50 text-accent-gold bg-accent-gold/5"
                            : "border-text-muted text-text-secondary"
                        }`}>
                          {group.projectBrief.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-[10px] bg-bg-tertiary text-text-muted">
                          NO BRIEF
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Users className="w-3.5 h-3.5" />
                        {group._count.members}
                      </div>
                      {role && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-xs text-accent-blue font-mono uppercase tracking-wider">
                            {role}
                          </span>
                        </>
                      )}
                      {group.createdById === user.id && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-xs text-accent-gold font-mono uppercase tracking-wider">
                            CREATOR
                          </span>
                        </>
                      )}
                    </div>

                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                      <ArrowRight className="w-5 h-5 text-accent-green" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Previous Groups */}
      {previousGroups.length > 0 && (
        <div className="space-y-4 pt-8">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-text-muted" />
            <h2 className="text-lg font-display font-semibold text-text-muted">
              Archived History
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {previousGroups.map(({ group, leftAt }) => (
              <PreviousGroupCard
                key={group.id}
                groupId={group.id}
                groupName={group.name}
                leftAt={leftAt?.toISOString() ?? null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
