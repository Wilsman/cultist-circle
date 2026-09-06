"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import type { GameMode } from "@/lib/game-mode";
import {
  applyModeVote,
  applyUserVote,
  createRecipeFeedbackClientId,
  EMPTY_RECIPE_FEEDBACK_STATS,
  formatLastWorkedDetail,
  formatRecency,
  isRecipeFeedbackMap,
  isRecipeFeedbackStats,
  isRecipeRecentlyActive,
  isUserModeMap,
  isUserVoteMap,
  RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY,
  RECIPE_USER_MODES_STORAGE_KEY,
  RECIPE_USER_VOTES_STORAGE_KEY,
} from "@/lib/recipe-feedback";
import type {
  RecipeFeedbackMap,
  RecipeFeedbackVoteResult,
  UserModeMap,
  UserVote,
  UserVoteMap,
} from "@/types/recipe-feedback";

const FEEDBACK_API_BASE =
  process.env.NODE_ENV === "development"
    ? ""
    : "https://cultist-circle-feedback.cultistcircle.workers.dev";
const RECIPE_FEEDBACK_ENDPOINT = `${FEEDBACK_API_BASE}/api/recipe-feedback`;
const REFRESH_AFTER_MS = 60_000;
let inMemoryClientId: string | null = null;

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface RecipeFeedbackStoreState {
  stats: RecipeFeedbackMap;
  userVotes: UserVoteMap;
  userModes: UserModeMap;
  clientId: string | null;
  loadStatus: LoadStatus;
  lastLoadedAt: number | null;
  pendingRecipeIds: Record<string, boolean>;
  loadError: string | null;
  voteErrors: Record<string, string | undefined>;
  voteMessages: Record<string, string | undefined>;
  hydrateClientState: () => void;
  loadStats: (force?: boolean) => Promise<void>;
  castVote: (
    recipeId: string,
    vote: UserVote,
    gameMode: GameMode,
  ) => Promise<void>;
  resetForTesting: () => void;
}

function readStoredMap<T>(
  key: string,
  validate: (value: unknown) => value is T,
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredMap(key: string, value: object): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

function getOrCreateClientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(
      RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY,
    );
    if (existing) return existing;
    const clientId = createRecipeFeedbackClientId();
    window.localStorage.setItem(
      RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY,
      clientId,
    );
    return clientId;
  } catch {
    inMemoryClientId ??= createRecipeFeedbackClientId();
    return inMemoryClientId;
  }
}

function isVoteResult(value: unknown): value is RecipeFeedbackVoteResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.recipeId === "string" &&
    isRecipeFeedbackStats(result.stats) &&
    (result.userVote === null ||
      result.userVote === "worked" ||
      result.userVote === "didnt_work") &&
    (result.userMode === undefined ||
      result.userMode === null ||
      result.userMode === "pvp" ||
      result.userMode === "pve" ||
      result.userMode === "season")
  );
}

async function readResponsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseError(
  response: Response,
  payload: unknown,
  fallback: string,
): Error {
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after"));
    return new Error(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? `Too many reports. Try again in ${retryAfter}s.`
        : "Too many reports. Please try again shortly.",
    );
  }
  const message =
    payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: unknown }).error
      : null;
  return new Error(typeof message === "string" ? message : fallback);
}

