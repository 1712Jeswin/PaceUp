import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { getOrCreateUser } from "@/lib/user";

/**
 * GET /api/users/search — Search users by name or userCode.
 *
 * Query params:
 * - q: search term (minimum 2 characters)
 * - groupId: (optional) exclude members of this group from results
 *
 * Returns up to 10 matching users.
 */
export async function GET(req: Request): Promise<NextResponse<ApiResponse>> {
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

    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim();
    const groupId = url.searchParams.get("groupId");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Build exclusion list: the current user + existing active members of the group
    const excludeIds: string[] = [user.id];

    if (groupId) {
      const existingMembers = await db.groupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true },
      });
      excludeIds.push(...existingMembers.map((m) => m.userId));
    }

    const users = await db.user.findMany({
      where: {
        id: { notIn: excludeIds },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { userCode: { equals: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        userCode: true,
        email: true,
      },
      take: 10,
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("[GET /api/users/search] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search users" },
      { status: 500 }
    );
  }
}
