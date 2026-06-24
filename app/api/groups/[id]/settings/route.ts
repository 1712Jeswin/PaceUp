import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptKey, decryptKey } from "@/lib/crypto";
import {
  parseGithubRepoUrl,
  verifyRepoAccessible,
  registerWebhook,
  deleteWebhook,
} from "@/lib/github";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const WEBHOOK_ENDPOINT = `${APP_URL}/api/webhooks/github`;

/**
 * GET /api/groups/[id]/settings
 * Fetches group settings (GitHub integration status).
 */
export async function GET(
  _req: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id: groupId } = await params;
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

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      createdById: true,
      githubRepoUrl: true,
      githubWebhookId: true,
    },
  });

  if (!group) {
    return NextResponse.json(
      { success: false, error: "Group not found" },
      { status: 404 }
    );
  }

  if (group.createdById !== user.id) {
    return NextResponse.json(
      { success: false, error: "Only the group creator can manage settings" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      githubRepoUrl: group.githubRepoUrl,
      isLinked: !!group.githubWebhookId,
    },
  });
}

/**
 * PUT /api/groups/[id]/settings
 * Links a GitHub repo: validates URL, verifies access, registers webhook.
 */
export async function PUT(
  req: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id: groupId } = await params;
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

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, createdById: true },
  });

  if (!group || group.createdById !== user.id) {
    return NextResponse.json(
      { success: false, error: "Only the group creator can manage settings" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as { githubRepoUrl: string; githubPat: string };

  if (!body.githubRepoUrl || !body.githubPat) {
    return NextResponse.json(
      { success: false, error: "GitHub repo URL and Personal Access Token are required" },
      { status: 400 }
    );
  }

  // Validate URL format
  const repoInfo = parseGithubRepoUrl(body.githubRepoUrl);
  if (!repoInfo) {
    return NextResponse.json(
      { success: false, error: "Invalid GitHub repo URL. Expected format: https://github.com/owner/repo" },
      { status: 400 }
    );
  }

  // Verify repo is accessible with the provided PAT
  const isAccessible = await verifyRepoAccessible(
    repoInfo.owner,
    repoInfo.repo,
    body.githubPat
  );

  if (!isAccessible) {
    return NextResponse.json(
      { success: false, error: "Cannot access this repo. Check the URL and ensure your PAT has repo access." },
      { status: 400 }
    );
  }

  if (!GITHUB_WEBHOOK_SECRET) {
    return NextResponse.json(
      { success: false, error: "GITHUB_WEBHOOK_SECRET is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    // Register webhook on the repo
    const result = await registerWebhook(
      repoInfo.owner,
      repoInfo.repo,
      body.githubPat,
      WEBHOOK_ENDPOINT,
      GITHUB_WEBHOOK_SECRET
    );

    // Store the webhook info and encrypted PAT
    await db.group.update({
      where: { id: groupId },
      data: {
        githubRepoUrl: body.githubRepoUrl.trim(),
        githubWebhookId: result.hookId,
        githubPat: encryptKey(body.githubPat),
      },
    });

    return NextResponse.json({
      success: true,
      data: { githubRepoUrl: body.githubRepoUrl, hookId: result.hookId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register webhook";
    console.error("[Group Settings] Webhook registration failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[id]/settings
 * Unlinks a GitHub repo: removes webhook, clears group fields.
 */
export async function DELETE(
  _req: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id: groupId } = await params;
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

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      createdById: true,
      githubRepoUrl: true,
      githubWebhookId: true,
      githubPat: true,
    },
  });

  if (!group || group.createdById !== user.id) {
    return NextResponse.json(
      { success: false, error: "Only the group creator can manage settings" },
      { status: 403 }
    );
  }

  // Delete webhook from GitHub if we have the info
  if (group.githubRepoUrl && group.githubWebhookId && group.githubPat) {
    const repoInfo = parseGithubRepoUrl(group.githubRepoUrl);
    if (repoInfo) {
      const pat = decryptKey(group.githubPat);
      await deleteWebhook(repoInfo.owner, repoInfo.repo, pat, group.githubWebhookId);
    }
  }

  // Clear the GitHub fields
  await db.group.update({
    where: { id: groupId },
    data: {
      githubRepoUrl: null,
      githubWebhookId: null,
      githubPat: null,
    },
  });

  return NextResponse.json({ success: true });
}
