import type { Recipe } from "../../../data/recipes";
import {
  hasUnknownCraftingTime,
  hasUnknownReward,
} from "../../../data/recipes";

const SITE_URL = "https://cultistcircle.com/recipes";
// Twitch caps chat messages at 500 characters; leave room for a mention.
const MAX_TEXT_LENGTH = 450;
const MAX_QUERY_LENGTH = 100;
export const DEFAULT_RECIPE_LIMIT = 25;
export const MAX_RECIPE_LIMIT = 200;

export type PublicRecipeVotes = {
  worked: number;
  didntWork: number;
  lastWorkedAt: string | null;
  lastWorkedMode: string | null;
  lastDidntWorkAt: string | null;
  lastDidntWorkMode: string | null;
};

export type PublicRecipeQuery = {
  q: string;
  /** Per-list cap; null returns every recipe (the default without `q`). */
  limit: number | null;
  format: "json" | "text";
};

export function parsePublicRecipeQuery(url: URL): PublicRecipeQuery {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_RECIPE_LIMIT)
      : q
        ? DEFAULT_RECIPE_LIMIT
        : null;

  return {
    q,
    limit,
    format: url.searchParams.get("format") === "text" ? "text" : "json",
  };
}

/** "2x Screw nuts" -> "screw nuts" */
function normalizeItem(item: string) {
  return item
    .toLowerCase()
    .replace(/^\s*\d+\s*x\s+/, "")
    .trim();
}

