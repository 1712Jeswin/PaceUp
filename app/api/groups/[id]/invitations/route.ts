import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";

interface GroupInvitationsRouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/groups/[id]/invitations — Fetch all pending invitations/join requests
 * for a specific group. Creator only.
 */
export async function GET(
  _req: Request,
  { params }: GroupInvitationsRouteProps
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

    // Verify user is the group creator
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
        { success: false, error: "Only the group creator can view group invitations" },
        { status: 403 }
      );
    }

    const invitations = await db.invitation.findMany({
      where: {
        groupId,
        status: "PENDING",
      },
      select: {
        id: true,
        type: true,
        email: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userCode: true,
          },
        },
        initiatedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: invitations });
  } catch (error) {
    console.error("[GET /api/groups/[id]/invitations] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch group invitations" },
      { status: 500 }
    );
  }
}
