import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/**
 * POST /api/groups/join — Joins a group by invite code.
 *
 * Body: { inviteCode: string }
 *
 * Returns: { success: true, data: { groupId } }
 *
 * Checks:
 * - User must be authenticated
 * - Invite code must exist
 * - User must not already be a member of the group
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
        { success: false, error: "User not found in database" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json(
        { success: false, error: "Invite code is required" },
        { status: 400 }
      );
    }

    const group = await db.group.findUnique({
      where: { inviteCode: inviteCode.trim() },
      select: { id: true, name: true },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Invalid invite code. No group found." },
        { status: 404 }
      );
    }

    // Check for existing membership — index on (groupId, userId) makes this fast
    const existingMember = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "You are already a member of this group" },
        { status: 409 }
      );
    }

    await db.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: { groupId: group.id },
    });
  } catch (error) {
    console.error("[POST /api/groups/join] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join group" },
      { status: 500 }
    );
  }
}
