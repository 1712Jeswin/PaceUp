import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";

/**
 * GET /api/invitations/count — Returns the count of pending in-app invitations
 * for the current user. Used by the sidebar notification badge.
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

    const count = await db.invitation.count({
      where: {
        userId: user.id,
        type: "IN_APP_INVITE",
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    console.error("[GET /api/invitations/count] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitation count" },
      { status: 500 }
    );
  }
}
