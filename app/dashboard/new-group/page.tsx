"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Mail, UserPlus, Clock } from "lucide-react";

type Tab = "create" | "join" | "invites";

interface InviteRequest {
  id: string;
  createdAt: string;
  group: { id: string; name: string };
  initiatedBy: { name: string };
}

/**
 * /dashboard/new-group — Tabbed page with three sections:
 * 1. Create Group — form to create a new group
 * 2. Join Group — input invite code + submit join request
 * 3. Invite Requests — pending in-app invitations with accept/decline
 */
export default function NewGroupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("create");

  // Create Group state
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Group state
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Invite Requests state
  const [invites, setInvites] = useState<InviteRequest[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setIsLoadingInvites(true);
    try {
      const res = await fetch("/api/invitations");
      const data = await res.json();
      if (data.success) {
        setInvites(data.data);
      }
    } catch {
      // WHY: Silent fail — invites tab will show empty state
    } finally {
      setIsLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "invites") {
      fetchInvites();
    }
  }, [activeTab, fetchInvites]);

  // Also fetch on mount to show badge count
  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setCreateError(data.error ?? "Failed to create group");
        return;
      }

      router.push(`/dashboard/group/${data.data.id}`);
    } catch {
      setCreateError("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);
    setIsJoining(true);

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setJoinError(data.error ?? "Failed to submit join request");
        return;
      }

      setJoinSuccess(
        `Request sent to join "${data.data.groupName}". Waiting for creator approval.`
      );
      setInviteCode("");
    } catch {
      setJoinError("An unexpected error occurred");
    } finally {
      setIsJoining(false);
    }
  };

  const handleInviteAction = async (
    invitationId: string,
    action: "ACCEPT" | "DECLINE"
  ) => {
    setProcessingId(invitationId);
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (data.success) {
        // Remove the processed invite from the list
        setInvites((prev) => prev.filter((i) => i.id !== invitationId));

        if (action === "ACCEPT") {
          router.refresh();
        }
      }
    } catch {
      // WHY: Silent fail — the invite remains in the list for retry
    } finally {
      setProcessingId(null);
    }
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "create", label: "Create Group" },
    { key: "join", label: "Join Group" },
    {
      key: "invites",
      label: "Invite Requests",
      badge: invites.length > 0 ? invites.length : undefined,
    },
  ];

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Tab bar */}
      <div className="flex border-b border-border mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-display transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-accent-green text-accent-green"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-accent-magenta text-[10px] font-mono font-bold text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create Group Tab */}
      {activeTab === "create" && (
        <div>
          <h1 className="text-2xl font-display font-bold mb-2">
            Create a Group
          </h1>
          <p className="text-text-secondary text-sm mb-8">
            Start a new project group. You&apos;ll get an invite code to share
            with your team.
          </p>

          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label
                htmlFor="group-name"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Group Name
              </label>
              <input
                id="group-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Team Alpha — Capstone Project"
                maxLength={100}
                required
                disabled={isCreating}
                className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted font-body text-sm neon-focus disabled:opacity-50"
              />
            </div>

            {createError && (
              <p className="text-accent-magenta text-sm" role="alert">
                {createError}
              </p>
            )}

            <button
              type="submit"
              disabled={isCreating || name.trim().length === 0}
              className="w-full py-2.5 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Group"
              )}
            </button>
          </form>
        </div>
      )}

      {/* Join Group Tab */}
      {activeTab === "join" && (
        <div>
          <h1 className="text-2xl font-display font-bold mb-2">
            Join a Group
          </h1>
          <p className="text-text-secondary text-sm mb-8">
            Enter the invite code shared by your team leader. The group creator
            will need to approve your request.
          </p>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label
                htmlFor="invite-code"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g., bb3EJwRQ"
                maxLength={8}
                required
                disabled={isJoining}
                className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted font-mono text-sm tracking-widest text-center neon-focus disabled:opacity-50"
              />
            </div>

            {joinError && (
              <p className="text-accent-magenta text-sm" role="alert">
                {joinError}
              </p>
            )}

            {joinSuccess && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-green/10 border border-accent-green/20">
                <Clock className="h-5 w-5 text-accent-green flex-shrink-0 mt-0.5" />
                <p className="text-accent-green text-sm">{joinSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || inviteCode.trim().length === 0}
              className="w-full py-2.5 rounded-lg bg-accent-blue text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-blue/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  Sending Request...
                </span>
              ) : (
                "Request to Join"
              )}
            </button>
          </form>
        </div>
      )}

      {/* Invite Requests Tab */}
      {activeTab === "invites" && (
        <div>
          <h1 className="text-2xl font-display font-bold mb-2">
            Invite Requests
          </h1>
          <p className="text-text-secondary text-sm mb-8">
            Invitations from group creators to join their teams.
          </p>

          {isLoadingInvites ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invites.length === 0 ? (
            <div className="neon-card p-12 text-center">
              <Mail className="h-8 w-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary text-sm mb-2">
                No pending invitations
              </p>
              <p className="text-text-muted text-xs">
                When someone invites you to a group, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="neon-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-display font-semibold text-text-primary">
                        {invite.group.name}
                      </h3>
                      <p className="text-[10px] text-text-muted font-mono mt-1">
                        <UserPlus className="h-3 w-3 inline mr-1" />
                        Invited by {invite.initiatedBy.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleInviteAction(invite.id, "ACCEPT")
                        }
                        disabled={processingId === invite.id}
                        className="p-2 rounded-md bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors disabled:opacity-50"
                        aria-label="Accept invitation"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleInviteAction(invite.id, "DECLINE")
                        }
                        disabled={processingId === invite.id}
                        className="p-2 rounded-md bg-accent-magenta/10 text-accent-magenta hover:bg-accent-magenta/20 transition-colors disabled:opacity-50"
                        aria-label="Decline invitation"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
