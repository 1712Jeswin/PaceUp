import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/**
 * POST /api/standup
 * Saves a standup response. One per user per group per day.
 */
export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
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

  const body = (await req.json()) as {
    groupId: string;
    didYesterday: string;
    planToday: string;
    blockers?: string;
  };

  if (!body.groupId || !body.didYesterday?.trim() || !body.planToday?.trim()) {
    return NextResponse.json(
      { success: false, error: "groupId, didYesterday, and planToday are required" },
      { status: 400 }
    );
  }

  // Verify user is a member of this group
  const membership = await db.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: body.groupId,
        userId: user.id,
      },
    },
    select: { id: true, isActive: true },
  });

  if (!membership || !membership.isActive) {
    return NextResponse.json(
      { success: false, error: "You are not an active member of this group" },
      { status: 403 }
    );
  }

  // Use today's date (UTC) for the unique constraint
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    const standup = await db.standupResponse.create({
      data: {
        userId: user.id,
        groupId: body.groupId,
        date: today,
        didYesterday: body.didYesterday.trim(),
        planToday: body.planToday.trim(),
        blockers: body.blockers?.trim() || null,
      },
      select: {
        id: true,
        date: true,
        didYesterday: true,
        planToday: true,
        blockers: true,
        submittedAt: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: standup });
  } catch (error) {
    // Handle unique constraint violation (already submitted today)
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "You have already submitted a standup for this group today" },
        { status: 409 }
      );
    }

    console.error("[Standup] Failed to save response:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save standup response" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/standup?groupId=[id]&date=[YYYY-MM-DD]
 * Fetches all standup responses for a group on a specific date.
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
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

  const searchParams = req.nextUrl.searchParams;
  const groupId = searchParams.get("groupId");
  const dateStr = searchParams.get("date");

  if (!groupId) {
    return NextResponse.json(
      { success: false, error: "groupId is required" },
      { status: 400 }
    );
  }

  // Verify membership
  const membership = await db.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json(
      { success: false, error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  // Parse date or default to today
  let queryDate: Date;
  if (dateStr) {
    queryDate = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(queryDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
  } else {
    queryDate = new Date();
    queryDate.setUTCHours(0, 0, 0, 0);
  }

  const responses = await db.standupResponse.findMany({
    where: {
      groupId,
      date: queryDate,
    },
    select: {
      id: true,
      didYesterday: true,
      planToday: true,
      blockers: true,
      submittedAt: true,
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  // Also fetch total member count for completion tracking
  const memberCount = await db.groupMember.count({
    where: { groupId, isActive: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      responses,
      memberCount,
      submitted: responses.length,
      date: queryDate.toISOString().slice(0, 10),
    },
  });
}
