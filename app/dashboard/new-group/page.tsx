"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Mail, UserPlus, Clock, Plus, LogIn, Inbox } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <div className="max-w-2xl mx-auto animate-fade-in py-10 relative">
      
      {/* Dynamic Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-blue/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      <h1 className="text-3xl font-display font-bold text-text-primary mb-8 text-center">
        Group Management
      </h1>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => setActiveTab(val as Tab)} 
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-bg-secondary/50 backdrop-blur-md border border-border/50 p-1 rounded-xl h-14 mb-8">
          <TabsTrigger value="create" className="rounded-lg data-[state=active]:bg-accent-green/20 data-[state=active]:text-accent-green transition-all data-[state=active]:shadow-[0_0_15px_rgba(57,255,20,0.1)]">
            <Plus className="w-4 h-4 mr-2" />
            Create
          </TabsTrigger>
          <TabsTrigger value="join" className="rounded-lg data-[state=active]:bg-accent-blue/20 data-[state=active]:text-accent-blue transition-all data-[state=active]:shadow-[0_0_15px_rgba(0,207,255,0.1)]">
            <LogIn className="w-4 h-4 mr-2" />
            Join
          </TabsTrigger>
          <TabsTrigger value="invites" className="rounded-lg data-[state=active]:bg-accent-magenta/20 data-[state=active]:text-accent-magenta transition-all data-[state=active]:shadow-[0_0_15px_rgba(255,0,255,0.1)] relative">
            <Inbox className="w-4 h-4 mr-2" />
            Invites
            {invites.length > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center p-0 text-[10px] bg-accent-magenta text-white animate-pulse">
                {invites.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          {/* Create Group Tab */}
          <TabsContent value="create" asChild forceMount>
            {activeTab === "create" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="bg-bg-secondary/30 border-b border-border/50 pb-6">
                    <CardTitle className="font-display text-xl text-text-primary">Start a New Project Group</CardTitle>
                    <CardDescription className="text-text-secondary">
                      Create your space. You'll receive an invite code to bring your team aboard.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleCreate}>
                    <CardContent className="pt-6 pb-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="group-name" className="text-text-secondary">Group Name</Label>
                          <Input
                            id="group-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Team Alpha — Capstone Project"
                            maxLength={100}
                            required
                            disabled={isCreating}
                            className="h-12 bg-bg-tertiary/50 border-border/50 focus-visible:ring-accent-green"
                          />
                        </div>

                        {createError && (
                          <div className="p-3 rounded-md bg-accent-magenta/10 border border-accent-magenta/20 text-accent-magenta text-sm flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {createError}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-bg-tertiary/10 border-t border-border/50 pt-6">
                      <Button
                        type="submit"
                        disabled={isCreating || name.trim().length === 0}
                        className="w-full h-12 bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus font-bold transition-all shadow-[0_0_15px_rgba(57,255,20,0.2)] hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]"
                      >
                        {isCreating ? (
                          <>
                            <div className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin mr-2" />
                            Creating Group...
                          </>
                        ) : (
                          "Create Group"
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Join Group Tab */}
          <TabsContent value="join" asChild forceMount>
            {activeTab === "join" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="bg-bg-secondary/30 border-b border-border/50 pb-6">
                    <CardTitle className="font-display text-xl text-text-primary">Join an Existing Group</CardTitle>
                    <CardDescription className="text-text-secondary">
                      Got an invite code? Enter it below to request access from the team leader.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleJoin}>
                    <CardContent className="pt-6 pb-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-code" className="text-text-secondary">Invite Code</Label>
                          <Input
                            id="invite-code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="e.g., bb3EJwRQ"
                            maxLength={8}
                            required
                            disabled={isJoining}
                            className="h-14 text-center text-xl tracking-[0.25em] font-mono bg-bg-tertiary/50 border-border/50 focus-visible:ring-accent-blue placeholder:tracking-normal placeholder:text-sm"
                          />
                        </div>

                        {joinError && (
                          <div className="p-3 rounded-md bg-accent-magenta/10 border border-accent-magenta/20 text-accent-magenta text-sm flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {joinError}
                          </div>
                        )}

                        {joinSuccess && (
                          <div className="p-4 rounded-md bg-accent-green/10 border border-accent-green/20 flex items-start gap-3">
                            <Clock className="w-5 h-5 text-accent-green shrink-0 mt-0.5" />
                            <p className="text-accent-green text-sm">{joinSuccess}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-bg-tertiary/10 border-t border-border/50 pt-6">
                      <Button
                        type="submit"
                        disabled={isJoining || inviteCode.trim().length === 0}
                        className="w-full h-12 bg-accent-blue text-bg-primary hover:bg-accent-blue/80 neon-focus font-bold transition-all shadow-[0_0_15px_rgba(0,207,255,0.2)] hover:shadow-[0_0_20px_rgba(0,207,255,0.4)]"
                      >
                        {isJoining ? (
                          <>
                            <div className="h-4 w-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin mr-2" />
                            Sending Request...
                          </>
                        ) : (
                          "Request to Join"
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Invite Requests Tab */}
          <TabsContent value="invites" asChild forceMount>
            {activeTab === "invites" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-card overflow-hidden min-h-[300px]">
                  <CardHeader className="bg-bg-secondary/30 border-b border-border/50 pb-6">
                    <CardTitle className="font-display text-xl text-text-primary flex items-center gap-2">
                      Pending Invitations
                    </CardTitle>
                    <CardDescription className="text-text-secondary">
                      Review and manage your pending group requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6">
                    {isLoadingInvites ? (
                      <div className="flex flex-col items-center justify-center py-12 text-accent-magenta">
                        <div className="h-8 w-8 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm font-medium">Checking invites...</p>
                      </div>
                    ) : invites.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 ring-1 ring-border">
                          <Mail className="h-8 w-8 text-text-muted" />
                        </div>
                        <h3 className="text-text-primary font-medium mb-1">No pending invitations</h3>
                        <p className="text-text-secondary text-sm max-w-[250px]">
                          When a team leader invites you to their group, it will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {invites.map((invite) => (
                          <div key={invite.id} className="p-4 rounded-xl bg-bg-tertiary/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-accent-magenta/30 transition-colors">
                            <div>
                              <h3 className="text-base font-display font-semibold text-text-primary group-hover:text-accent-magenta transition-colors">
                                {invite.group.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono mt-1">
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Invited by <span className="text-text-secondary font-medium">{invite.initiatedBy.name}</span></span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInviteAction(invite.id, "DECLINE")}
                                disabled={processingId === invite.id}
                                className="border-accent-magenta/30 text-accent-magenta hover:bg-accent-magenta/10 hover:text-accent-magenta"
                              >
                                {processingId === invite.id ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <X className="h-4 w-4 mr-1.5" />}
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleInviteAction(invite.id, "ACCEPT")}
                                disabled={processingId === invite.id}
                                className="bg-accent-green text-bg-primary hover:bg-accent-green/80 shadow-[0_0_10px_rgba(57,255,20,0.2)]"
                              >
                                {processingId === invite.id ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                                Accept
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
