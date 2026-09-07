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
  lastDidntWorkAt: null,
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
    Number(counts.didntWork) >= 0 &&
    (counts.lastWorkedAt === undefined ||
      counts.lastWorkedAt === null ||
      typeof counts.lastWorkedAt === "string") &&
    (counts.lastDidntWorkAt === undefined ||
      counts.lastDidntWorkAt === null ||
      typeof counts.lastDidntWorkAt === "string")
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
    (stats.lastDidntWorkAt === undefined ||
      stats.lastDidntWorkAt === null ||
      typeof stats.lastDidntWorkAt === "string") &&
    (stats.lastWorkedMode === undefined ||
      stats.lastWorkedMode === null ||
      (typeof stats.lastWorkedMode === "string" &&
        isGameMode(stats.lastWorkedMode))) &&
    (stats.lastDidntWorkMode === undefined ||
      stats.lastDidntWorkMode === null ||
      (typeof stats.lastDidntWorkMode === "string" &&
        isGameMode(stats.lastDidntWorkMode))) &&
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
 * Shared relative-time formatter. Returns null when there is no timestamp so
 * callers can distinguish "no reports" from a real recency.
 */
function formatRelativeTime(
  prefix: string,
  isoDateString: string | null,
  now: number,
): string | null {
  if (!isoDateString) return null;

  const timestamp = new Date(isoDateString).getTime();
  if (isNaN(timestamp)) return null;

  const diffMs = Math.max(0, now - timestamp);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return `${prefix} just now`;
  }
  if (diffMins < 60) {
    return `${prefix} ${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${prefix} ${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return `${prefix} yesterday`;
  }
  if (diffDays < 30) {
    return `${prefix} ${diffDays}d ago`;
  }

  return `${prefix} ${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Calculate human-readable relative time for when a recipe last worked
 */
export function formatRecency(
  isoDateString: string | null,
  now: number = Date.now(),
): string {
  return formatRelativeTime("Confirmed", isoDateString, now) ?? "No reports yet";
}

/**
 * Calculate human-readable relative time for when a recipe was last reported
 * as not working. Returns null when there is no such report.
 */
export function formatDidntWorkRecency(
  isoDateString: string | null,
  now: number = Date.now(),
): string | null {
  return formatRelativeTime("Didn't work", isoDateString, now);
}

export function formatLastWorkedDetail(
  mode: GameMode | null,
  isoDateString: string | null,
  now: number = Date.now(),
): string | null {
  if (!mode || !isoDateString) return null;

  const recency = formatRecency(isoDateString, now);
  if (!recency.startsWith("Confirmed")) return null;

  const relativeTime =
    recency === "Confirmed just now"
      ? "just now"
      : recency.replace(/^Confirmed /, "");
  return `Last worked on ${GAME_MODE_LABELS[mode]} · ${relativeTime}`;
}

/**
 * Status line for the aggregate report counts. When both kinds of reports
 * exist, the most recent signal wins so a fresh "didn't work" isn't hidden
 * behind an older confirmation (and vice versa).
 */
export function formatReportStatus(
  stats: Pick<
    RecipeFeedbackStats,
    "workedCount" | "didntWorkCount" | "lastWorkedAt" | "lastDidntWorkAt"
  >,
  now: number = Date.now(),
): string {
  const worked = formatRelativeTime(
    "Confirmed",
    stats.lastWorkedAt ?? null,
    now,
  );
  const didntWork = formatRelativeTime(
    "Didn't work",
    stats.lastDidntWorkAt ?? null,
    now,
  );
  if (worked && didntWork) {
    const workedTime = new Date(stats.lastWorkedAt as string).getTime();
    const didntTime = new Date(stats.lastDidntWorkAt as string).getTime();
    return didntTime > workedTime ? didntWork : worked;
  }
  if (worked) return worked;
  if (didntWork) return didntWork;
  if (stats.workedCount > 0) return "Confirmed";
  if (stats.didntWorkCount > 0) return "Not confirmed yet";
  return "No reports yet";
}

/**
 * Compact relative time without a prefix, for per-mode rows.
 * Returns null when there is no timestamp.
 */
export function formatCompactRecency(
  isoDateString: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!isoDateString) return null;
  const timestamp = new Date(isoDateString).getTime();
  if (isNaN(timestamp)) return null;
  const diffMs = Math.max(0, now - timestamp);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export interface ModeLatestSignal {
  vote: UserVote | null;
  at: string | null;
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return isNaN(time) ? null : time;
}

/**
 * Most recent signal for a single mode bucket. Returns null vote when the
 * bucket has no timestamps (legacy counts-only data).
 */
export function getModeLatestSignal(
  counts: RecipeFeedbackModeCounts | undefined,
): ModeLatestSignal {
  if (!counts) return { vote: null, at: null };
  const workedTime = parseTime(counts.lastWorkedAt ?? null);
  const didntTime = parseTime(counts.lastDidntWorkAt ?? null);
  if (workedTime === null && didntTime === null)
    return { vote: null, at: null };
  if (workedTime !== null && (didntTime === null || workedTime >= didntTime))
    return { vote: "worked", at: counts.lastWorkedAt ?? null };
  return { vote: "didnt_work", at: counts.lastDidntWorkAt ?? null };
}

export interface LatestReport {
  vote: UserVote;
  mode: GameMode | null;
  at: string;
}

/**
 * Overall latest report across all modes. Prefers per-mode timestamps when
 * present so the badge can point at the exact mode; falls back to the
 * aggregate lastWorkedAt / lastDidntWorkAt with their stored modes.
 */
export function getLatestReport(
  stats: RecipeFeedbackStats,
): LatestReport | null {
  const modes = stats.modes;
  let latest: LatestReport | null = null;
  if (modes) {
    for (const mode of GAME_MODES) {
      const bucket = modes[mode];
      if (!bucket) continue;
      for (const [vote, at] of [
        ["worked", bucket.lastWorkedAt],
        ["didnt_work", bucket.lastDidntWorkAt],
      ] as const) {
        const time = parseTime(at ?? null);
        if (time === null || !at) continue;
        if (!latest || time > parseTime(latest.at)!) {
          latest = { vote: vote as UserVote, mode, at };
        }
      }
    }
  }
  if (latest) return latest;
  const workedTime = parseTime(stats.lastWorkedAt);
  const didntTime = parseTime(stats.lastDidntWorkAt ?? null);
  if (workedTime === null && didntTime === null) return null;
  if (workedTime !== null && (didntTime === null || workedTime >= didntTime)) {
    return {
      vote: "worked",
      mode: stats.lastWorkedMode ?? null,
      at: stats.lastWorkedAt as string,
    };
  }
  return {
    vote: "didnt_work",
    mode: stats.lastDidntWorkMode ?? null,
    at: stats.lastDidntWorkAt as string,
  };
}

/**
 * Human-readable latest line for the popover footer, e.g.
 * "Latest: Worked on PVE · 47m ago".
 */
export function formatLatestReport(
  stats: RecipeFeedbackStats,
  now: number = Date.now(),
): string | null {
  const latest = getLatestReport(stats);
  if (!latest) return null;
  const relative = formatCompactRecency(latest.at, now);
  if (!relative) return null;
  const action = latest.vote === "worked" ? "Worked" : "Didn't work";
  const modeLabel = latest.mode ? ` on ${GAME_MODE_LABELS[latest.mode]}` : "";
  return `Latest: ${action}${modeLabel} · ${relative}`;
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
  let lastDidntWorkAt = currentStats.lastDidntWorkAt ?? null;

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
    lastDidntWorkAt = nowIso;
  }

  return {
    ...currentStats,
    workedCount,
    didntWorkCount,
    lastWorkedAt,
    lastDidntWorkAt,
  };
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
