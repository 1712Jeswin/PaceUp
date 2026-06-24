import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { verifyGithubWebhookSignature } from "@/lib/github";
import { detectFileConflicts } from "@/lib/conflict-detector";
import { generateText } from "ai";
import { getAIModel } from "@/lib/ai";
import type { ApiResponse } from "@/types";
import type { ConfidenceLevel } from "@prisma/client";

// ============================================
// Types for GitHub webhook payloads
// ============================================

interface GithubCommitPayload {
  id: string;
  message: string;
  timestamp: string;
  added: string[];
  removed: string[];
  modified: string[];
  author: {
    name: string;
    email: string;
    username: string;
  };
}

interface GithubPushPayload {
  ref: string;
  commits: GithubCommitPayload[];
  repository: {
    full_name: string;
  };
}

interface GithubPRPayload {
  action: string;
  number: number;
  pull_request: {
    title: string;
    state: string;
    merged: boolean;
    user: {
      login: string;
    };
  };
  repository: {
    full_name: string;
  };
}

// ============================================
// Commit-to-Task Matching
// ============================================

/**
 * Uses AI to match commits to tasks within a group.
 * Runs synchronously as per user preference.
 */
async function matchCommitsToTasks(
  groupId: string,
  commitIds: string[]
): Promise<void> {
  // Fetch the group to get the creator's AI key
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { createdById: true },
  });

  if (!group) return;

  // Fetch active tasks for this group
  const brief = await db.projectBrief.findUnique({
    where: { groupId },
    select: { id: true },
  });

  if (!brief) return;

  const tasks = await db.task.findMany({
    where: {
      projectBriefId: brief.id,
      status: { in: ["IN_PROGRESS", "DONE"] },
    },
    select: { id: true, title: true, description: true },
  });

  if (tasks.length === 0) return;

  // Fetch the commits we just stored
  const commits = await db.commit.findMany({
    where: { id: { in: commitIds } },
    select: {
      id: true,
      sha: true,
      message: true,
      filesChanged: true,
    },
  });

  if (commits.length === 0) return;

  // Try to get the AI model — if no key is set, skip matching silently
  let model;
  try {
    model = await getAIModel(group.createdById);
  } catch {
    console.warn("[GitHub Webhook] No active AI key for commit-to-task matching. Skipping.");
    return;
  }

  // Build the matching prompt
  const taskList = tasks
    .map((t) => `- Task ID: ${t.id} | Title: ${t.title} | Description: ${t.description}`)
    .join("\n");

  const commitList = commits
    .map((c) => {
      const files = (c.filesChanged as string[]).join(", ");
      return `- Commit ID: ${c.id} | SHA: ${c.sha.slice(0, 7)} | Message: ${c.message} | Files: ${files}`;
    })
    .join("\n");

  const prompt = `You are an AI project leader analyzing Git commits to determine which project task each commit contributes to.

Here are the active tasks:
${taskList}

Here are the new commits:
${commitList}

For each commit, determine which task it most likely contributes to based on the commit message and files changed.
Return ONLY valid JSON — no prose, no markdown fences.
Return an array of objects with this shape:
[{ "commitId": "string", "taskId": "string", "confidence": "HIGH" | "MEDIUM" | "LOW" }]

If a commit doesn't clearly match any task, use confidence "LOW" and pick the closest match.
If a commit truly matches no task at all, omit it from the results.`;

  try {
    const result = await generateText({
      model,
      prompt,
      maxTokens: 2048,
    });

    const parsed = JSON.parse(result.text) as Array<{
      commitId: string;
      taskId: string;
      confidence: string;
    }>;

    // Validate and store matches
    const validTaskIds = new Set(tasks.map((t) => t.id));
    const validCommitIds = new Set(commits.map((c) => c.id));
    const validConfidences = new Set(["HIGH", "MEDIUM", "LOW"]);

    for (const match of parsed) {
      if (
        !validCommitIds.has(match.commitId) ||
        !validTaskIds.has(match.taskId) ||
        !validConfidences.has(match.confidence)
      ) {
        continue;
      }

      // Upsert to avoid duplicates
      await db.commitTaskLink.upsert({
        where: {
          commitId_taskId: {
            commitId: match.commitId,
            taskId: match.taskId,
          },
        },
        create: {
          commitId: match.commitId,
          taskId: match.taskId,
          confidence: match.confidence as ConfidenceLevel,
        },
        update: {
          confidence: match.confidence as ConfidenceLevel,
        },
      });
    }
  } catch (error) {
    // WHY: Don't fail the webhook if AI matching fails — commits are already stored
    console.error("[GitHub Webhook] Commit-to-task matching failed:", error);
  }
}

