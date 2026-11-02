// The shared lab data and the tester's saved settings, used by the lab and
// its charts page.

import {
  parseState,
  type LabMode,
  type LabTest,
  type Subject,
} from "@/lib/base-value-lab";
import { type GameMode, isGameMode } from "@/lib/game-mode";

export const LAB_ENDPOINT = `${process.env.NODE_ENV === "development" ? "" : "https://cultist-circle-feedback.cultistcircle.workers.dev"}/api/base-value-lab`;
const PREFS_KEY = "base-value-lab:prefs";

export type SharedTest = LabTest & { source?: string; contributor?: string };
export type ApiBody = { success?: boolean; error?: string; data?: unknown };

export interface Prefs {
  /** Game mode the tester plays, if they said. Optional. */
  played: GameMode | null;
  name: string;
  skill: string;
  /** Player level, to keep the flea out of suggestions until it unlocks. */
  level: string;
  /** Filler items the tester can't get, so suggestions avoid them. */
  blocked: string[];
}

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return {
      played:
        typeof raw.played === "string" && isGameMode(raw.played)
          ? raw.played
          : null,
      name: typeof raw.name === "string" ? raw.name : "",
      skill: typeof raw.skill === "string" ? raw.skill : "",
      level: typeof raw.level === "string" ? raw.level : "",
      blocked: Array.isArray(raw.blocked)
        ? raw.blocked.filter((id: unknown) => typeof id === "string")
        : [],
    };
  } catch {
    return { played: null, name: "", skill: "", level: "", blocked: [] };
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

/** Every subject, and the tests that only name known subjects. */
export async function fetchLab(): Promise<{
  subjects: Subject[];
  tests: SharedTest[];
}> {
  const response = await fetch(LAB_ENDPOINT, { cache: "no-store" });
  const body = (await response.json()) as ApiBody;
  if (!response.ok || !body?.success) throw new Error(body?.error);
  const raw = body.data as { subjects: Subject[]; tests: SharedTest[] };
  const ids = new Set(raw.subjects.map((s) => s.id));
  const usable = raw.tests.filter((t) =>
    t.entries?.every((e) => ids.has(e.subjectId)),
  );
  // Validates the rows the same way the local lab's import does.
  const state = parseState({
    version: 1,
    subjects: raw.subjects,
    tests: usable,
  });
  const extra = new Map(usable.map((t) => [t.id, t]));
  return {
    subjects: state.subjects,
    tests: state.tests.map((t) => ({
      ...t,
      source: extra.get(t.id)?.source,
      contributor: extra.get(t.id)?.contributor,
    })),
  };
}

/**
 * The set of items under test. Base values don't change between modes, so a
 * tester's game mode only picks this when that mode has its own items.
 */
export function labMode(
  subjects: readonly Subject[],
  played: GameMode | null,
): LabMode {
  const modes = (["pvp", "pve"] as const).filter((m) =>
    subjects.some((s) => s.mode === m),
  );
  return played && played !== "season" && modes.includes(played)
    ? played
    : (modes[0] ?? "pve");
}
