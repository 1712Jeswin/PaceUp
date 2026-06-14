import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptKey } from "@/lib/crypto";
import { AIProvider } from "@prisma/client";
import { PROVIDER_MODELS } from "@/lib/ai";
import type { ApiResponse } from "@/types";

/**
 * GET /api/ai-keys — Lists the user's AI keys (without exposing encrypted data).
 *
 * Returns keys with encryptedKey replaced by a masked placeholder.
 * Never returns the actual encrypted or decrypted key to the client.
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

    const keys = await db.aIKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        modelName: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Add a masked placeholder — the client only knows a key exists, not its value
    const maskedKeys = keys.map((key) => ({
      ...key,
      keyPreview: "••••••••",
    }));

    return NextResponse.json({
      success: true,
      data: maskedKeys,
    });
  } catch (error) {
    console.error("[GET /api/ai-keys] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch AI keys" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-keys — Saves or updates an AI key for a provider.
 *
 * Body: {
 *   provider: AIProvider,
 *   apiKey: string,
 *   modelName: string,
 *   isActive: boolean
 * }
 *
 * The key is encrypted before storage. If isActive is true, all other
 * keys for this user are deactivated first.
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
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body: Record<string, unknown> = await req.json() as Record<string, unknown>;
    const provider = body.provider as string | undefined;
    const apiKey = body.apiKey as string | undefined;
    const modelName = body.modelName as string | undefined;
    const isActive = body.isActive as boolean | undefined;

    // Validate provider
    if (!provider || !Object.values(AIProvider).includes(provider as AIProvider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Check if a key already exists for this provider
    const existingKey = await db.aIKey.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: provider as AIProvider,
        },
      },
    });

    // Validate API key: required for new keys, optional for updating existing keys
    let encryptedKey: string;
    if (!existingKey) {
      if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: "API key is required and must be at least 10 characters" },
          { status: 400 }
        );
      }
      encryptedKey = encryptKey(apiKey.trim());
    } else {
      if (apiKey) {
        if (typeof apiKey !== "string" || apiKey.trim().length < 10) {
          return NextResponse.json(
            { success: false, error: "API key must be at least 10 characters" },
            { status: 400 }
          );
        }
        encryptedKey = encryptKey(apiKey.trim());
      } else {
        encryptedKey = existingKey.encryptedKey;
      }
    }

    // Validate model name against allowed models for this provider
    const allowedModels = PROVIDER_MODELS[provider as AIProvider];
    if (!modelName || !allowedModels.includes(modelName)) {
      return NextResponse.json(
        { success: false, error: `Invalid model. Allowed: ${allowedModels.join(", ")}` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      // If setting this key as active, deactivate all others for this user
      if (isActive) {
        await tx.aIKey.updateMany({
          where: { userId: user.id },
          data: { isActive: false },
        });
      }

      // Upsert: create or update the key for this provider
      await tx.aIKey.upsert({
        where: {
          userId_provider: {
            userId: user.id,
            provider: provider as AIProvider,
          },
        },
        update: {
          encryptedKey,
          modelName,
          isActive: isActive ?? false,
        },
        create: {
          userId: user.id,
          provider: provider as AIProvider,
          encryptedKey,
          modelName,
          isActive: isActive ?? false,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/ai-keys] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save AI key" },
      { status: 500 }
    );
  }
}
