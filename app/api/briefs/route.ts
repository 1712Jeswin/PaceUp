import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/**
 * POST /api/briefs — Creates a project brief for a group.
 *
 * Body: {
 *   groupId: string
 *   ideaStatement: string
 *   solutionApproach: string
 *   deadline: string (ISO date)
 *   scopeStatement: string
 * }
 *
 * Only the group creator can submit a brief.
 * Deadline must be in the future.
 * Only one brief per group (enforced by unique constraint on groupId).
 */
export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    const { groupId, ideaStatement, solutionApproach, deadline, scopeStatement } = body;

    // Validate required fields
    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json(
        { success: false, error: "Group ID is required" },
        { status: 400 }
      );
    }

    if (!ideaStatement || typeof ideaStatement !== "string" || ideaStatement.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Idea statement is required" },
        { status: 400 }
      );
    }

    if (!solutionApproach || typeof solutionApproach !== "string" || solutionApproach.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Solution approach is required" },
        { status: 400 }
      );
    }

    if (!scopeStatement || typeof scopeStatement !== "string" || scopeStatement.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Scope statement is required" },
        { status: 400 }
      );
    }

    if (!deadline) {
      return NextResponse.json(
        { success: false, error: "Deadline is required" },
        { status: 400 }
      );
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid deadline format" },
        { status: 400 }
      );
    }

    if (deadlineDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Deadline must be in the future" },
        { status: 400 }
      );
    }

    // Verify the user is the group creator
    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { createdById: true },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    if (group.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the group creator can submit a project brief" },
        { status: 403 }
      );
    }

    // Check if a brief already exists for this group
    const existingBrief = await db.projectBrief.findUnique({
      where: { groupId },
      select: { id: true, status: true },
    });

    if (existingBrief) {
      // If already analysed, lock it — no changes allowed
      if (existingBrief.status === "ANALYSED") {
        return NextResponse.json(
          { success: false, error: "This brief has already been analysed. Tasks are assigned." },
          { status: 409 }
        );
      }

      // If still DRAFT (e.g. AI failed on first attempt), allow updating
      const updatedBrief = await db.projectBrief.update({
        where: { id: existingBrief.id },
        data: {
          ideaStatement: ideaStatement.trim(),
          solutionApproach: solutionApproach.trim(),
          deadline: deadlineDate,
          scopeStatement: scopeStatement.trim(),
        },
        select: {
          id: true,
          groupId: true,
          status: true,
        },
      });

      revalidatePath(`/dashboard/group/${groupId}`);

      return NextResponse.json({
        success: true,
        data: updatedBrief,
      });
    }

    const brief = await db.projectBrief.create({
      data: {
        groupId,
        ideaStatement: ideaStatement.trim(),
        solutionApproach: solutionApproach.trim(),
        deadline: deadlineDate,
        scopeStatement: scopeStatement.trim(),
      },
      select: {
        id: true,
        groupId: true,
        status: true,
      },
    });

    revalidatePath(`/dashboard/group/${groupId}`);

    return NextResponse.json({
      success: true,
      data: brief,
    });
  } catch (error) {
    console.error("[POST /api/briefs] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project brief" },
      { status: 500 }
    );
  }
}

