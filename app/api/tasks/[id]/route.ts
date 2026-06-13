import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";
import type { ApiResponse } from "@/types";

/**
 * Valid status transitions. Users can only move forward through the pipeline.
 * NOT_STARTED → IN_PROGRESS → DONE. No skipping, no going backwards.
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  NOT_STARTED: [TaskStatus.IN_PROGRESS],
  IN_PROGRESS: [TaskStatus.DONE],
  DONE: [],
  OVERDUE: [TaskStatus.IN_PROGRESS], // allow overdue tasks to be picked back up
};

/**
 * PATCH /api/tasks/[id] — Updates a task's status.
 *
 * Body: { status: TaskStatus }
 *
 * Checks:
 * - Only the assigned user can update their own tasks
 * - Status transition must be valid
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { status: newStatus } = body;

    if (!newStatus || !Object.values(TaskStatus).includes(newStatus as TaskStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Fetch the task and verify ownership
    const task = await db.task.findUnique({
      where: { id },
      select: {
        id: true,
        assignedUserId: true,
        status: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Only the assigned user can update their own task status
    if (task.assignedUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only update your own tasks" },
        { status: 403 }
      );
    }

    // Validate the status transition
    const allowedTransitions = VALID_TRANSITIONS[task.status];
    if (!allowedTransitions.includes(newStatus as TaskStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition from ${task.status} to ${newStatus}`,
        },
        { status: 400 }
      );
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: { status: newStatus as TaskStatus },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error("[PATCH /api/tasks/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}
