"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import type { TaskStatus } from "@/types";
import { ChevronRight } from "lucide-react";

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
      <div className="neon-card p-8 text-center">
        <p className="text-text-secondary text-sm">
          No tasks assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {memberTasks.map((member) => (
        <div key={member.userId} className="neon-card p-5">
          {/* Member header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
            <div className="h-8 w-8 rounded-full bg-bg-tertiary flex items-center justify-center">
              <span className="text-xs font-display font-bold text-text-primary">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-display font-semibold text-text-primary">
                {member.name}
                {member.userId === currentUserId && (
                  <span className="ml-2 text-xs text-accent-green font-mono">
                    (you)
                  </span>
                )}
              </h3>
              {roleMap[member.userId] && (
                <p className="text-xs text-accent-blue font-mono">
                  {roleMap[member.userId]}
                </p>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {member.tasks.map((task) => {
              const isOwnTask = task.assignedUserId === currentUserId;
              const nextStatus = NEXT_STATUS[task.status];
              const canUpdate = isOwnTask && nextStatus;

              return (
                <div
                  key={task.id}
                  className="p-4 rounded-lg bg-bg-primary/50 border border-border/50"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-display font-semibold text-text-primary">
                      {task.title}
                    </h4>
                    <StatusBadge status={task.status} />
                  </div>

                  <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted font-mono">
                      Est. {task.estimatedDays}{" "}
                      {task.estimatedDays === 1 ? "day" : "days"}
                    </span>

                    {canUpdate && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(task.id, nextStatus)
                        }
                        disabled={updatingTaskId === task.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-mono bg-accent-green/10 border border-accent-green/20 text-accent-green hover:bg-accent-green/20 transition-colors disabled:opacity-50"
                      >
                        {updatingTaskId === task.id
                          ? "Updating..."
                          : NEXT_STATUS_LABEL[task.status]}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
