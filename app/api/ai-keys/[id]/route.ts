import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

/**
 * DELETE /api/ai-keys/[id] — Deletes a specific AI key.
 *
 * Validates that the key belongs to the authenticated user before deleting.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    // Verify ownership before deleting
    const key = await db.aIKey.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key not found or does not belong to you" },
        { status: 404 }
      );
    }

    await db.aIKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/ai-keys/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete AI key" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai-keys/[id] — Toggles the active status of a key.
 *
 * Body: { isActive: boolean }
 *
 * If setting to active, deactivates all other keys for this user first.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    // Verify ownership
    const key = await db.aIKey.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key not found or does not belong to you" },
        { status: 404 }
      );
    }

    await db.$transaction(async (tx) => {
      if (isActive) {
        // Deactivate all other keys for this user
        await tx.aIKey.updateMany({
          where: { userId: user.id },
          data: { isActive: false },
        });
      }

      await tx.aIKey.update({
        where: { id },
        data: { isActive },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/ai-keys/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update AI key" },
      { status: 500 }
    );
  }
}
