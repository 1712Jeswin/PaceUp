import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { generateUniqueUserCode } from "@/lib/invite-code";
import type { User } from "@prisma/client";

/**
 * Fetches a user from the database by clerkId, or creates them if missing
 * (e.g. if the Clerk webhook fails or is delayed in local dev).
 * Also ensures the user has a userCode — generates one if missing.
 *
 * @param clerkId - The Clerk user ID
 * @returns The database User object or null if not authenticated/found
 */
export async function getOrCreateUser(clerkId: string): Promise<User | null> {
  const existingUser = await db.user.findUnique({
    where: { clerkId },
  });

  if (existingUser) {
    // Backfill userCode if missing (for users created before this feature)
    if (!existingUser.userCode) {
      const userCode = await generateUniqueUserCode();
      return db.user.update({
        where: { id: existingUser.id },
        data: { userCode },
      });
    }
    return existingUser;
  }

  // Fallback: Fetch user details directly from Clerk
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
    if (!primaryEmail) {
      console.error(`[getOrCreateUser] No email found for Clerk user ${clerkId}`);
      return null;
    }

    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User";
    const userCode = await generateUniqueUserCode();

    // Attempt to create the user in the database (safeguarded against race conditions with webhook)
    const newUser = await db.user.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        name,
        email: primaryEmail,
        userCode,
      },
    });

    return newUser;
  } catch (error) {
    console.error("[getOrCreateUser] Error in fallback user creation:", error);
    return null;
  }
}