function normalizeQuery(q: string) {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

function rewardItems(recipe: Recipe): string[] {
  return recipe.producedItems.flatMap((entry) =>
    typeof entry === "string" ? [entry] : entry.items,
  );
}

/**
 * Scores how well a recipe matches the search. 0 means no match. Sacrifice
 * matches beat reward matches, and whole-name matches beat partial ones, so
 * "!recipe fence" finds the Fence figurine recipe before recipes that only
 * reward something with "fence" in its name.
 */
function scoreRecipe(recipe: Recipe, query: string): number {
  const tokens = query.split(" ");
  const sacrifices = recipe.requiredItems.map(normalizeItem);
  const rewards = rewardItems(recipe).map(normalizeItem);
  const matchesAll = (names: string[]) =>
    tokens.every((token) => names.some((name) => name.includes(token)));

  if (sacrifices.some((name) => name === query)) return 4;
  if (matchesAll(sacrifices)) return 3;
  if (rewards.some((name) => name === query)) return 2;
  if (matchesAll(rewards)) return 1;
  return 0;
}

/** Matches for `q` (every recipe when empty), active recipes first. */
export function searchRecipes(recipes: Recipe[], q: string): Recipe[] {
  const query = normalizeQuery(q);
  if (!query) {
    return [
      ...recipes.filter((recipe) => !recipe.expiredAt),
      ...recipes.filter((recipe) => recipe.expiredAt),
    ];
  }

  return recipes
    .map((recipe, index) => ({
      recipe,
      index,
      score: scoreRecipe(recipe, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        // Active recipes stay ahead of expired ones, then best match first,
        // then the catalog's own order (newest recipes are listed first).
        Number(Boolean(a.recipe.expiredAt)) -
          Number(Boolean(b.recipe.expiredAt)) ||
        b.score - a.score ||
        a.index - b.index,
    )
    .map((entry) => entry.recipe);
}

export function toPublicRecipe(
  recipe: Recipe,
  votes: PublicRecipeVotes | undefined,
) {
  const outcomes = recipe.producedItems.flatMap((entry) =>
    typeof entry === "string"
      ? []
      : [{ items: entry.items, explanation: entry.explanation }],
  );

  return {
    id: recipe.id,
    url: `${SITE_URL}?recipe=${encodeURIComponent(recipe.id)}`,
    requiredItems: recipe.requiredItems,
    craftingTime: hasUnknownCraftingTime(recipe) ? null : recipe.craftingTime,
    // Fixed rewards. Recipes with a random pool list them under `outcomes`.
    rewards: recipe.producedItems.filter(
      (entry): entry is string => typeof entry === "string",
    ),
    outcomes,
    rewardKnown: !hasUnknownReward(recipe),
    modeRestriction: recipe.modeRestriction ?? null,
    isNew: Boolean(recipe.isNew),
    isUpdated: Boolean(recipe.isUpdated),
    isRepeatable: Boolean(recipe.isRepeatable),
    expired: Boolean(recipe.expiredAt),
    expiredAt: recipe.expiredAt ?? null,
    votes: votes ?? {
      worked: 0,
      didntWork: 0,
      lastWorkedAt: null,
      lastWorkedMode: null,
      lastDidntWorkAt: null,
      lastDidntWorkMode: null,
    },
  };
}

const MODE_LABELS: Record<string, string> = {
  pvp: "PvP",
  pve: "PvE",
  season: "Season",
};

function timeAgo(iso: string, now: number): string | null {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.floor((now - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatRewards(recipe: Recipe): string {
  if (hasUnknownReward(recipe)) return "reward unknown";
  const fixed = recipe.producedItems.filter(
    (entry): entry is string => typeof entry === "string",
  );
  const pools = recipe.producedItems.flatMap((entry) =>
    typeof entry === "string" ? [] : [entry.items],
  );
  // One pool is a random draw from its items; several pools are alternative
  // outcomes, each a fixed set of items.
  const random =
    pools.length === 1
      ? [`random from: ${pools[0].join(" / ")}`]
      : pools.length > 1
        ? [`one of: ${pools.map((items) => items.join(" + ")).join(" / ")}`]
        : [];
  return [...fixed, ...random].join(", ");
}

/** One chat-ready line for the best match. */
export function formatRecipeText(
  matches: Recipe[],
  votesById: Map<string, PublicRecipeVotes>,
  q: string,
  now = Date.now(),
): string {
  const [recipe] = matches;
  if (!recipe) {
    return q
      ? `No recipe found for "${q}". Full list: ${SITE_URL}`
      : `Cultist Circle recipes: ${SITE_URL}`;
  }

  const timer = hasUnknownCraftingTime(recipe)
    ? "timer unknown"
    : recipe.craftingTime;
  const tags = [
    recipe.expiredAt ? `EXPIRED ${recipe.expiredAt}` : null,
    recipe.modeRestriction === "pvp-only" ? "PvP only" : null,
    recipe.modeRestriction === "season-only" ? "Season only" : null,
    recipe.isNew ? "NEW" : recipe.isUpdated ? "UPDATED" : null,
  ].filter(Boolean);

  const parts = [
    `${recipe.requiredItems.join(" + ")} → ${formatRewards(recipe)} (${timer})`,
  ];
  if (tags.length) parts.push(tags.join(", "));

  const votes = votesById.get(recipe.id);
  if (votes && votes.worked + votes.didntWork > 0) {
    let line = `✅ ${votes.worked} / ❌ ${votes.didntWork}`;
    const ago = votes.lastWorkedAt ? timeAgo(votes.lastWorkedAt, now) : null;
    if (ago) {
      const mode = votes.lastWorkedMode
        ? MODE_LABELS[votes.lastWorkedMode]
        : null;
      line += `, last worked ${ago}${mode ? ` (${mode})` : ""}`;
    }
    parts.push(line);
  }
  if (matches.length > 1) parts.push(`+${matches.length - 1} more`);

  const link = `cultistcircle.com/recipes?recipe=${recipe.id}`;
  let text = parts.join(" · ");
  const room = MAX_TEXT_LENGTH - link.length - 3;
  if (text.length > room) text = `${text.slice(0, room - 1).trimEnd()}…`;
  return `${text} · ${link}`;
}

/** Public, read-only endpoints described by GET /api/endpoints. */
export const PUBLIC_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/endpoints",
    description: "Lists the public endpoints and their parameters.",
    params: [],
  },
  {
    method: "GET",
    path: "/api/recipes",
    description:
      "Cultist Circle recipes with community vote stats. Without q it returns every recipe; JSON lists active recipes under `recipes` and ones that no longer work under `expired`. Cached for 60 seconds.",
    params: [
      {
        name: "q",
        description:
          "Search sacrifice and reward item names, e.g. `fence` or `wedge figurine`.",
      },
      {
        name: "limit",
        description: `Cap each list (1-${MAX_RECIPE_LIMIT}). Defaults to ${DEFAULT_RECIPE_LIMIT} with q, no cap without.`,
      },
      {
        name: "format",
        description:
          "`json` (default) or `text` for one chat-ready line about the best match.",
      },
    ],
    examples: [
      "/api/recipes",
      "/api/recipes?q=fence",
      "/api/recipes?q=fence&format=text",
    ],
  },
];
