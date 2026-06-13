import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { db } from "@/lib/db";
import { decryptKey } from "@/lib/crypto";
import type { AIProvider } from "@prisma/client";

/**
 * Model options available per provider.
 * Used to populate the model dropdown in the AI Key Settings panel.
 */
export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  CLAUDE: ["claude-sonnet-4-6", "claude-haiku-4-5"],
  OPENAI: ["gpt-4o", "gpt-4o-mini"],
  GEMINI: ["gemini-1.5-pro", "gemini-1.5-flash"],
  GROK: ["grok-2"],
};

/**
 * Human-readable provider labels for the UI.
 */
export const PROVIDER_LABELS: Record<AIProvider, string> = {
  CLAUDE: "Claude (Anthropic)",
  OPENAI: "OpenAI",
  GEMINI: "Gemini (Google)",
  GROK: "Grok (xAI)",
};

/**
 * Provider factory functions.
 * WHY: Each AI SDK provider needs its own factory. Vercel AI SDK requires
 * provider-specific initialisers — we can't use a single constructor.
 *
 * WHY Record: Avoids unused-import lint errors from importing all four
 * factory functions at the top level but only using one per call.
 */
const PROVIDER_FACTORIES = {
  CLAUDE: (apiKey: string, model: string) => createAnthropic({ apiKey })(model),
  OPENAI: (apiKey: string, model: string) => createOpenAI({ apiKey })(model),
  GEMINI: (apiKey: string, model: string) => createGoogleGenerativeAI({ apiKey })(model),
  GROK: (apiKey: string, model: string) => createXai({ apiKey })(model),
} as const;

/**
 * Creates a LanguageModel instance from a provider and decrypted API key.
 */
function createModelForProvider(
  provider: AIProvider,
  apiKey: string,
  modelName: string
) {
  const factory = PROVIDER_FACTORIES[provider];
  if (!factory) {
    throw new Error(`Unsupported AI provider: ${provider as string}`);
  }
  return factory(apiKey, modelName);
}

/**
 * Fetches the user's active AI key and returns a ready-to-use LanguageModel.
 *
 * @param userId - The internal database user ID (NOT clerkId)
 * @returns A configured LanguageModel instance for the active provider
 * @throws If no active key is found or decryption fails
 */
export async function getAIModel(userId: string) {
  const activeKey = await db.aIKey.findFirst({
    where: {
      userId,
      isActive: true,
    },
    select: {
      provider: true,
      encryptedKey: true,
      modelName: true,
    },
  });

  if (!activeKey) {
    throw new Error(
      "No active AI key found. Please add an API key in Settings → AI Keys."
    );
  }

  const decryptedApiKey = decryptKey(activeKey.encryptedKey);

  return createModelForProvider(
    activeKey.provider,
    decryptedApiKey,
    activeKey.modelName
  );
}
