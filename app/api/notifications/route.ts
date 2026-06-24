import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

const MAX_NOTIFICATIONS = 50;

/**
 * GET /api/notifications
 * Fetches recent notifications for the current user.
 * Returns both unread and recent read notifications.
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
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

  try {
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        message: true,
        readAt: true,
        createdAt: true,
        groupId: true,
        group: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    });

    const unreadCount = await db.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    console.error("[Notifications] Failed to fetch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
