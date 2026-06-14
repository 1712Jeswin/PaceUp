export const dynamic = 'force-dynamic';

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, Users, History } from "lucide-react";
import { getOrCreateUser } from "@/lib/user";
import { CopyButton } from "@/components/copy-button";
import { PreviousGroupCard } from "@/components/previous-group-card";

/**
 * /dashboard — Dashboard home page.
 *
 * Shows:
 * - User code under the welcome heading
 * - Active groups (isActive === true)
 * - Previous groups (isActive === false) with remove-from-history button
 *
 * Hard block: redirects to /dashboard/profile/setup if profile is incomplete.
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
          <div className="h-8 w-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">
            Setting up your account...
          </p>
          <p className="text-text-muted text-xs mt-1">
            This takes a few seconds after sign-up.
          </p>
        </div>
      </div>
    );
  }

  // Hard block: redirect to profile setup if not completed
  if (baseUser.level === null) {
    redirect("/dashboard/profile/setup");
  }

  // Now fetch the full user with group relations
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
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold">
            Welcome, {user.name.split(" ")[0]}
          </h1>
          {user.userCode && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
                ID
              </span>
              <CopyButton text={user.userCode} label="user code" />
            </div>
          )}
          <p className="text-text-secondary text-sm mt-2">
            {activeGroups.length === 0
              ? "Create or join a group to get started."
              : `You're in ${activeGroups.length} ${activeGroups.length === 1 ? "group" : "groups"}`}
          </p>
        </div>

        <Link
          href="/dashboard/new-group"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          New Group
        </Link>
      </div>

      {/* Active Groups */}
      {activeGroups.length === 0 ? (
        <div className="neon-card p-12 text-center">
          <Users className="h-8 w-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary text-sm mb-2">
            No groups yet
          </p>
          <p className="text-text-muted text-xs">
            Create a new group or join one with an invite code.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGroups.map(({ group, role }) => (
            <Link
              key={group.id}
              href={`/dashboard/group/${group.id}`}
              className="block neon-card p-4 hover:border-accent-green/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-semibold text-text-primary">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-secondary">
                      {group._count.members}{" "}
                      {group._count.members === 1 ? "member" : "members"}
                    </span>
                    {role && (
                      <span className="text-xs text-accent-blue font-mono">
                        {role}
                      </span>
                    )}
                    {group.createdById === user.id && (
                      <span className="text-[10px] text-accent-gold font-mono">
                        creator
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {group.projectBrief ? (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        group.projectBrief.status === "ANALYSED"
                          ? "bg-accent-gold/10 text-accent-gold"
                          : "bg-text-muted/20 text-text-secondary"
                      }`}
                    >
                      {group.projectBrief.status}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted">
                      No brief
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Previous Groups */}
      {previousGroups.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-text-muted" />
            <h2 className="text-sm font-display font-semibold text-text-muted uppercase tracking-wider">
              Previous Groups
            </h2>
          </div>
          <div className="space-y-2">
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
