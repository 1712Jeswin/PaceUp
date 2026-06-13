import { Resend } from "resend";

/**
 * Resend email client stub.
 * Phase 1: Client is initialised but no emails are sent.
 * Phase 2: Used for nag loop emails (task overdue, standup reminders).
 *
 * WHY nullable: Email is optional in Phase 1. The app should not crash
 * if RESEND_API_KEY is not set (e.g. in local dev).
 */

function createResendClient(): Resend | null {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }

  console.warn(
    "[PaceUp] RESEND_API_KEY not set. Email client is disabled. " +
    "This is expected in Phase 1 — email sending is not implemented until Phase 2."
  );
  return null;
}

export const resend = createResendClient();
