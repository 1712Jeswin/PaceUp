import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAIModel } from "@/lib/ai";
import { generateText } from "ai";
import type { ApiResponse, AIAssignmentResponse } from "@/types";

const MAX_AI_RETRIES = 1;

/**
 * Builds the system prompt for the AI task assignment engine.
 * Instructs the AI to return structured JSON only — no prose, no markdown fences.
 */
function buildAssignmentSystemPrompt(): string {
  return `You are an AI project leader for a student team. Your job is to analyze the project brief and assign roles and tasks to each team member based on their skills and experience level.

RULES:
1. Assign a specific role to each member based on their skills and domains (e.g., "Backend Engineer", "Frontend Lead", "UI/UX Designer"). Do NOT assign roles randomly.
2. Break the project into concrete, actionable tasks. Each task must be specific enough that a student can start working on it immediately.
   - BAD: "Work on the backend"
   - GOOD: "Build the POST /api/users endpoint with input validation and error handling"
3. No two members should have identical tasks.
4. Balance the workload relative to the deadline and each member's comfort level (beginners get fewer and simpler tasks).
5. Estimate the number of days each task will take.
6. Return ONLY valid JSON. No prose, no explanation, no markdown code fences.

RESPONSE FORMAT (JSON array):
[
  {
    "userId": "<member's database user ID>",
    "role": "<assigned role>",
    "tasks": [
      {
        "title": "<short task title>",
        "description": "<detailed, actionable description>",
        "estimatedDays": <number>
      }
    ]
  }
]`;
}

/**
 * Builds the user prompt with project details and member profiles.
 */
