import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";

interface LeaveGroupRouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/groups/[id]/leave — Leave a group.
 *
 * Sets GroupMember.isActive = false and leftAt = now().
 * The creator cannot leave their own group.
 * Does NOT delete the row — preserves history for "Previous Groups".
 */
export async function POST(
  _req: Request,
  { params }: LeaveGroupRouteProps
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id: groupId } = await params;
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
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify the group exists and get createdById
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

    // Creator cannot leave their own group
    if (group.createdById === user.id) {
      return NextResponse.json(
        { success: false, error: "The group creator cannot leave the group. Delete the group instead." },
        { status: 403 }
      );
    }

    // Find the membership
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
      select: { id: true, isActive: true },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You are not a member of this group" },
        { status: 404 }
      );
    }

    if (!membership.isActive) {
      return NextResponse.json(
        { success: false, error: "You have already left this group" },
        { status: 409 }
      );
    }

    await db.groupMember.update({
      where: { id: membership.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/group/${groupId}`);

    return NextResponse.json({
      success: true,
      data: { message: "You have left the group" },
    });
  } catch (error) {
    console.error("[POST /api/groups/[id]/leave] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to leave group" },
      { status: 500 }
    );
  }
}
