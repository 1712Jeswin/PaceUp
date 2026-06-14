import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAIModel } from "@/lib/ai";
import { generateObject } from "ai";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import { db } from "@/lib/db";

/**
 * POST /api/briefs/parse — Parse an uploaded document into brief fields.
 *
 * Accepts FormData with a single file (PDF, DOCX, TXT, MD).
 * Uses the user's AI model to extract the four brief fields:
 * ideaStatement, solutionApproach, deadline, scopeStatement.
 *
 * Returns the extracted fields so the user can review before submitting.
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Extract text based on file type
    let extractedText: string;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      extractedText = await file.text();
    } else if (fileName.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const buffer = Buffer.from(await file.arrayBuffer());
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      extractedText = textResult.text;
      await parser.destroy();
    } else if (fileName.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. Upload a .pdf, .docx, .txt, or .md file.",
        },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Could not extract any text from the file." },
        { status: 400 }
      );
    }

    // Truncate to prevent excessively large prompts (max ~15k chars)
    const MAX_TEXT_LENGTH = 15000;
    const truncatedText =
      extractedText.length > MAX_TEXT_LENGTH
        ? extractedText.slice(0, MAX_TEXT_LENGTH) + "\n\n[...truncated]"
        : extractedText;

    // Use AI to extract structured brief fields
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

    const briefSchema = z.object({
      ideaStatement: z.string(),
      solutionApproach: z.string(),
      deadline: z.string().nullable(),
      scopeStatement: z.string(),
    });

    const result = await generateObject({
      model,
      schema: briefSchema,
      system: `You are a document parser for a project management tool called PaceUp.
Your job is to extract project brief information from a document.

Extract these four fields:
1. ideaStatement — What is the project about? The core idea in 2-3 sentences.
2. solutionApproach — How will they build it? Technologies, architecture, methodology.
3. deadline — The project deadline as an ISO date string (YYYY-MM-DD). If no deadline is mentioned, return null.
4. scopeStatement — What is in scope and out of scope?

If a field cannot be determined from the document, use an empty string "" for text fields and null for deadline.`,
      prompt: `Extract the project brief fields from this document:\n\n${truncatedText}`,
      temperature: 0.1,
    });

    const parsed = result.object;

    return NextResponse.json({
      success: true,
      data: {
        ideaStatement: parsed.ideaStatement,
        solutionApproach: parsed.solutionApproach,
        deadline: parsed.deadline,
        scopeStatement: parsed.scopeStatement,
      },
    });
  } catch (error) {
    console.error("[POST /api/briefs/parse] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to parse document" },
      { status: 500 }
    );
  }
}
