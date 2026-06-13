import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

/**
 * Clerk webhook handler — syncs Clerk users to the Neon User table.
 *
 * Events handled:
 * - user.created: Creates a new User row
 * - user.updated: Updates name/email on the existing User row
 *
 * Security: Verifies the Svix webhook signature before processing.
 * Rejects with 401 if the signature is invalid.
 */
export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { success: false, error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Verify the webhook signature
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { success: false, error: "Missing Svix headers" },
      { status: 401 }
    );
  }

  const payload: unknown = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event: WebhookEvent;

  try {
    const verified: unknown = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    event = verified as WebhookEvent;
  } catch {
    console.error("[Clerk Webhook] Signature verification failed");
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const eventType = event.type;

  try {
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name } = event.data;

      const primaryEmail = email_addresses?.[0]?.email_address;
      if (!primaryEmail) {
        console.error("[Clerk Webhook] user.created event has no email");
        return NextResponse.json(
          { success: false, error: "No email address found" },
          { status: 400 }
        );
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

      await db.user.create({
        data: {
          clerkId: id,
          name,
          email: primaryEmail,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name } = event.data;

      const primaryEmail = email_addresses?.[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(" ") || "User";

      const updateData: { name: string; email?: string } = { name };
      if (primaryEmail) {
        updateData.email = primaryEmail;
      }

      await db.user.update({
        where: { clerkId: id },
        data: updateData,
      });

      return NextResponse.json({ success: true });
    }

    // Unhandled event type — acknowledge but do nothing
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[Clerk Webhook] Error processing ${eventType}:`, error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
