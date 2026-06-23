import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ApiResponse, SkillLanguage, SkillDomain, ExtendedProfileData } from "@/types";
import { SKILL_LANGUAGES, SKILL_DOMAINS } from "@/types";
import { UserLevel } from "@prisma/client";
import { getOrCreateUser } from "@/lib/user";

/**
 * Attempts to extract text from a PDF file encoded as base64.
 * Uses pdf-parse for server-side parsing.
 * Returns the extracted text or null on failure.
 */
async function extractPdfText(base64Data: string): Promise<string | null> {
  try {
    // Dynamic import to avoid bundling issues — pdf-parse is a server-only dependency
    const pdfParseModule = await import("pdf-parse") as unknown as Record<string, unknown>;
    const pdfParse = (pdfParseModule.default || pdfParseModule) as (_data: Buffer) => Promise<{ text?: string }>;
    const buffer = Buffer.from(base64Data, "base64");
    const result = await pdfParse(buffer);
    return result.text?.trim() || null;
  } catch (error) {
    console.error("[extractPdfText] Failed to parse PDF:", error);
    return null;
  }
}

/**
 * Attempts to extract text from a DOCX file encoded as base64.
 * Uses mammoth for server-side parsing.
 * Returns the extracted text or null on failure.
 */
async function extractDocxText(base64Data: string): Promise<string | null> {
  try {
    const mammoth = await import("mammoth");
    const buffer = Buffer.from(base64Data, "base64");
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.trim() || null;
  } catch (error) {
    console.error("[extractDocxText] Failed to parse DOCX:", error);
    return null;
  }
}

/**
 * Extracts text from a plain text file encoded as base64.
 */
function extractPlainText(base64Data: string): string | null {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    return buffer.toString("utf-8").trim() || null;
  } catch {
    return null;
  }
}

/**
 * PATCH /api/profile — Updates the user's skill profile.
 *
 * Body: {
 *   skills: string[]          — programming languages (derived from proficiency data)
 *   domains: string[]         — domain areas
 *   level: string             — BEGINNER | MID | ADVANCED (derived from proficiencies)
 *   profileData?: object      — extended profile data (see ExtendedProfileData)
 *   resumeBase64?: string     — base64-encoded resume file for server-side parsing
 *   resumeFileType?: string   — MIME type of the resume file
 * }
 *
 * Validates that:
 * - skills is a non-empty array of valid language strings
 * - domains is a non-empty array of valid domain strings
 * - level is a valid UserLevel enum value
 * - profileData, if present, has the required top-level fields
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
    const { skills, domains, level, profileData, resumeBase64, resumeFileType } = body;

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

    // Validate profileData basic shape if present
    if (profileData) {
      const pd = profileData as ExtendedProfileData;
      if (!pd.headline || typeof pd.headline !== "string") {
        return NextResponse.json(
          { success: false, error: "Profile headline is required" },
          { status: 400 }
        );
      }
      if (!pd.bio || typeof pd.bio !== "string") {
        return NextResponse.json(
          { success: false, error: "Profile bio is required" },
          { status: 400 }
        );
      }
    }

    // Parse resume if provided
    let resumeText: string | null = null;
    if (resumeBase64 && typeof resumeBase64 === "string" && resumeFileType) {
      if (resumeFileType === "application/pdf") {
        resumeText = await extractPdfText(resumeBase64);
      } else if (
        resumeFileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        resumeText = await extractDocxText(resumeBase64);
      } else if (resumeFileType === "text/plain") {
        resumeText = extractPlainText(resumeBase64);
      }
      // If parsing failed, log but don't block — resume is optional
      if (!resumeText) {
        console.warn("[PATCH /api/profile] Resume parsing returned no text — proceeding without it");
      }
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
        ...(profileData ? { profileData } : {}),
        ...(resumeText ? { resumeText } : {}),
      },
      select: {
        id: true,
        skills: true,
        domains: true,
        level: true,
        profileData: true,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile/setup');

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
