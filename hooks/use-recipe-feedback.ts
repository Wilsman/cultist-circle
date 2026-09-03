"use client";

import { useEffect, useMemo } from "react";
import { create } from "zustand";
import {
  applyUserVote,
  createRecipeFeedbackClientId,
  EMPTY_RECIPE_FEEDBACK_STATS,
  formatRecency,
  isRecipeFeedbackMap,
  isRecipeFeedbackStats,
  isRecipeRecentlyActive,
  isUserVoteMap,
  RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY,
  RECIPE_USER_VOTES_STORAGE_KEY,
} from "@/lib/recipe-feedback";
import type {
  RecipeFeedbackMap,
  RecipeFeedbackVoteResult,
  UserVote,
  UserVoteMap,
} from "@/types/recipe-feedback";

const FEEDBACK_API_BASE =
  process.env.NODE_ENV === "development"
    ? ""
    : "https://cultist-circle-feedback.cultistcircle.workers.dev";
const RECIPE_FEEDBACK_ENDPOINT = `${FEEDBACK_API_BASE}/api/recipe-feedback`;
let inMemoryClientId: string | null = null;

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface RecipeFeedbackStoreState {
  stats: RecipeFeedbackMap;
  userVotes: UserVoteMap;
  clientId: string | null;
  loadStatus: LoadStatus;
  pendingRecipeIds: Record<string, boolean>;
  loadError: string | null;
  voteErrors: Record<string, string | undefined>;
  hydrateClientState: () => void;
  loadStats: () => Promise<void>;
  castVote: (recipeId: string, vote: UserVote) => Promise<void>;
  resetForTesting: () => void;
}

function loadStoredVotes(): UserVoteMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RECIPE_USER_VOTES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isUserVoteMap(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredVotes(votes: UserVoteMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECIPE_USER_VOTES_STORAGE_KEY,
      JSON.stringify(votes),
    );
  } catch (error) {
    console.error("Failed to save recipe votes to localStorage:", error);
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
      result.userVote === "didnt_work")
  );
}

