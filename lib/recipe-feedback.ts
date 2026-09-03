import type {
  RecipeFeedbackStats,
  UserVote,
  UserVoteMap,
} from "@/types/recipe-feedback";

export const RECIPE_USER_VOTES_STORAGE_KEY =
  "cultist-circle:recipe-user-votes:v1";
export const RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY =
  "cultist-circle:recipe-feedback-client-id:v1";

export const EMPTY_RECIPE_FEEDBACK_STATS: RecipeFeedbackStats = {
  workedCount: 0,
  didntWorkCount: 0,
  lastWorkedAt: null,
};

export function isRecipeFeedbackStats(
  value: unknown,
): value is RecipeFeedbackStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const stats = value as Record<string, unknown>;
  return (
    Number.isInteger(stats.workedCount) &&
    Number(stats.workedCount) >= 0 &&
    Number.isInteger(stats.didntWorkCount) &&
    Number(stats.didntWorkCount) >= 0 &&
    (stats.lastWorkedAt === null || typeof stats.lastWorkedAt === "string")
  );
}

export function isRecipeFeedbackMap(
  value: unknown,
): value is Record<string, RecipeFeedbackStats> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(isRecipeFeedbackStats)
  );
}

export function createRecipeFeedbackClientId(): string {
  return crypto.randomUUID();
}

/**
 * Validate that an unknown value parsed from storage is a valid UserVoteMap
 */
export function isUserVoteMap(value: unknown): value is UserVoteMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  for (const [key, vote] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== "string") return false;
    if (vote !== "worked" && vote !== "didnt_work") return false;
  }
  return true;
}

/**
 * Calculate human-readable relative time for when a recipe last worked
 */
export function formatRecency(
  isoDateString: string | null,
  now: number = Date.now(),
): string {
  if (!isoDateString) {
    return "No reports yet";
  }

  const timestamp = new Date(isoDateString).getTime();
  if (isNaN(timestamp)) {
    return "No reports yet";
  }

  const diffMs = Math.max(0, now - timestamp);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "Worked just now";
  }
  if (diffMins < 60) {
    return `Worked ${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `Worked ${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "Worked yesterday";
  }
  if (diffDays < 30) {
    return `Worked ${diffDays}d ago`;
  }

  return `Worked ${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Determines if a recipe was confirmed working recently (default: within 72 hours)
 */
export function isRecipeRecentlyActive(
  isoDateString: string | null,
  maxAgeHours: number = 72,
  now: number = Date.now(),
): boolean {
  if (!isoDateString) {
    return false;
  }

  const timestamp = new Date(isoDateString).getTime();
  if (isNaN(timestamp)) {
    return false;
  }

  const diffHours = (now - timestamp) / (1000 * 3600);
  return diffHours >= 0 && diffHours <= maxAgeHours;
}

/**
 * Pure state reducer to apply a user vote or toggle an existing vote
 */
export function applyUserVote(
  currentStats: RecipeFeedbackStats,
  currentVote: UserVote | undefined,
  targetVote: UserVote,
  nowIso: string = new Date().toISOString(),
): { updatedStats: RecipeFeedbackStats; nextVote: UserVote | null } {
  let workedCount = currentStats.workedCount;
  let didntWorkCount = currentStats.didntWorkCount;
  let lastWorkedAt = currentStats.lastWorkedAt;

  // Case 1: Clicking the same vote toggles/cancels it
  if (currentVote === targetVote) {
    if (targetVote === "worked") {
      workedCount = Math.max(0, workedCount - 1);
    } else {
      didntWorkCount = Math.max(0, didntWorkCount - 1);
    }
    return {
      updatedStats: { workedCount, didntWorkCount, lastWorkedAt },
      nextVote: null,
    };
  }

  // Case 2: Switching vote from the opposite
  if (currentVote !== undefined) {
    if (currentVote === "worked") {
      workedCount = Math.max(0, workedCount - 1);
    } else {
      didntWorkCount = Math.max(0, didntWorkCount - 1);
    }
  }

  // Apply new vote
  if (targetVote === "worked") {
    workedCount += 1;
    lastWorkedAt = nowIso;
  } else {
    didntWorkCount += 1;
  }

  return {
    updatedStats: { workedCount, didntWorkCount, lastWorkedAt },
    nextVote: targetVote,
  };
}
