import { resend } from "@/lib/resend";

/**
 * Default from address.
 * WHY env var: In production, use a verified domain (e.g. invite@paceup.dev).
 * In dev, Resend sandbox only delivers to the account owner's email.
 */
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "PaceUp <onboarding@resend.dev>";

/**
 * Sends a group invitation email to a prospective member.
 * Gracefully no-ops if Resend is not configured (local dev without API key).
 *
 * @param to - Recipient email address
 * @param groupName - Name of the group the user is being invited to
 * @param inviteCode - The group's invite code
 */
export async function sendGroupInviteEmail(
  to: string,
  groupName: string,
  inviteCode: string
): Promise<void> {
  if (!resend) {
    console.warn(
      `[PaceUp Email] Skipped sending invite email to ${to} — Resend not configured.`
    );
    return;
  }

  try {
    const response = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `You've been invited to join "${groupName}" on PaceUp`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0a0a0f; color: #e4e4e7; border-radius: 12px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color: #39ff14;">PaceUp</h1>
          <p style="font-size: 14px; color: #71717a; margin: 0 0 24px 0;">AI Project Leader for Student Teams</p>
          
          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #71717a; margin: 0 0 8px 0;">You've been invited to join</p>
            <p style="font-size: 20px; font-weight: 700; color: #e4e4e7; margin: 0 0 16px 0;">${groupName}</p>
            <p style="font-size: 14px; color: #a1a1aa; margin: 0;">Use the invite code below to join on PaceUp:</p>
          </div>

          <div style="background: #18181b; border: 1px solid #39ff14; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #71717a; margin: 0 0 8px 0;">Invite Code</p>
            <p style="font-size: 28px; font-weight: 700; font-family: monospace; color: #39ff14; margin: 0; letter-spacing: 4px;">${inviteCode}</p>
          </div>

          <p style="font-size: 12px; color: #52525b; text-align: center; margin: 0;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log(`[PaceUp Email] Sent invite to ${to}:`, JSON.stringify(response));
  } catch (error) {
    // WHY: Email failure should not crash the invitation flow — log and continue
    console.error(`[PaceUp Email] Failed to send invite email to ${to}:`, error);
  }
}