export const useRecipeFeedbackStore = create<RecipeFeedbackStoreState>(
  (set, get) => ({
    stats: {},
    userVotes: {},
    userModes: {},
    clientId: null,
    loadStatus: "idle",
    lastLoadedAt: null,
    pendingRecipeIds: {},
    loadError: null,
    voteErrors: {},
    voteMessages: {},

    hydrateClientState: () => {
      if (get().clientId) return;
      set({
        clientId: getOrCreateClientId(),
        userVotes: readStoredMap(
          RECIPE_USER_VOTES_STORAGE_KEY,
          isUserVoteMap,
          {},
        ),
        userModes: readStoredMap(
          RECIPE_USER_MODES_STORAGE_KEY,
          isUserModeMap,
          {},
        ),
      });
    },

    loadStats: async (force = false) => {
      const state = get();
      if (state.loadStatus === "loading") return;
      if (
        state.loadStatus === "ready" &&
        (!force ||
          (state.lastLoadedAt !== null &&
            Date.now() - state.lastLoadedAt < REFRESH_AFTER_MS))
      )
        return;

      const isInitialLoad = Object.keys(state.stats).length === 0;
      set({
        loadStatus: isInitialLoad ? "loading" : state.loadStatus,
        loadError: null,
      });
      try {
        const response = await fetch(RECIPE_FEEDBACK_ENDPOINT, {
          headers: { Accept: "application/json" },
        });
        const payload = await readResponsePayload(response);
        const data =
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : null;
        if (!response.ok || !isRecipeFeedbackMap(data)) {
          throw responseError(
            response,
            payload,
            "Recipe reports could not be loaded",
          );
        }
        set({
          stats: data,
          loadStatus: "ready",
          lastLoadedAt: Date.now(),
          loadError: null,
        });
      } catch (error) {
        console.error("Failed to load recipe feedback:", error);
        set({
          loadStatus: isInitialLoad ? "error" : "ready",
          loadError: "Community reports are temporarily unavailable",
        });
      }
    },

    castVote: async (recipeId, vote, gameMode) => {
      const state = get();
      if (state.loadStatus !== "ready" || state.pendingRecipeIds[recipeId])
        return;
      const clientId = state.clientId ?? getOrCreateClientId();
      if (!clientId) return;

      const previousStats =
        state.stats[recipeId] ?? EMPTY_RECIPE_FEEDBACK_STATS;
      const previousVote = state.userVotes[recipeId];
      const previousMode = state.userModes[recipeId];
      const removing = previousVote === vote && previousMode === gameMode;
      const nextVote = removing ? null : vote;
      const nextMode = nextVote ? gameMode : null;
      const updatedStats = applyUserVote(previousStats, previousVote, nextVote);
      const statsWithModes = {
        ...updatedStats,
        lastWorkedMode:
          nextVote === "worked" && nextMode
            ? nextMode
            : previousStats.lastWorkedMode,
        modes: applyModeVote(
          previousStats.modes,
          previousVote && previousMode
            ? { vote: previousVote, mode: previousMode }
            : null,
          nextVote && nextMode ? { vote: nextVote, mode: nextMode } : null,
        ),
      };
      const optimisticVotes = { ...state.userVotes };
      const optimisticModes = { ...state.userModes };
      if (nextVote && nextMode) {
        optimisticVotes[recipeId] = nextVote;
        optimisticModes[recipeId] = nextMode;
      } else {
        delete optimisticVotes[recipeId];
        delete optimisticModes[recipeId];
      }

      set({
        clientId,
        stats: { ...state.stats, [recipeId]: statsWithModes },
        userVotes: optimisticVotes,
        userModes: optimisticModes,
        pendingRecipeIds: { ...state.pendingRecipeIds, [recipeId]: true },
        voteErrors: { ...state.voteErrors, [recipeId]: undefined },
        voteMessages: { ...state.voteMessages, [recipeId]: undefined },
      });
      saveStoredMap(RECIPE_USER_VOTES_STORAGE_KEY, optimisticVotes);
      saveStoredMap(RECIPE_USER_MODES_STORAGE_KEY, optimisticModes);

      try {
        const response = await fetch(RECIPE_FEEDBACK_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId,
            vote: nextVote,
            clientId,
            gameMode: nextMode,
          }),
        });
        const payload = await readResponsePayload(response);
        const data =
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : null;
        if (!response.ok || !isVoteResult(data)) {
          throw responseError(
            response,
            payload,
            "Recipe report could not be saved",
          );
        }

        const confirmedVotes = { ...get().userVotes };
        const confirmedModes = { ...get().userModes };
        const confirmedMode = data.userMode ?? nextMode;
        if (data.userVote && confirmedMode) {
          confirmedVotes[recipeId] = data.userVote;
          confirmedModes[recipeId] = confirmedMode;
        } else {
          delete confirmedVotes[recipeId];
          delete confirmedModes[recipeId];
        }
        set((current) => ({
          stats: { ...current.stats, [recipeId]: data.stats },
          userVotes: confirmedVotes,
          userModes: confirmedModes,
          pendingRecipeIds: { ...current.pendingRecipeIds, [recipeId]: false },
          voteErrors: { ...current.voteErrors, [recipeId]: undefined },
          voteMessages: {
            ...current.voteMessages,
            [recipeId]: data.userVote ? "Report saved." : "Report removed.",
          },
        }));
        saveStoredMap(RECIPE_USER_VOTES_STORAGE_KEY, confirmedVotes);
        saveStoredMap(RECIPE_USER_MODES_STORAGE_KEY, confirmedModes);
      } catch (error) {
        console.error("Failed to save recipe feedback:", error);
        const restoredVotes = { ...get().userVotes };
        const restoredModes = { ...get().userModes };
        if (previousVote) restoredVotes[recipeId] = previousVote;
        else delete restoredVotes[recipeId];
        if (previousMode) restoredModes[recipeId] = previousMode;
        else delete restoredModes[recipeId];
        set((current) => ({
          stats: { ...current.stats, [recipeId]: previousStats },
          userVotes: restoredVotes,
          userModes: restoredModes,
          pendingRecipeIds: { ...current.pendingRecipeIds, [recipeId]: false },
          voteErrors: {
            ...current.voteErrors,
            [recipeId]:
              error instanceof Error
                ? error.message
                : "Your report was not saved. Please try again.",
          },
        }));
        saveStoredMap(RECIPE_USER_VOTES_STORAGE_KEY, restoredVotes);
        saveStoredMap(RECIPE_USER_MODES_STORAGE_KEY, restoredModes);
      }
    },

    resetForTesting: () => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(RECIPE_USER_VOTES_STORAGE_KEY);
        window.localStorage.removeItem(RECIPE_USER_MODES_STORAGE_KEY);
        window.localStorage.removeItem(RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY);
      }
      set({
        stats: {},
        userVotes: {},
        userModes: {},
        clientId: null,
        loadStatus: "idle",
        lastLoadedAt: null,
        pendingRecipeIds: {},
        loadError: null,
        voteErrors: {},
        voteMessages: {},
      });
      inMemoryClientId = null;
    },
  }),
);