// ============================================
// Webhook Handler
// ============================================

/**
 * POST /api/webhooks/github
 *
 * GitHub webhook handler for push and pull_request events.
 * Verifies X-Hub-Signature-256 before processing.
 */
export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

  if (!GITHUB_WEBHOOK_SECRET) {
    console.error("[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { success: false, error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Read the raw body for signature verification
  const rawBody = await req.text();

  // Verify signature
  const headerPayload = await headers();
  const signature = headerPayload.get("x-hub-signature-256");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing X-Hub-Signature-256 header" },
      { status: 401 }
    );
  }

  const isValid = verifyGithubWebhookSignature(rawBody, signature, GITHUB_WEBHOOK_SECRET);

  if (!isValid) {
    console.error("[GitHub Webhook] Signature verification failed");
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const eventType = headerPayload.get("x-github-event");
  const payload: unknown = JSON.parse(rawBody);

  try {
    if (eventType === "push") {
      return await handlePushEvent(payload as GithubPushPayload);
    }

    if (eventType === "pull_request") {
      return await handlePREvent(payload as GithubPRPayload);
    }

    // Acknowledge unhandled events (e.g., ping)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[GitHub Webhook] Error processing ${eventType ?? "unknown"} event:`, error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// Event Handlers
// ============================================

async function handlePushEvent(
  payload: GithubPushPayload
): Promise<NextResponse<ApiResponse>> {
  const repoFullName = payload.repository.full_name;

  // Find the group linked to this repo
  const group = await db.group.findFirst({
    where: {
      githubRepoUrl: {
        contains: repoFullName,
      },
    },
    select: { id: true },
  });

  if (!group) {
    // WHY: Repo may have been unlinked — acknowledge but do nothing
    return NextResponse.json({ success: true });
  }

  const storedCommitIds: string[] = [];
  const commitsForConflict: Array<{
    authorGithubUsername: string;
    filesChanged: string[];
    timestamp: Date;
  }> = [];

  for (const commit of payload.commits) {
    const filesChanged = [
      ...commit.added,
      ...commit.modified,
      ...commit.removed,
    ];

    // Upsert to handle duplicate webhook deliveries
    const stored = await db.commit.upsert({
      where: { sha: commit.id },
      create: {
        groupId: group.id,
        authorGithubUsername: commit.author.username,
        sha: commit.id,
        message: commit.message,
        filesChanged,
        timestamp: new Date(commit.timestamp),
      },
      update: {},
      select: { id: true },
    });

    storedCommitIds.push(stored.id);
    commitsForConflict.push({
      authorGithubUsername: commit.author.username,
      filesChanged,
      timestamp: new Date(commit.timestamp),
    });
  }

  // Run conflict detection
  try {
    await detectFileConflicts(group.id, commitsForConflict);
  } catch (error) {
    console.error("[GitHub Webhook] Conflict detection failed:", error);
  }

  // Run commit-to-task matching (synchronous as per user preference)
  await matchCommitsToTasks(group.id, storedCommitIds);

  return NextResponse.json({
    success: true,
    data: { commitsStored: storedCommitIds.length },
  });
}

async function handlePREvent(
  payload: GithubPRPayload
): Promise<NextResponse<ApiResponse>> {
  const repoFullName = payload.repository.full_name;

  const group = await db.group.findFirst({
    where: {
      githubRepoUrl: {
        contains: repoFullName,
      },
    },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ success: true });
  }

  // Map GitHub PR state to our enum
  const pr = payload.pull_request;
  let status: "OPEN" | "MERGED" | "CLOSED" = "OPEN";
  if (pr.merged) {
    status = "MERGED";
  } else if (pr.state === "closed") {
    status = "CLOSED";
  }

  await db.pullRequest.upsert({
    where: {
      groupId_number: {
        groupId: group.id,
        number: payload.number,
      },
    },
    create: {
      groupId: group.id,
      number: payload.number,
      title: pr.title,
      authorGithubUsername: pr.user.login,
      status,
    },
    update: {
      title: pr.title,
      status,
    },
  });

  return NextResponse.json({ success: true });
}
