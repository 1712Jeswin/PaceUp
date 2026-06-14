import { db } from "@/lib/db";

const CODE_LENGTH = 8;
// Excludes ambiguous characters: 0, O, 1, l, I
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

const MAX_RETRIES = 5;

/**
 * Generates a random alphanumeric code of CODE_LENGTH characters,
 * avoiding ambiguous characters (0, O, 1, l, I).
 */
function generateRandomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/**
 * Generates a unique invite code for a group.
 * Retries up to MAX_RETRIES times if a collision occurs.
 *
 * @throws Error if a unique code cannot be generated after MAX_RETRIES attempts
 */
export async function generateUniqueGroupCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateRandomCode();

    const existing = await db.group.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Failed to generate a unique group invite code after maximum retries");
}

/**
 * Generates a unique user code.
 * Retries up to MAX_RETRIES times if a collision occurs.
 *
 * @throws Error if a unique code cannot be generated after MAX_RETRIES attempts
 */
export async function generateUniqueUserCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateRandomCode();

    const existing = await db.user.findFirst({
      where: { userCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Failed to generate a unique user code after maximum retries");
}
