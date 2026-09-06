import { GAME_MODE_LABELS, GAME_MODES, isGameMode } from "@/lib/game-mode";
import type { GameMode } from "@/lib/game-mode";
import type {
  RecipeFeedbackModeBreakdown,
  RecipeFeedbackModeCounts,
  RecipeFeedbackStats,
  UserModeMap,
  UserVote,
  UserVoteMap,
} from "@/types/recipe-feedback";

export const RECIPE_USER_VOTES_STORAGE_KEY =
  "cultist-circle:recipe-user-votes:v1";
export const RECIPE_USER_MODES_STORAGE_KEY =
  "cultist-circle:recipe-user-modes:v1";
export const RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY =
  "cultist-circle:recipe-feedback-client-id:v1";

export const EMPTY_RECIPE_FEEDBACK_MODES: RecipeFeedbackModeBreakdown = {
  pvp: { worked: 0, didntWork: 0 },
  pve: { worked: 0, didntWork: 0 },
  season: { worked: 0, didntWork: 0 },
};

export const EMPTY_RECIPE_FEEDBACK_STATS: RecipeFeedbackStats = {
  workedCount: 0,
  didntWorkCount: 0,
  lastWorkedAt: null,
  lastWorkedMode: null,
  modes: { ...EMPTY_RECIPE_FEEDBACK_MODES },
};

export function isRecipeFeedbackModeCounts(
  value: unknown,
): value is RecipeFeedbackModeCounts {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const counts = value as Record<string, unknown>;
  return (
    Number.isInteger(counts.worked) &&
    Number(counts.worked) >= 0 &&
    Number.isInteger(counts.didntWork) &&
    Number(counts.didntWork) >= 0
  );
}

export function isRecipeFeedbackModeBreakdown(
  value: unknown,
): value is RecipeFeedbackModeBreakdown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const breakdown = value as Record<string, unknown>;
  return GAME_MODES.every((mode) =>
    isRecipeFeedbackModeCounts(breakdown[mode]),
  );
}

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
    (stats.lastWorkedAt === null || typeof stats.lastWorkedAt === "string") &&
    (stats.lastWorkedMode === undefined ||
      stats.lastWorkedMode === null ||
      (typeof stats.lastWorkedMode === "string" &&
        isGameMode(stats.lastWorkedMode))) &&
    (stats.modes === undefined || isRecipeFeedbackModeBreakdown(stats.modes))
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
 * Validate that an unknown value parsed from storage is a valid UserModeMap
 */
export function isUserModeMap(value: unknown): value is UserModeMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  for (const [key, mode] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== "string") return false;
    if (!isGameMode(mode as string | null)) return false;
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
    return "Confirmed just now";
  }
  if (diffMins < 60) {
    return `Confirmed ${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `Confirmed ${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "Confirmed yesterday";
  }
  if (diffDays < 30) {
    return `Confirmed ${diffDays}d ago`;
  }

  return `Confirmed ${Math.floor(diffDays / 30)}mo ago`;
}

export function formatLastWorkedDetail(
  mode: GameMode | null,
  isoDateString: string | null,
  now: number = Date.now(),
): string | null {
  if (!mode || !isoDateString) return null;

  const recency = formatRecency(isoDateString, now);
  if (recency === "No reports yet") return null;

  const relativeTime =
    recency === "Confirmed just now"
      ? "just now"
      : recency.replace(/^Confirmed /, "");
  return `Last worked on ${GAME_MODE_LABELS[mode]} · ${relativeTime}`;
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
 * Pure state reducer that moves an aggregate from the previous vote to the
 * desired next vote. Passing null removes the vote. Keeping the same vote is
 * useful when a user moves that report to another game mode.
 */
export function applyUserVote(
  currentStats: RecipeFeedbackStats,
  currentVote: UserVote | undefined,
  nextVote: UserVote | null,
  nowIso: string = new Date().toISOString(),
): RecipeFeedbackStats {
  let workedCount = currentStats.workedCount;
  let didntWorkCount = currentStats.didntWorkCount;
  let lastWorkedAt = currentStats.lastWorkedAt;

  if (currentVote !== undefined && currentVote !== nextVote) {
    if (currentVote === "worked") {
      workedCount = Math.max(0, workedCount - 1);
    } else {
      didntWorkCount = Math.max(0, didntWorkCount - 1);
    }
  }

  if (nextVote === "worked") {
    if (currentVote !== "worked") workedCount += 1;
    lastWorkedAt = nowIso;
  } else if (nextVote === "didnt_work" && currentVote !== "didnt_work") {
    didntWorkCount += 1;
  }

  return { ...currentStats, workedCount, didntWorkCount, lastWorkedAt };
}

export function getUnspecifiedModeCounts(
  stats: RecipeFeedbackStats,
): RecipeFeedbackModeCounts {
  const modes = stats.modes ?? EMPTY_RECIPE_FEEDBACK_MODES;
  const specifiedWorked = GAME_MODES.reduce(
    (sum, mode) => sum + modes[mode].worked,
    0,
  );
  const specifiedDidntWork = GAME_MODES.reduce(
    (sum, mode) => sum + modes[mode].didntWork,
    0,
  );
  return {
    worked: Math.max(0, stats.workedCount - specifiedWorked),
    didntWork: Math.max(0, stats.didntWorkCount - specifiedDidntWork),
  };
}

export interface ModeVote {
  vote: UserVote;
  mode: GameMode;
}

/**
 * Pure reducer for the per-mode breakdown. Moves one count out of the
 * previous vote/mode bucket and into the next one; either side may be absent
 * (legacy votes without a recorded mode, or aggregate-only updates).
 */
export function applyModeVote(
  currentModes: RecipeFeedbackModeBreakdown | undefined,
  previous: ModeVote | null | undefined,
  next: ModeVote | null,
): RecipeFeedbackModeBreakdown {
  const base = currentModes ?? EMPTY_RECIPE_FEEDBACK_MODES;
  const updated: RecipeFeedbackModeBreakdown = {
    pvp: { ...base.pvp },
    pve: { ...base.pve },
    season: { ...base.season },
  };

  if (previous) {
    const bucket = updated[previous.mode];
    if (previous.vote === "worked") {
      bucket.worked = Math.max(0, bucket.worked - 1);
    } else {
      bucket.didntWork = Math.max(0, bucket.didntWork - 1);
    }
  }

  if (next) {
    const bucket = updated[next.mode];
    if (next.vote === "worked") {
      bucket.worked += 1;
    } else {
      bucket.didntWork += 1;
    }
  }

  return updated;
}
