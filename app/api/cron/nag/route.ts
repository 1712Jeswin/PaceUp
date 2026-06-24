import { NextRequest, NextResponse } from "next/server";
import { processOverdueTasks, processMissingStandups, sendNagEmails } from "@/lib/nag";
import type { ApiResponse } from "@/types";

/**
 * GET /api/cron/nag
 *
 * Daily nag loop triggered by Vercel Cron.
 * Protected by CRON_SECRET — rejects unauthorized requests.
 *
 * 1. Finds overdue tasks and creates TASK_OVERDUE notifications
 * 2. Finds missing standups and creates STANDUP_MISSING notifications
 * 3. Sends batched nag emails via Resend
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // Verify cron secret — Vercel sends this as Authorization: Bearer <secret>
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!CRON_SECRET) {
    console.error("[Cron Nag] CRON_SECRET is not set");
    return NextResponse.json(
      { success: false, error: "Cron secret not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const expectedHeader = `Bearer ${CRON_SECRET}`;

  if (authHeader !== expectedHeader) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Step 1: Process overdue tasks
    const overdueItems = await processOverdueTasks();

    // Step 2: Process missing standups
    const missingStandups = await processMissingStandups();

    // Step 3: Send nag emails
    await sendNagEmails(overdueItems, missingStandups);

    return NextResponse.json({
      success: true,
      data: {
        overdueTasksFound: overdueItems.length,
        missingStandupsFound: missingStandups.length,
      },
    });
  } catch (error) {
    console.error("[Cron Nag] Failed:", error);
    return NextResponse.json(
      { success: false, error: "Nag loop failed" },
      { status: 500 }
    );
  }
}
