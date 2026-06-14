import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";
import { sendGroupInviteEmail } from "@/lib/email";

/**
 * GET /api/invitations — Fetch pending in-app invitations for the current user.
 *
 * Returns invitations where the current user is the target (IN_APP_INVITE)
 * and status is PENDING.
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
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
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const invitations = await db.invitation.findMany({
      where: {
        userId: user.id,
        type: "IN_APP_INVITE",
        status: "PENDING",
      },
      select: {
        id: true,
        createdAt: true,
        group: {
          select: {
            id: true,
            name: true,
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
    console.error("[GET /api/invitations] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations — Create an invitation.
 *
 * Body depends on type:
 * - IN_APP_INVITE: { type: "IN_APP_INVITE", groupId, userCode }
 * - EMAIL_INVITE: { type: "EMAIL_INVITE", groupId, email }
 *
 * JOIN_REQUEST is handled by POST /api/groups/join instead.
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
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { type, groupId } = body;

    if (!type || !groupId) {
      return NextResponse.json(
        { success: false, error: "type and groupId are required" },
        { status: 400 }
      );
    }

    // Verify the user is the group creator
    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, inviteCode: true, createdById: true },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    if (group.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the group creator can send invitations" },
        { status: 403 }
      );
    }

    if (type === "IN_APP_INVITE") {
      const { userCode } = body;

      if (!userCode || typeof userCode !== "string") {
        return NextResponse.json(
          { success: false, error: "User code is required for in-app invites" },
          { status: 400 }
        );
      }

      // Find the target user by userCode
      const targetUser = await db.user.findFirst({
        where: { userCode: userCode.trim() },
        select: { id: true, name: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: "No user found with that code" },
          { status: 404 }
        );
      }

      if (targetUser.id === user.id) {
        return NextResponse.json(
          { success: false, error: "You cannot invite yourself" },
          { status: 400 }
        );
      }

      // Check if target is already an active member
      const existingMember = await db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: targetUser.id,
          },
        },
        select: { isActive: true },
      });

      if (existingMember?.isActive) {
        return NextResponse.json(
          { success: false, error: "This user is already a member of the group" },
          { status: 409 }
        );
      }

      // Check for existing pending invitation
      const existingInvite = await db.invitation.findFirst({
        where: {
          groupId: group.id,
          userId: targetUser.id,
          type: "IN_APP_INVITE",
          status: "PENDING",
        },
        select: { id: true },
      });

      if (existingInvite) {
        return NextResponse.json(
          { success: false, error: "This user already has a pending invitation" },
          { status: 409 }
        );
      }

      const invitation = await db.invitation.create({
        data: {
          groupId: group.id,
          userId: targetUser.id,
          type: "IN_APP_INVITE",
          initiatedById: user.id,
        },
        select: { id: true },
      });

      revalidatePath('/dashboard');
      revalidatePath(`/dashboard/group/${group.id}`);

      return NextResponse.json({
        success: true,
        data: { invitationId: invitation.id, targetUserName: targetUser.name },
      });
    }

    if (type === "EMAIL_INVITE") {
      const { email } = body;

      if (!email || typeof email !== "string") {
        return NextResponse.json(
          { success: false, error: "Email is required for email invitations" },
          { status: 400 }
        );
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: "Invalid email address" },
          { status: 400 }
        );
      }

      // Check if email belongs to an existing user who is already a member
      const existingUser = await db.user.findUnique({
        where: { email: email.trim() },
        select: { id: true },
      });

      if (existingUser) {
        const existingMember = await db.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId: existingUser.id,
            },
          },
          select: { isActive: true },
        });

        if (existingMember?.isActive) {
          return NextResponse.json(
            { success: false, error: "This email belongs to an existing group member" },
            { status: 409 }
          );
        }
      }

      // Check for existing pending email invitation
      const existingEmailInvite = await db.invitation.findFirst({
        where: {
          groupId: group.id,
          email: email.trim(),
          type: "EMAIL_INVITE",
          status: "PENDING",
        },
        select: { id: true },
      });

      if (existingEmailInvite) {
        return NextResponse.json(
          { success: false, error: "An invitation has already been sent to this email" },
          { status: 409 }
        );
      }

      const invitation = await db.invitation.create({
        data: {
          groupId: group.id,
          email: email.trim(),
          userId: existingUser?.id ?? null,
          type: "EMAIL_INVITE",
          initiatedById: user.id,
        },
        select: { id: true },
      });

      // Send the invitation email (fire-and-forget, logged on failure)
      await sendGroupInviteEmail(email.trim(), group.name, group.inviteCode);

      revalidatePath('/dashboard');
      revalidatePath(`/dashboard/group/${group.id}`);

      return NextResponse.json({
        success: true,
        data: { invitationId: invitation.id },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid invitation type. Use IN_APP_INVITE or EMAIL_INVITE." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[POST /api/invitations] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}
