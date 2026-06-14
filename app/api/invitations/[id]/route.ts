import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";

interface InvitationRouteProps {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/invitations/[id] — Accept or decline an invitation.
 *
 * Body: { action: "ACCEPT" | "DECLINE" }
 *
 * For JOIN_REQUEST: only the group creator can accept/decline.
 * For IN_APP_INVITE: only the invited user can accept/decline.
 */
export async function PATCH(
  req: Request,
  { params }: InvitationRouteProps
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id: invitationId } = await params;
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

    const body = await req.json();
    const { action } = body;

    if (!action || !["ACCEPT", "DECLINE"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action must be ACCEPT or DECLINE" },
        { status: 400 }
      );
    }

    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        groupId: true,
        userId: true,
        type: true,
        status: true,
        group: {
          select: { createdById: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "This invitation has already been processed" },
        { status: 409 }
      );
    }

    // Authorization check
    if (invitation.type === "JOIN_REQUEST") {
      // Only the group creator can accept/decline join requests
      if (invitation.group.createdById !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only the group creator can manage join requests" },
          { status: 403 }
        );
      }
    } else {
      // IN_APP_INVITE / EMAIL_INVITE: only the invited user can accept/decline
      if (invitation.userId !== user.id) {
        return NextResponse.json(
          { success: false, error: "You are not the target of this invitation" },
          { status: 403 }
        );
      }
    }

    if (action === "DECLINE") {
      await db.invitation.update({
        where: { id: invitationId },
        data: { status: "DECLINED" },
      });

      revalidatePath('/dashboard');
      revalidatePath(`/dashboard/group/${invitation.groupId}`);

      return NextResponse.json({ success: true, data: { status: "DECLINED" } });
    }

    // ACCEPT: create or reactivate a GroupMember row
    const targetUserId =
      invitation.type === "JOIN_REQUEST"
        ? invitation.userId
        : user.id;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Cannot determine the user to add to the group" },
        { status: 500 }
      );
    }

    await db.$transaction(async (tx) => {
      // Update invitation status
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED" },
      });

      // Upsert the group member (handles re-join after leaving)
      await tx.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId: targetUserId,
          },
        },
        create: {
          groupId: invitation.groupId,
          userId: targetUserId,
          isActive: true,
        },
        update: {
          isActive: true,
          leftAt: null,
        },
      });
    });

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/group/${invitation.groupId}`);

    return NextResponse.json({ success: true, data: { status: "ACCEPTED" } });
  } catch (error) {
    console.error("[PATCH /api/invitations/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process invitation" },
      { status: 500 }
    );
  }
}
