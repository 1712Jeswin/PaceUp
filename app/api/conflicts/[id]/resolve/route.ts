import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/conflicts/[id]/resolve
 * Marks a conflict alert as resolved.
 * Only group members can resolve conflicts.
 */
export async function POST(
  _req: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id: conflictId } = await params;
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

  const conflict = await db.conflictAlert.findUnique({
    where: { id: conflictId },
    select: { id: true, groupId: true, resolvedAt: true },
  });

  if (!conflict) {
    return NextResponse.json(
      { success: false, error: "Conflict not found" },
      { status: 404 }
    );
  }

  if (conflict.resolvedAt) {
    return NextResponse.json(
      { success: false, error: "Conflict is already resolved" },
      { status: 409 }
    );
  }

  // Verify user is a member of the group
  const membership = await db.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: conflict.groupId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json(
      { success: false, error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  try {
    await db.conflictAlert.update({
      where: { id: conflictId },
      data: { resolvedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Conflicts] Failed to resolve:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve conflict" },
      { status: 500 }
    );
  }
}
