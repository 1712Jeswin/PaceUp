"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Search, Mail, Send, LogOut, UserPlus } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  userCode: string | null;
  email: string;
}

interface PendingInvitation {
  id: string;
  type: string;
  email: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    userCode: string | null;
  } | null;
}

interface GroupInvitePanelProps {
  groupId: string;
  isCreator: boolean;
}

/**
 * Client-side panel for the group dashboard:
 * - Invite Members (search by name/code, invite by email) — creator only
 * - Pending Requests (accept/decline join requests) — creator only
 * - Leave Group button — non-creator members
 */
export function GroupInvitePanel({ groupId, isCreator }: GroupInvitePanelProps) {
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Email invite state
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pending requests state
  const [pendingRequests, setPendingRequests] = useState<PendingInvitation[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [hasLoadedRequests, setHasLoadedRequests] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Leave group state
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setIsSearching(true);
    setSearchMessage(null);
    setSearchResults([]);

    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery.trim())}&groupId=${groupId}`
      );
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
        if (data.data.length === 0) {
          setSearchMessage("No users found matching your search.");
        }
      }
    } catch {
      setSearchMessage("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteUser = async (userCode: string) => {
    setInvitingUserId(userCode);
    setSearchMessage(null);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "IN_APP_INVITE",
          groupId,
          userCode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSearchMessage(`Invitation sent to ${data.data.targetUserName}`);
        setSearchResults((prev) =>
          prev.filter((u) => u.userCode !== userCode)
        );
      } else {
        setSearchMessage(data.error ?? "Failed to send invitation");
      }
    } catch {
      setSearchMessage("Failed to send invitation");
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);
    setEmailMessage(null);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EMAIL_INVITE",
          groupId,
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEmailMessage({ type: "success", text: `Invitation sent to ${email.trim()}` });
        setEmail("");
      } else {
        setEmailMessage({ type: "error", text: data.error ?? "Failed to send invitation" });
      }
    } catch {
      setEmailMessage({ type: "error", text: "Failed to send invitation" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const loadPendingRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`);
      const data = await res.json();
      if (data.success) {
        setPendingRequests(data.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingRequests(false);
      setHasLoadedRequests(true);
    }
  };

  const handleRequestAction = async (
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
        setPendingRequests((prev) =>
          prev.filter((r) => r.id !== invitationId)
        );
        if (action === "ACCEPT") {
          router.refresh();
        }
      }
    } catch {
      // Silent fail
    } finally {
      setProcessingId(null);
    }
  };

  const handleLeaveGroup = async () => {
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      // Silent fail
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  if (!isCreator) {
    return (
      <div className="space-y-2">
        {!showLeaveConfirm ? (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="flex items-center gap-2 w-full p-3 rounded-lg border border-accent-magenta/20 text-accent-magenta text-sm font-display hover:bg-accent-magenta/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Leave Group
          </button>
        ) : (
          <div className="neon-card p-4 border-accent-magenta/30">
            <p className="text-sm text-text-primary mb-3">
              Are you sure you want to leave this group?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLeaveGroup}
                disabled={isLeaving}
                className="flex-1 py-2 rounded-lg bg-accent-magenta text-white font-display text-sm font-semibold hover:bg-accent-magenta/90 disabled:opacity-50"
              >
                {isLeaving ? "Leaving..." : "Yes, leave"}
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary font-display text-sm hover:bg-bg-tertiary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite by search */}
      <div className="neon-card p-5">
        <h2 className="text-sm font-display font-semibold text-text-primary mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Members
        </h2>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name or user code"
            className="flex-1 px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted font-body text-sm neon-focus"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || searchQuery.trim().length < 2}
            className="px-3 py-2 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20 transition-colors disabled:opacity-50"
            aria-label="Search users"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {searchMessage && (
          <p className="text-xs text-text-muted mb-2">{searchMessage}</p>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-1">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-bg-tertiary/50"
              >
                <div>
                  <p className="text-sm text-text-primary">{result.name}</p>
                  <p className="text-[10px] text-text-muted font-mono">
                    {result.userCode ?? "—"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    result.userCode && handleInviteUser(result.userCode)
                  }
                  disabled={
                    invitingUserId === result.userCode || !result.userCode
                  }
                  className="px-3 py-1.5 rounded-md bg-accent-green/10 text-accent-green text-xs font-display hover:bg-accent-green/20 transition-colors disabled:opacity-50"
                >
                  {invitingUserId === result.userCode ? "Sending..." : "Invite"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite by email */}
      <div className="neon-card p-5">
        <h2 className="text-sm font-display font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Invite by Email
        </h2>

        <form onSubmit={handleEmailInvite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            required
            disabled={isSendingEmail}
            className="flex-1 px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted font-body text-sm neon-focus disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSendingEmail || email.trim().length === 0}
            className="px-3 py-2 rounded-lg bg-accent-gold/10 text-accent-gold border border-accent-gold/20 hover:bg-accent-gold/20 transition-colors disabled:opacity-50"
            aria-label="Send email invite"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {emailMessage && (
          <p
            className={`text-xs mt-2 ${
              emailMessage.type === "success"
                ? "text-accent-green"
                : "text-accent-magenta"
            }`}
          >
            {emailMessage.text}
          </p>
        )}
      </div>

      {/* Pending Requests */}
      <div className="neon-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-display font-semibold text-text-primary flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Pending Requests
          </h2>
          {!hasLoadedRequests && (
            <button
              onClick={loadPendingRequests}
              disabled={isLoadingRequests}
              className="text-xs text-accent-blue hover:underline disabled:opacity-50"
            >
              Load
            </button>
          )}
        </div>

        {isLoadingRequests ? (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasLoadedRequests ? (
          <p className="text-xs text-text-muted">
            Click &quot;Load&quot; to see pending join requests.
          </p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-xs text-text-muted">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between py-2 px-2 rounded-md bg-bg-primary/50"
              >
                <div>
                  <p className="text-sm text-text-primary">
                    {request.user?.name ?? request.email ?? "Unknown"}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">
                    {request.type === "JOIN_REQUEST"
                      ? "Join request"
                      : `Email invite — ${request.email}`}
                  </p>
                </div>
                {request.type === "JOIN_REQUEST" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleRequestAction(request.id, "ACCEPT")
                      }
                      disabled={processingId === request.id}
                      className="p-1.5 rounded-md bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors disabled:opacity-50"
                      aria-label="Accept request"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        handleRequestAction(request.id, "DECLINE")
                      }
                      disabled={processingId === request.id}
                      className="p-1.5 rounded-md bg-accent-magenta/10 text-accent-magenta hover:bg-accent-magenta/20 transition-colors disabled:opacity-50"
                      aria-label="Decline request"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