export function useRecipeFeedbackLifecycle() {
  const hydrate = useRecipeFeedbackStore((state) => state.hydrateClientState);
  const loadStats = useRecipeFeedbackStore((state) => state.loadStats);

  useEffect(() => {
    hydrate();
    void loadStats();
    const refresh = () => void loadStats(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hydrate, loadStats]);
}

let clockNow = Date.now();
let clockInterval: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeToClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockInterval) {
    clockInterval = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((notify) => notify());
    }, 60_000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  };
}

function getClockSnapshot() {
  return clockNow;
}

export function useRecipeFeedback(recipeId: string) {
  const stats = useRecipeFeedbackStore(
    (state) => state.stats[recipeId] ?? EMPTY_RECIPE_FEEDBACK_STATS,
  );
  const userVote = useRecipeFeedbackStore((state) => state.userVotes[recipeId]);
  const userMode = useRecipeFeedbackStore((state) => state.userModes[recipeId]);
  const loadStatus = useRecipeFeedbackStore((state) => state.loadStatus);
  const loadError = useRecipeFeedbackStore((state) => state.loadError);
  const voteError = useRecipeFeedbackStore(
    (state) => state.voteErrors[recipeId] ?? null,
  );
  const message = useRecipeFeedbackStore(
    (state) => state.voteMessages[recipeId] ?? null,
  );
  const isPending = useRecipeFeedbackStore(
    (state) => !!state.pendingRecipeIds[recipeId],
  );
  const loadStats = useRecipeFeedbackStore((state) => state.loadStats);
  const castVote = useRecipeFeedbackStore((state) => state.castVote);
  const now = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getClockSnapshot,
  );

  return {
    stats,
    userVote,
    userMode,
    castVote: (vote: UserVote, gameMode: GameMode) =>
      castVote(recipeId, vote, gameMode),
    formattedRecency: useMemo(
      () => formatRecency(stats.lastWorkedAt, now),
      [now, stats.lastWorkedAt],
    ),
    formattedModeRecency: useMemo(
      () =>
        formatLastWorkedDetail(
          stats.lastWorkedMode ?? null,
          stats.lastWorkedAt,
          now,
        ),
      [now, stats.lastWorkedAt, stats.lastWorkedMode],
    ),
    isRecentlyActive: useMemo(
      () => isRecipeRecentlyActive(stats.lastWorkedAt, 72, now),
      [now, stats.lastWorkedAt],
    ),
    isLoading: loadStatus === "idle" || loadStatus === "loading",
    canVote: loadStatus === "ready",
    retry: () => loadStats(true),
    isPending,
    loadError,
    voteError,
    message,
  };
}
