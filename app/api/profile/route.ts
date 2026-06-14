import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse, SkillLanguage, SkillDomain } from "@/types";
import { SKILL_LANGUAGES, SKILL_DOMAINS } from "@/types";
import { UserLevel } from "@prisma/client";
import { getOrCreateUser } from "@/lib/user";

/**
 * PATCH /api/profile — Updates the user's skill profile.
 *
 * Body: {
 *   skills: string[]    — programming languages
 *   domains: string[]   — domain areas
 *   level: string       — BEGINNER | MID | ADVANCED
 * }
 *
 * Validates that:
 * - skills is a non-empty array of valid language strings
 * - domains is a non-empty array of valid domain strings
 * - level is a valid UserLevel enum value
 */
export async function PATCH(req: Request): Promise<NextResponse<ApiResponse>> {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { skills, domains, level } = body;

    // Validate skills
    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one skill is required" },
        { status: 400 }
      );
    }

    const validSkills = skills.every(
      (s: unknown) => typeof s === "string" && (SKILL_LANGUAGES as readonly string[]).includes(s)
    );
    if (!validSkills) {
      return NextResponse.json(
        { success: false, error: "Invalid skill value detected" },
        { status: 400 }
      );
    }

    // Validate domains
    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one domain is required" },
        { status: 400 }
      );
    }

    const validDomains = domains.every(
      (d: unknown) => typeof d === "string" && (SKILL_DOMAINS as readonly string[]).includes(d)
    );
    if (!validDomains) {
      return NextResponse.json(
        { success: false, error: "Invalid domain value detected" },
        { status: 400 }
      );
    }

    // Validate level
    if (!level || !Object.values(UserLevel).includes(level as UserLevel)) {
      return NextResponse.json(
        { success: false, error: "Invalid comfort level. Must be BEGINNER, MID, or ADVANCED." },
        { status: 400 }
      );
    }

    // Ensure the user exists in the database
    const user = await getOrCreateUser(clerkId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Failed to resolve or create user profile." },
        { status: 500 }
      );
    }

    const updatedUser = await db.user.update({
      where: { clerkId },
      data: {
        skills: skills as SkillLanguage[],
        domains: domains as SkillDomain[],
        level: level as UserLevel,
      },
      select: {
        id: true,
        skills: true,
        domains: true,
        level: true,
      },
    });

    revalidatePath('/dashboard');

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("[PATCH /api/profile] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