export const useRecipeFeedbackStore = create<RecipeFeedbackStoreState>(
  (set, get) => ({
    stats: {},
    userVotes: {},
    clientId: null,
    loadStatus: "idle",
    pendingRecipeIds: {},
    loadError: null,
    voteErrors: {},

    hydrateClientState: () => {
      if (get().clientId) return;
      set({ clientId: getOrCreateClientId(), userVotes: loadStoredVotes() });
    },

    loadStats: async () => {
      if (["loading", "ready"].includes(get().loadStatus)) return;
      set({ loadStatus: "loading", loadError: null });

      try {
        const response = await fetch(RECIPE_FEEDBACK_ENDPOINT, {
          headers: { Accept: "application/json" },
        });
        const payload: unknown = await response.json();
        const data =
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : null;

        if (!response.ok || !isRecipeFeedbackMap(data)) {
          throw new Error("Recipe reports could not be loaded");
        }

        set({ stats: data, loadStatus: "ready", loadError: null });
      } catch (error) {
        console.error("Failed to load recipe feedback:", error);
        set({
          loadStatus: "error",
          loadError: "Community reports are temporarily unavailable",
        });
      }
    },

    castVote: async (recipeId, vote) => {
      const state = get();
      if (state.loadStatus !== "ready" || state.pendingRecipeIds[recipeId]) {
        return;
      }

      const clientId = state.clientId ?? getOrCreateClientId();
      if (!clientId) return;

      const previousStats =
        state.stats[recipeId] ?? EMPTY_RECIPE_FEEDBACK_STATS;
      const previousVote = state.userVotes[recipeId];
      const { updatedStats, nextVote } = applyUserVote(
        previousStats,
        previousVote,
        vote,
      );
      const optimisticVotes = { ...state.userVotes };
      if (nextVote) optimisticVotes[recipeId] = nextVote;
      else delete optimisticVotes[recipeId];

      set({
        clientId,
        stats: { ...state.stats, [recipeId]: updatedStats },
        userVotes: optimisticVotes,
        pendingRecipeIds: { ...state.pendingRecipeIds, [recipeId]: true },
        voteErrors: { ...state.voteErrors, [recipeId]: undefined },
      });
      saveStoredVotes(optimisticVotes);

      try {
        const response = await fetch(RECIPE_FEEDBACK_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId, vote: nextVote, clientId }),
        });
        const payload: unknown = await response.json();
        const data =
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : null;

        if (!response.ok || !isVoteResult(data)) {
          throw new Error("Recipe vote could not be saved");
        }

        const confirmedVotes = { ...get().userVotes };
        if (data.userVote) confirmedVotes[recipeId] = data.userVote;
        else delete confirmedVotes[recipeId];

        set((current) => ({
          stats: { ...current.stats, [recipeId]: data.stats },
          userVotes: confirmedVotes,
          pendingRecipeIds: {
            ...current.pendingRecipeIds,
            [recipeId]: false,
          },
          voteErrors: { ...current.voteErrors, [recipeId]: undefined },
        }));
        saveStoredVotes(confirmedVotes);
      } catch (error) {
        console.error("Failed to save recipe feedback:", error);
        const restoredVotes = { ...get().userVotes };
        if (previousVote) restoredVotes[recipeId] = previousVote;
        else delete restoredVotes[recipeId];

        set((current) => ({
          stats: { ...current.stats, [recipeId]: previousStats },
          userVotes: restoredVotes,
          pendingRecipeIds: {
            ...current.pendingRecipeIds,
            [recipeId]: false,
          },
          voteErrors: {
            ...current.voteErrors,
            [recipeId]: "Your vote was not saved. Please try again.",
          },
        }));
        saveStoredVotes(restoredVotes);
      }
    },

    resetForTesting: () => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(RECIPE_USER_VOTES_STORAGE_KEY);
        window.localStorage.removeItem(RECIPE_FEEDBACK_CLIENT_ID_STORAGE_KEY);
      }
      set({
        stats: {},
        userVotes: {},
        clientId: null,
        loadStatus: "idle",
        pendingRecipeIds: {},
        loadError: null,
        voteErrors: {},
      });
      inMemoryClientId = null;
    },
  }),
);

export function useRecipeFeedback(recipeId: string) {
  const stats = useRecipeFeedbackStore(
    (state) => state.stats[recipeId] ?? EMPTY_RECIPE_FEEDBACK_STATS,
  );
  const userVote = useRecipeFeedbackStore((state) => state.userVotes[recipeId]);
  const loadStatus = useRecipeFeedbackStore((state) => state.loadStatus);
  const isPending = useRecipeFeedbackStore(
    (state) => !!state.pendingRecipeIds[recipeId],
  );
  const error = useRecipeFeedbackStore(
    (state) => state.loadError ?? state.voteErrors[recipeId] ?? null,
  );
  const hydrateClientState = useRecipeFeedbackStore(
    (state) => state.hydrateClientState,
  );
  const loadStats = useRecipeFeedbackStore((state) => state.loadStats);
  const castVote = useRecipeFeedbackStore((state) => state.castVote);

  useEffect(() => {
    hydrateClientState();
    void loadStats();
  }, [hydrateClientState, loadStats]);

  const formattedRecency = useMemo(
    () => formatRecency(stats.lastWorkedAt),
    [stats.lastWorkedAt],
  );
  const isRecentlyActive = useMemo(
    () => isRecipeRecentlyActive(stats.lastWorkedAt),
    [stats.lastWorkedAt],
  );

  return {
    stats,
    userVote,
    castVote: (vote: UserVote) => castVote(recipeId, vote),
    formattedRecency,
    isRecentlyActive,
    isLoading: loadStatus === "idle" || loadStatus === "loading",
    isPending,
    error,
  };
}
