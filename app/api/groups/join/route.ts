import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";

/**
 * POST /api/groups/join — Submits a join request for a group by invite code.
 *
 * Body: { inviteCode: string }
 *
 * Returns: { success: true, data: { status: "PENDING", groupName } }
 *
 * Checks:
 * - User must be authenticated
 * - Invite code must exist
 * - User must not already be an active member of the group
 * - User must not already have a pending join request
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

    const user = await getOrCreateUser(clerkId);

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
      select: { id: true, name: true, createdById: true },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Invalid invite code. No group found." },
        { status: 404 }
      );
    }

    // Check for existing active membership — index on (groupId, userId) makes this fast
    const existingMember = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      select: { id: true, isActive: true },
    });

    if (existingMember?.isActive) {
      return NextResponse.json(
        { success: false, error: "You are already a member of this group" },
        { status: 409 }
      );
    }

    // Check for existing pending join request
    const existingRequest = await db.invitation.findFirst({
      where: {
        groupId: group.id,
        userId: user.id,
        type: "JOIN_REQUEST",
        status: "PENDING",
      },
      select: { id: true },
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: "You already have a pending join request for this group" },
        { status: 409 }
      );
    }

    // Create the join request invitation
    await db.invitation.create({
      data: {
        groupId: group.id,
        userId: user.id,
        type: "JOIN_REQUEST",
        status: "PENDING",
        initiatedById: user.id,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/group/${group.id}`);

    return NextResponse.json({
      success: true,
      data: { status: "PENDING", groupName: group.name },
    });
  } catch (error) {
    console.error("[POST /api/groups/join] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit join request" },
      { status: 500 }
    );
  }
}