function buildAssignmentUserPrompt(
  brief: {
    ideaStatement: string;
    solutionApproach: string;
    deadline: Date;
    scopeStatement: string;
  },
  members: Array<{
    userId: string;
    name: string;
    skills: unknown;
    domains: unknown;
    level: string | null;
    profileData: unknown;
    resumeText: string | null;
  }>
): string {
  const deadlineStr = brief.deadline.toISOString().split("T")[0];
  const daysUntilDeadline = Math.ceil(
    (brief.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const memberDescriptions = members
    .map((m) => {
      let desc = `- ${m.name} (userId: "${m.userId}")
  Skills: ${JSON.stringify(m.skills)}
  Domains: ${JSON.stringify(m.domains)}
  Level: ${m.level ?? "UNKNOWN"}`;

      // Include extended profile data if available
      if (m.profileData && typeof m.profileData === "object") {
        const pd = m.profileData as Record<string, unknown>;
        if (pd.headline) desc += `\n  Headline: ${pd.headline}`;
        if (pd.currentRole) desc += `\n  Current Role: ${pd.currentRole}`;
        if (pd.yearsOfExperience !== undefined) desc += `\n  Years of Experience: ${pd.yearsOfExperience}`;
        if (pd.education) desc += `\n  Education: ${pd.education}`;
        if (Array.isArray(pd.languageProficiencies) && pd.languageProficiencies.length > 0) {
          desc += `\n  Language Proficiencies: ${JSON.stringify(pd.languageProficiencies)}`;
        }
        if (Array.isArray(pd.frameworks) && pd.frameworks.length > 0) {
          desc += `\n  Frameworks: ${JSON.stringify(pd.frameworks)}`;
        }
        if (Array.isArray(pd.tools) && pd.tools.length > 0) {
          desc += `\n  Tools: ${JSON.stringify(pd.tools)}`;
        }
        if (Array.isArray(pd.databases) && pd.databases.length > 0) {
          desc += `\n  Databases: ${JSON.stringify(pd.databases)}`;
        }
        if (Array.isArray(pd.preferredRoles) && pd.preferredRoles.length > 0) {
          desc += `\n  Preferred Roles: ${JSON.stringify(pd.preferredRoles)}`;
        }
        if (pd.challengePreference) desc += `\n  Challenge Preference: ${pd.challengePreference}`;
        if (Array.isArray(pd.previousProjects) && pd.previousProjects.length > 0) {
          desc += `\n  Previous Projects: ${JSON.stringify(pd.previousProjects)}`;
        }
      }

      // Include parsed resume text if available (truncated to avoid token bloat)
      if (m.resumeText) {
        const MAX_RESUME_CHARS = 2000;
        const truncated = m.resumeText.length > MAX_RESUME_CHARS
          ? m.resumeText.slice(0, MAX_RESUME_CHARS) + "...[truncated]"
          : m.resumeText;
        desc += `\n  Resume Summary: ${truncated}`;
      }

      return desc;
    })
    .join("\n");

  return `PROJECT BRIEF:
Idea: ${brief.ideaStatement}
Solution Approach: ${brief.solutionApproach}
Deadline: ${deadlineStr} (${daysUntilDeadline} days from now)
Scope: ${brief.scopeStatement}

TEAM MEMBERS (${members.length} total):
${memberDescriptions}

Assign roles and tasks to each member. Return ONLY valid JSON.`;
}

/**
 * Attempts to parse the AI response as valid JSON.
 * Handles cases where the AI wraps the JSON in markdown code fences.
 */
function parseAIResponse(text: string): AIAssignmentResponse {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Validate the shape
  if (!Array.isArray(parsed)) {
    throw new Error("AI response is not an array");
  }

  for (const assignment of parsed) {
    if (!assignment.userId || typeof assignment.userId !== "string") {
      throw new Error("Missing or invalid userId in assignment");
    }
    if (!assignment.role || typeof assignment.role !== "string") {
      throw new Error("Missing or invalid role in assignment");
    }
    if (!Array.isArray(assignment.tasks) || assignment.tasks.length === 0) {
      throw new Error(`No tasks assigned for member ${assignment.userId}`);
    }
    for (const task of assignment.tasks) {
      if (!task.title || !task.description || typeof task.estimatedDays !== "number") {
        throw new Error("Invalid task shape: missing title, description, or estimatedDays");
      }
    }
  }

  return parsed as AIAssignmentResponse;
}

/**
 * POST /api/ai/assign-tasks — AI-powered role and task assignment.
 *
 * Body: { briefId: string }
 *
 * Flow:
 * 1. Fetch ProjectBrief + GroupMembers + User profiles
 * 2. Fetch the active AIKey for the group creator
 * 3. Build structured prompt
 * 4. Call AI provider via Vercel AI SDK
 * 5. Parse response → save roles to GroupMember, tasks to Task table
 * 6. Update ProjectBrief status to ANALYSED
 *
 * Retries once if the AI returns malformed JSON.
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

    const body = await req.json();
    const { briefId } = body;

    if (!briefId || typeof briefId !== "string") {
      return NextResponse.json(
        { success: false, error: "Brief ID is required" },
        { status: 400 }
      );
    }

    // Fetch the brief
    const brief = await db.projectBrief.findUnique({
      where: { id: briefId },
      select: {
        id: true,
        groupId: true,
        ideaStatement: true,
        solutionApproach: true,
        deadline: true,
        scopeStatement: true,
        status: true,
        group: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!brief) {
      return NextResponse.json(
        { success: false, error: "Brief not found" },
        { status: 404 }
      );
    }

    // Only the group creator can trigger assignment
    if (brief.group.createdById !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the group creator can trigger AI assignment" },
        { status: 403 }
      );
    }

    // If already analysed, delete existing tasks and roles to allow re-assignment
    if (brief.status === "ANALYSED") {
      await db.$transaction(async (tx) => {
        // Delete existing tasks for this brief
        await tx.task.deleteMany({
          where: { projectBriefId: brief.id },
        });
        // Reset roles on group members
        await tx.groupMember.updateMany({
          where: { groupId: brief.groupId },
          data: { role: null },
        });
        // Reset brief status to DRAFT for re-analysis
        await tx.projectBrief.update({
          where: { id: brief.id },
          data: { status: "DRAFT" },
        });
      });
    }

    // Fetch all group members with their profiles
    const members = await db.groupMember.findMany({
      where: { groupId: brief.groupId },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            skills: true,
            domains: true,
            level: true,
            profileData: true,
            resumeText: true,
          },
        },
      },
    });

    if (members.length === 0) {
      return NextResponse.json(
        { success: false, error: "No members found in group" },
        { status: 400 }
      );
    }

    const memberProfiles = members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      skills: m.user.skills,
      domains: m.user.domains,
      level: m.user.level,
      profileData: m.user.profileData,
      resumeText: m.user.resumeText,
    }));

    // Get the AI model using the group creator's active key
    let model;
    try {
      model = await getAIModel(user.id);
    } catch (aiKeyError: unknown) {
      let errorMessage = "Failed to load AI model";
      if (aiKeyError instanceof Error) {
        errorMessage = aiKeyError.message;
      }
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const systemPrompt = buildAssignmentSystemPrompt();
    const userPrompt = buildAssignmentUserPrompt(
      {
        ideaStatement: brief.ideaStatement,
        solutionApproach: brief.solutionApproach,
        deadline: brief.deadline,
        scopeStatement: brief.scopeStatement,
      },
      memberProfiles
    );

    // Call the AI with retry logic for malformed JSON
    let assignments: AIAssignmentResponse | null = null;

    for (let attempt = 0; attempt <= MAX_AI_RETRIES; attempt++) {
      try {
        const result = await generateText({
          model,
          system: systemPrompt,
          prompt: userPrompt,
          maxTokens: 4096,
          temperature: 0.3,
        });

        assignments = parseAIResponse(result.text);
        break;
      } catch (parseError) {
        if (attempt === MAX_AI_RETRIES) {
          console.error("[AI Assignment] Failed after retries:", parseError);
          return NextResponse.json(
            {
              success: false,
              error: "AI returned invalid response. Please try again.",
            },
            { status: 502 }
          );
        }
        // Retry
        console.warn(`[AI Assignment] Retry ${attempt + 1}: malformed response`);
      }
    }

    if (!assignments) {
      return NextResponse.json(
        { success: false, error: "AI assignment failed" },
        { status: 502 }
      );
    }

    // Validate that all assigned userIds are actual group members
    const memberUserIds = new Set(memberProfiles.map((m) => m.userId));
    for (const assignment of assignments) {
      if (!memberUserIds.has(assignment.userId)) {
        return NextResponse.json(
          {
            success: false,
            error: `AI assigned tasks to unknown user ${assignment.userId}`,
          },
          { status: 502 }
        );
      }
    }

    // Save everything in a transaction
    await db.$transaction(async (tx) => {
      // Update roles on GroupMember records
      for (const assignment of assignments!) {
        await tx.groupMember.updateMany({
          where: {
            groupId: brief.groupId,
            userId: assignment.userId,
          },
          data: { role: assignment.role },
        });

        // Create tasks
        for (const task of assignment.tasks) {
          await tx.task.create({
            data: {
              projectBriefId: brief.id,
              assignedUserId: assignment.userId,
              title: task.title,
              description: task.description,
              estimatedDays: task.estimatedDays,
            },
          });
        }
      }

      // Update brief status
      await tx.projectBrief.update({
        where: { id: brief.id },
        data: { status: "ANALYSED" },
      });
    });

    revalidatePath(`/dashboard/group/${brief.groupId}`);
    revalidatePath(`/dashboard/group/${brief.groupId}/tasks`);
    revalidatePath('/dashboard');

    return NextResponse.json({
      success: true,
      data: { briefId: brief.id, assignmentCount: assignments.length },
    });
  } catch (error) {
    console.error("[POST /api/ai/assign-tasks] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign tasks" },
      { status: 500 }
    );
  }
}
