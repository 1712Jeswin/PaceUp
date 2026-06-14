"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Search, Mail, Send, LogOut, UserPlus, ShieldAlert, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <Card className="glass-card overflow-hidden border-accent-magenta/20 hover:border-accent-magenta/50 transition-colors mt-6">
        <CardContent className="p-0">
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center justify-center gap-2 w-full p-4 text-accent-magenta text-sm font-display hover:bg-accent-magenta/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Leave Group
            </button>
          ) : (
            <div className="p-5 bg-accent-magenta/5">
              <div className="flex items-center gap-2 mb-4 text-text-primary text-sm font-medium">
                <ShieldAlert className="w-4 h-4 text-accent-magenta" />
                Are you sure you want to leave this group?
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleLeaveGroup}
                  disabled={isLeaving}
                  variant="destructive"
                  className="flex-1 bg-accent-magenta hover:bg-accent-magenta/90 text-white"
                >
                  {isLeaving ? "Leaving..." : "Yes, leave"}
                </Button>
                <Button
                  onClick={() => setShowLeaveConfirm(false)}
                  variant="outline"
                  className="flex-1 border-border/50 text-text-secondary hover:bg-bg-tertiary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite by search */}
      <Card className="glass-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-accent-blue" />
            Invite Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex gap-2 mb-3">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name or user code"
              className="flex-1 h-9 bg-bg-tertiary/50 border-border/50 focus-visible:ring-accent-blue"
            />
            <Button
              size="icon"
              onClick={handleSearch}
              disabled={isSearching || searchQuery.trim().length < 2}
              className="h-9 w-9 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {searchMessage && (
            <p className="text-[11px] text-text-muted mb-3 italic">{searchMessage}</p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-2 rounded-md bg-bg-tertiary/30 border border-border/30 hover:border-accent-blue/30 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-text-primary font-medium">{result.name}</span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {result.userCode ?? "—"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => result.userCode && handleInviteUser(result.userCode)}
                    disabled={invitingUserId === result.userCode || !result.userCode}
                    className="h-7 px-3 bg-accent-green/10 text-accent-green hover:bg-accent-green/20 text-xs"
                  >
                    {invitingUserId === result.userCode ? "Sending..." : "Invite"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite by email */}
      <Card className="glass-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent-gold" />
            Invite by Email
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form onSubmit={handleEmailInvite} className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              required
              disabled={isSendingEmail}
              className="flex-1 h-9 bg-bg-tertiary/50 border-border/50 focus-visible:ring-accent-gold"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSendingEmail || email.trim().length === 0}
              className="h-9 w-9 bg-accent-gold/10 text-accent-gold border border-accent-gold/20 hover:bg-accent-gold/20"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {emailMessage && (
            <div className={`mt-3 p-2 rounded text-[11px] flex items-center gap-2 border ${
                emailMessage.type === "success"
                  ? "bg-accent-green/5 border-accent-green/20 text-accent-green"
                  : "bg-accent-magenta/5 border-accent-magenta/20 text-accent-magenta"
              }`}
            >
              {emailMessage.type === "success" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {emailMessage.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card className="glass-card">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-magenta" />
            Pending Requests
          </CardTitle>
          {!hasLoadedRequests && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadPendingRequests}
              disabled={isLoadingRequests}
              className="h-6 px-2 text-xs text-accent-blue hover:text-accent-blue/80 hover:bg-accent-blue/10"
            >
              Load
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isLoadingRequests ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 border-2 border-accent-magenta border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasLoadedRequests ? (
            <p className="text-xs text-text-muted italic">
              Click &quot;Load&quot; to fetch pending requests.
            </p>
          ) : pendingRequests.length === 0 ? (
            <p className="text-xs text-text-muted italic">No pending requests at the moment.</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-2 rounded-md bg-bg-tertiary/30 border border-border/30 hover:border-border/50 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-text-primary font-medium">
                      {request.user?.name ?? request.email ?? "Unknown"}
                    </span>
                    <Badge variant="outline" className="mt-1 w-fit text-[9px] border-text-muted/30 text-text-secondary bg-transparent px-1.5 py-0">
                      {request.type === "JOIN_REQUEST"
                        ? "Join request"
                        : "Email invite"}
                    </Badge>
                  </div>
                  {request.type === "JOIN_REQUEST" && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRequestAction(request.id, "DECLINE")}
                        disabled={processingId === request.id}
                        className="h-6 w-6 rounded-md text-accent-magenta hover:bg-accent-magenta/10 hover:text-accent-magenta"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRequestAction(request.id, "ACCEPT")}
                        disabled={processingId === request.id}
                        className="h-6 w-6 rounded-md text-accent-green hover:bg-accent-green/10 hover:text-accent-green"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
