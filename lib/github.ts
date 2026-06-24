import { createHmac, timingSafeEqual } from "crypto";

// ============================================
// Constants
// ============================================

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_REPO_URL_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;

// ============================================
// Types
// ============================================

interface RepoInfo {
  owner: string;
  repo: string;
}

interface WebhookRegistrationResult {
  hookId: string;
}

interface CommitFileDiff {
  filename: string;
  status: string;
  patch: string;
}

interface CommitDiffResult {
  sha: string;
  message: string;
  files: CommitFileDiff[];
}

// ============================================
// URL Parsing & Validation
// ============================================

/**
 * Parses a GitHub repo URL into owner and repo name.
 * Validates format: https://github.com/owner/repo
 * Returns null if the URL is invalid.
 */
export function parseGithubRepoUrl(url: string): RepoInfo | null {
  const trimmed = url.trim();
  const match = GITHUB_REPO_URL_REGEX.exec(trimmed);

  if (!match || !match[1] || !match[2]) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

// ============================================
// API Helpers
// ============================================

/**
 * Verifies that a GitHub repo exists and is accessible with the given PAT.
 * Returns true if accessible, false otherwise.
 */
export async function verifyRepoAccessible(
  owner: string,
  repo: string,
  pat: string
): Promise<boolean> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PaceUp-App",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Registers a webhook on a GitHub repo for push and pull_request events.
 * Returns the webhook ID on success.
 * Throws on failure with a descriptive error message.
 */
export async function registerWebhook(
  owner: string,
  repo: string,
  pat: string,
  webhookUrl: string,
  secret: string
): Promise<WebhookRegistrationResult> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "PaceUp-App",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push", "pull_request"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret,
          insecure_ssl: "0",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to register GitHub webhook (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as { id: number };
  return { hookId: String(data.id) };
}

/**
 * Deletes a webhook from a GitHub repo.
 * Fails silently if the webhook doesn't exist (already cleaned up).
 */
export async function deleteWebhook(
  owner: string,
  repo: string,
  pat: string,
  hookId: string
): Promise<void> {
  try {
    await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks/${hookId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "PaceUp-App",
        },
      }
    );
  } catch (error) {
    // WHY: Silent fail — webhook may already be deleted or repo removed
    console.error("[GitHub] Failed to delete webhook:", error);
  }
}

/**
 * Fetches the file diffs for a specific commit from GitHub.
 * Used by the code review agent to build review prompts.
 */
export async function fetchCommitDiff(
  owner: string,
  repo: string,
  sha: string,
  pat: string
): Promise<CommitDiffResult> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${sha}`,
    {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PaceUp-App",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch commit diff for ${sha} (${response.status})`
    );
  }

  const data = (await response.json()) as {
    sha: string;
    commit: { message: string };
    files?: Array<{ filename: string; status: string; patch?: string }>;
  };

  return {
    sha: data.sha,
    message: data.commit.message,
    files: (data.files ?? []).map((f) => ({
      filename: f.filename,
      status: f.status,
      patch: f.patch ?? "",
    })),
  };
}

// ============================================
// Webhook Signature Verification
// ============================================

/**
 * Verifies a GitHub webhook signature using HMAC-SHA256.
 * Compares the X-Hub-Signature-256 header against the computed hash.
 *
 * WHY timingSafeEqual: Prevents timing attacks that could leak
 * information about the secret by measuring comparison time.
 */
export function verifyGithubWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const signature = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Guard: Both must be the same length for timingSafeEqual
  if (signature.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}
