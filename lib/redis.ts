import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client stub.
 * Phase 1: Client is initialised but no queues or jobs are implemented.
 * Phase 2: Used for nag loop scheduling and rate limiting.
 *
 * WHY nullable: Redis is optional in Phase 1. The app should not crash
 * if UPSTASH_REDIS_REST_URL is not set (e.g. in local dev without Redis).
 */

let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  console.warn(
    "[PaceUp] Upstash Redis credentials not set. Redis client is disabled. " +
    "This is expected in Phase 1 — Redis is not required until Phase 2."
  );
}

export { redis };
