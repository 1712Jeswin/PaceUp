"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import type { TaskStatus } from "@/types";
import { ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskData {
  id: string;
  title: string;
  description: string;
  estimatedDays: number;
  status: TaskStatus;
  assignedUserId: string;
  assignedUser: { id: string; name: string };
}

interface MemberTaskGroup {
  name: string;
  userId: string;
  tasks: TaskData[];
}

interface TaskBoardProps {
  memberTasks: MemberTaskGroup[];
  roleMap: Record<string, string | null>;
  currentUserId: string;
  isCreator: boolean;
}

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  NOT_STARTED: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  OVERDUE: "IN_PROGRESS",
};

const NEXT_STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  NOT_STARTED: "Start Task",
  IN_PROGRESS: "Mark Done",
  OVERDUE: "Resume Task",
};

/**
 * Client-side task board with status update buttons.
 * Users can only update their own tasks.
 */
export function TaskBoard({
  memberTasks,
  roleMap,
  currentUserId,
  isCreator: _isCreator,
}: TaskBoardProps) {
  const router = useRouter();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingTaskId(taskId);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        router.refresh();
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (memberTasks.length === 0) {
    return (
      <Card className="glass-card border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mb-4 ring-1 ring-border/50">
            <Clock className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-display font-semibold text-text-primary mb-2">
            No Tasks Assigned Yet
          </h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto">
            Once the project brief is submitted and analyzed, AI will automatically assign tasks here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-accent-magenta/5 rounded-full blur-[100px] pointer-events-none" />

      {memberTasks.map((member) => (
        <Card key={member.userId} className="glass-card overflow-hidden">
          {/* Member header */}
          <CardHeader className="bg-bg-secondary/30 border-b border-border/50 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center">
                  <span className="text-sm font-display font-bold text-accent-blue">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {member.userId === currentUserId && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent-green rounded-full border-2 border-bg-primary shadow-[0_0_5px_rgba(57,255,20,0.5)]" />
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-display font-semibold text-text-primary flex items-center gap-2">
                  {member.name}
                  {member.userId === currentUserId && (
                    <Badge variant="outline" className="text-[10px] text-accent-green border-accent-green/30 bg-accent-green/10 font-mono">
                      YOU
                    </Badge>
                  )}
                </h3>
                {roleMap[member.userId] ? (
                  <p className="text-[11px] text-accent-blue font-mono uppercase tracking-wider mt-0.5">
                    {roleMap[member.userId]}
                  </p>
                ) : (
                  <p className="text-[11px] text-text-muted font-mono uppercase tracking-wider mt-0.5">
                    Unassigned Role
                  </p>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Tasks */}
          <CardContent className="p-4 md:p-6 bg-bg-primary/20">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {member.tasks.map((task) => {
                const isOwnTask = task.assignedUserId === currentUserId;
                const nextStatus = NEXT_STATUS[task.status];
                const canUpdate = isOwnTask && nextStatus;

                return (
                  <div
                    key={task.id}
                    className="flex flex-col justify-between p-5 rounded-xl bg-bg-tertiary/40 border border-border/50 hover:border-accent-blue/30 transition-all duration-300 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h4 className="text-sm font-display font-semibold text-text-primary leading-tight group-hover:text-accent-blue transition-colors">
                          {task.title}
                        </h4>
                        <div className="shrink-0">
                          <StatusBadge status={task.status} />
                        </div>
                      </div>

                      <p className="text-xs text-text-secondary mb-4 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                        {task.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                      <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        <span>Est. {task.estimatedDays} {task.estimatedDays === 1 ? "day" : "days"}</span>
                      </div>

                      {canUpdate && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(task.id, nextStatus)}
                          disabled={updatingTaskId === task.id}
                          className="h-7 px-3 text-xs font-mono bg-accent-green/10 text-accent-green hover:bg-accent-green/20 border border-accent-green/20"
                        >
                          {updatingTaskId === task.id ? (
                            <div className="h-3 w-3 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              {NEXT_STATUS_LABEL[task.status]}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
