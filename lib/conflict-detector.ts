import { db } from "@/lib/db";

/**
 * Shape of a commit used for conflict detection.
 * Extracted from the full Commit model to keep the interface narrow.
 */
interface CommitForConflict {
  authorGithubUsername: string;
  filesChanged: string[];
  timestamp: Date;
}

/**
 * Detects file conflicts within a group for a given day.
 *
 * A conflict occurs when two or more different members push commits
 * that modify the same file within the same calendar day (UTC).
 *
 * For each detected conflict, creates a ConflictAlert record if one
 * doesn't already exist for that file on that day.
 *
 * @param groupId - The group to check for conflicts
 * @param newCommits - The newly ingested commits to check against existing ones
 */
export async function detectFileConflicts(
  groupId: string,
  newCommits: CommitForConflict[]
): Promise<void> {
  if (newCommits.length === 0) return;

  // Determine the date range to query — use the timestamps of new commits
  const dates = newCommits.map((c) => c.timestamp);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Start and end of the day range (UTC)
  const dayStart = new Date(
    Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate())
  );
  const dayEnd = new Date(
    Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate() + 1)
  );

  // Fetch all commits in this group within the date range
  const existingCommits = await db.commit.findMany({
    where: {
      groupId,
      timestamp: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    select: {
      authorGithubUsername: true,
      filesChanged: true,
      timestamp: true,
    },
  });

  // Build a map: filename → Set<authorGithubUsername> for each day
  const fileAuthorMap = new Map<string, Set<string>>();

  for (const commit of existingCommits) {
    const files = commit.filesChanged as string[];
    const dayKey = commit.timestamp.toISOString().slice(0, 10); // YYYY-MM-DD

    for (const file of files) {
      const key = `${dayKey}:${file}`;
      if (!fileAuthorMap.has(key)) {
        fileAuthorMap.set(key, new Set());
      }
      fileAuthorMap.get(key)!.add(commit.authorGithubUsername);
    }
  }

  // Find files touched by more than one author on the same day
  const conflicts: Array<{ filename: string; authors: string[] }> = [];

  for (const [key, authors] of Array.from(fileAuthorMap.entries())) {
    if (authors.size >= 2) {
      const filename = key.split(":").slice(1).join(":");
      conflicts.push({ filename, authors: Array.from(authors) });
    }
  }

  if (conflicts.length === 0) return;

  // Resolve GitHub usernames to user IDs for the memberIds field
  const members = await db.groupMember.findMany({
    where: { groupId, isActive: true },
    select: {
      userId: true,
      user: {
        select: {
          profileData: true,
        },
      },
    },
  });

  // Build a map: GitHub username → userId (best effort via profileData.githubUrl)
  const usernameToUserId = new Map<string, string>();
  for (const member of members) {
    const profileData = member.user.profileData as Record<string, unknown> | null;
    if (profileData?.githubUrl) {
      const ghUrl = String(profileData.githubUrl);
      const ghUsername = ghUrl.replace(/\/$/, "").split("/").pop();
      if (ghUsername) {
        usernameToUserId.set(ghUsername.toLowerCase(), member.userId);
      }
    }
  }

  // Create ConflictAlert records for each conflict
  for (const conflict of conflicts) {
    const memberIds = conflict.authors
      .map((author) => usernameToUserId.get(author.toLowerCase()))
      .filter((id): id is string => id !== undefined);

    // Skip if we can't resolve any usernames to member IDs
    // Still create with empty array — the usernames are in the commit records
    const existingAlert = await db.conflictAlert.findFirst({
      where: {
        groupId,
        filename: conflict.filename,
        resolvedAt: null,
      },
      select: { id: true },
    });

    if (existingAlert) {
      // WHY: Don't create duplicate alerts for the same unresolved file conflict
      continue;
    }

    await db.conflictAlert.create({
      data: {
        groupId,
        filename: conflict.filename,
        memberIds: memberIds.length > 0 ? memberIds : conflict.authors,
      },
    });
  }
}
