import crypto from "crypto";

/**
 * AES-256-GCM encryption for storing user API keys at rest.
 *
 * Format: base64(iv):base64(authTag):base64(encrypted)
 *
 * The encryption key is derived from AI_KEY_SECRET env var,
 * which must be exactly 32 characters (256 bits).
 *
 * WHY AES-256-GCM: Provides both confidentiality and integrity.
 * The auth tag ensures tampered ciphertexts are rejected on decryption.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for GCM

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_KEY_SECRET;

  if (!secret) {
    throw new Error(
      "AI_KEY_SECRET environment variable is not set. Cannot encrypt/decrypt API keys."
    );
  }

  if (secret.length !== 32) {
    throw new Error(
      `AI_KEY_SECRET must be exactly 32 characters. Got ${secret.length}.`
    );
  }

  return Buffer.from(secret, "utf-8");
}

/**
 * Encrypts a plaintext API key using AES-256-GCM.
 * @param plaintext - The raw API key to encrypt
 * @returns Encrypted string in format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encryptKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts an encrypted API key using AES-256-GCM.
 * @param ciphertext - Encrypted string in format: base64(iv):base64(authTag):base64(ciphertext)
 * @returns The decrypted plaintext API key
 */
export function decryptKey(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format. Expected iv:authTag:data.");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encrypted = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}
