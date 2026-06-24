import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAIModel } from "@/lib/ai";
import { fetchCommitDiff, parseGithubRepoUrl } from "@/lib/github";
import { decryptKey } from "@/lib/crypto";
import { generateText } from "ai";
import type { ApiResponse } from "@/types";
import type { ReviewResult } from "@prisma/client";

/**
 * POST /api/ai/review-code
 *
 * Triggers an AI code review for a specific task.
 * Fetches linked commits, retrieves diffs from GitHub,
 * builds a review prompt, and stores the review result.
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

  const body = (await req.json()) as { taskId: string };

  if (!body.taskId) {
    return NextResponse.json(
      { success: false, error: "taskId is required" },
      { status: 400 }
    );
  }

  // Fetch the task with its project brief and group
  const task = await db.task.findUnique({
    where: { id: body.taskId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      assignedUserId: true,
      assignedUser: {
        select: { id: true, name: true },
      },
      commitLinks: {
        select: {
          commit: {
            select: { sha: true, message: true, filesChanged: true },
          },
        },
      },
      projectBrief: {
        select: {
          group: {
            select: {
              id: true,
              createdById: true,
              githubRepoUrl: true,
              githubPat: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json(
      { success: false, error: "Task not found" },
      { status: 404 }
    );
  }

  const group = task.projectBrief.group;

  // Verify the requesting user is the group creator
  if (group.createdById !== user.id) {
    return NextResponse.json(
      { success: false, error: "Only the group creator can trigger code reviews" },
      { status: 403 }
    );
  }

  // Get the AI model
  let model;
  try {
    model = await getAIModel(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No active AI key found";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }

  // Build code context from commits
  let codeContext = "";

  if (
    task.commitLinks.length > 0 &&
    group.githubRepoUrl &&
    group.githubPat
  ) {
    const repoInfo = parseGithubRepoUrl(group.githubRepoUrl);
    if (repoInfo) {
      const pat = decryptKey(group.githubPat);
      // Fetch diffs for linked commits (limit to 5 most recent for token budget)
      const MAX_COMMITS_FOR_REVIEW = 5;
      const commitShas = task.commitLinks
        .map((cl) => cl.commit.sha)
        .slice(0, MAX_COMMITS_FOR_REVIEW);

      for (const sha of commitShas) {
        try {
          const diff = await fetchCommitDiff(
            repoInfo.owner,
            repoInfo.repo,
            sha,
            pat
          );
          codeContext += `\n--- Commit ${sha.slice(0, 7)}: ${diff.message} ---\n`;
          for (const file of diff.files) {
            if (file.patch) {
              codeContext += `\nFile: ${file.filename}\n${file.patch}\n`;
            }
          }
        } catch (error) {
          console.error(`[Code Review] Failed to fetch diff for ${sha}:`, error);
        }
      }
    }
  }

  // If no code context from diffs, use commit messages and file lists
  if (!codeContext.trim()) {
    codeContext = task.commitLinks
      .map((cl) => {
        const files = (cl.commit.filesChanged as string[]).join(", ");
        return `Commit ${cl.commit.sha.slice(0, 7)}: ${cl.commit.message} (files: ${files})`;
      })
      .join("\n");
  }

  // Build the review prompt
  const prompt = `You are an AI code reviewer for a student team project. Review the following code changes for a task.

TASK DETAILS:
- Title: ${task.title}
- Description: ${task.description}
- Assigned to: ${task.assignedUser.name}
- Status: ${task.status}

CODE CHANGES:
${codeContext || "No code changes available. Review based on task description only."}

Provide a thorough but constructive code review. Consider:
1. Code correctness and potential bugs
2. Code style and readability
3. Security concerns
4. Performance issues
5. Missing error handling
6. Test coverage gaps

Return ONLY valid JSON with no prose or markdown fences:
{
  "result": "PASS" | "FAIL" | "NEEDS_REVISION",
  "feedback": "Overall summary of the review (2-3 sentences)",
  "issues": ["Issue 1 description", "Issue 2 description"]
}

Use PASS if the code looks good overall with minor or no issues.
Use NEEDS_REVISION if there are medium issues that should be addressed.
Use FAIL if there are critical bugs, security issues, or major problems.`;

  try {
    const aiResult = await generateText({
      model,
      prompt,
      maxTokens: 2048,
    });

    let parsed: { result: string; feedback: string; issues: string[] };

    try {
      parsed = JSON.parse(aiResult.text);
    } catch {
      // Retry once if JSON is malformed
      const retryResult = await generateText({
        model,
        prompt: prompt + "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the JSON object, nothing else.",
        maxTokens: 2048,
      });

      try {
        parsed = JSON.parse(retryResult.text);
      } catch {
        return NextResponse.json(
          { success: false, error: "AI returned malformed response after retry" },
          { status: 502 }
        );
      }
    }

    // Validate result value
    const validResults = new Set(["PASS", "FAIL", "NEEDS_REVISION"]);
    if (!validResults.has(parsed.result)) {
      parsed.result = "NEEDS_REVISION";
    }

    // Store the review
    const review = await db.codeReview.create({
      data: {
        taskId: body.taskId,
        reviewedBy: user.id,
        result: parsed.result as ReviewResult,
        feedback: parsed.feedback || "No feedback provided",
        issues: parsed.issues || [],
      },
      select: {
        id: true,
        result: true,
        feedback: true,
        issues: true,
        createdAt: true,
      },
    });

    // Create notification for the task assignee if review failed or needs revision
    if (parsed.result !== "PASS") {
      await db.notification.create({
        data: {
          userId: task.assignedUserId,
          groupId: group.id,
          type: "REVIEW_REQUIRED",
          message: `Your task "${task.title}" received a code review: ${parsed.result}. ${parsed.feedback}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error("[Code Review] AI review failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete code review" },
      { status: 500 }
    );
  }
}
