import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";

interface PreviousGroupRouteProps {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/groups/[id]/previous — Remove a group from the user's
 * "Previous Groups" view.
 *
 * Actually deletes the GroupMember row, but only allowed when isActive === false.
 * Only the member themselves can delete their own previous group entry.
 */
export async function DELETE(
  _req: Request,
  { params }: PreviousGroupRouteProps
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
        { success: false, error: "No membership record found for this group" },
        { status: 404 }
      );
    }

    if (membership.isActive) {
      return NextResponse.json(
        { success: false, error: "Cannot remove an active group. Leave the group first." },
        { status: 400 }
      );
    }

    await db.groupMember.delete({
      where: { id: membership.id },
    });

    revalidatePath('/dashboard');

    return NextResponse.json({
      success: true,
      data: { message: "Group removed from history" },
    });
  } catch (error) {
    console.error("[DELETE /api/groups/[id]/previous] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove group from history" },
      { status: 500 }
    );
  }
}
