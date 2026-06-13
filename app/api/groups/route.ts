import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/**
 * Generates a random invite code, avoiding ambiguous characters (0, O, 1, l, I).
 * Retries up to 5 times if the code collides with an existing group.
 */
async function generateUniqueInviteCode(): Promise<string> {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let code = "";
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
    }

    const existing = await db.group.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Failed to generate a unique invite code after maximum retries");
}

/**
 * POST /api/groups — Creates a new group.
 *
 * Body: { name: string }
 *
 * Returns: { success: true, data: { id, inviteCode } }
 *
 * Side effects:
 * - Creates the Group record
 * - Adds the creator as the first GroupMember
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
        { success: false, error: "User not found in database. Please wait for account sync." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Group name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: "Group name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const inviteCode = await generateUniqueInviteCode();

    // Transaction: create group + add creator as first member
    const group = await db.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name: name.trim(),
          inviteCode,
          createdById: user.id,
        },
        select: {
          id: true,
          inviteCode: true,
          name: true,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: newGroup.id,
          userId: user.id,
        },
      });

      return newGroup;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
      },
    });
  } catch (error) {
    console.error("[POST /api/groups] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create group" },
      { status: 500 }
    );
  }
}
