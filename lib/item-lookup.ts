import Fuse from "fuse.js";
import type {
  SimplifiedItem,
  TraderBuyOffer,
  TraderSellOffer,
} from "@/types/SimplifiedItem";
import type { Recipe } from "@/data/recipes";
import { extractItemName } from "@/lib/recipe-item-matcher";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import {
  getCategoryLevelRequirement,
  getItemLevelRequirement,
} from "@/config/flea-level-requirements";
import type { GameMode } from "@/lib/game-mode";

export const ITEM_LOOKUP_RESULT_LIMIT = 50;

const RECENTS_STORAGE_KEY = "itemLookupRecents";
const RECENTS_LIMIT = 8;
const FLEA_VENDOR = "flea-market";

export type ItemLookupIndex = {
  items: SimplifiedItem[];
  fuse: Fuse<SimplifiedItem>;
};

export function normalizeLookupQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function getShortNames(item: SimplifiedItem): string[] {
  return [item.shortName, item.englishShortName]
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLowerCase());
}

function getNames(item: SimplifiedItem): string[] {
  return [item.name, item.englishName]
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLowerCase());
}

export function createItemLookupIndex(
  items: SimplifiedItem[],
): ItemLookupIndex {
  return {
    items,
    fuse: new Fuse(items, {
      keys: [
        { name: "shortName", weight: 0.35 },
        { name: "name", weight: 0.3 },
        { name: "englishShortName", weight: 0.2 },
        { name: "englishName", weight: 0.15 },
      ],
      threshold: 0.34,
      ignoreLocation: true,
      minMatchCharLength: 2,
    }),
  };
}

/**
 * Exact short-name and name matches first, then prefixes, then fuzzy matches.
 * Fuse alone ranks short names poorly ("LEDX" would not reliably come first).
 */
export function searchLookupItems(
  index: ItemLookupIndex,
  query: string,
  limit = ITEM_LOOKUP_RESULT_LIMIT,
): SimplifiedItem[] {
  const normalized = normalizeLookupQuery(query);
  if (!normalized) return [];

  const tiers: SimplifiedItem[][] = [[], [], [], []];
  for (const item of index.items) {
    const shortNames = getShortNames(item);
    const names = getNames(item);
    if (shortNames.includes(normalized)) tiers[0].push(item);
    else if (names.includes(normalized)) tiers[1].push(item);
    else if (shortNames.some((name) => name.startsWith(normalized)))
      tiers[2].push(item);
    else if (names.some((name) => name.startsWith(normalized)))
      tiers[3].push(item);
  }

  const byShortName = (a: SimplifiedItem, b: SimplifiedItem) =>
    a.shortName.length - b.shortName.length || a.name.localeCompare(b.name);
  const results = tiers.flatMap((tier) => tier.sort(byShortName));
  const seen = new Set(results.map((item) => item.id));

  if (results.length < limit) {
    for (const { item } of index.fuse.search(normalized, { limit })) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      results.push(item);
      if (results.length >= limit) break;
    }
  }

  return results.slice(0, limit);
}

export type LookupPage = {
  href: string;
  label: string;
  keywords: string[];
};

export const LOOKUP_PAGES: LookupPage[] = [
  { href: "/", label: "Calculator", keywords: ["home", "circle", "ritual"] },
  { href: "/recipes", label: "Recipes", keywords: ["craft"] },
  { href: "/tracker", label: "Tracker", keywords: ["timer", "ritual"] },
  { href: "/scan", label: "Stash Scan", keywords: ["screenshot"] },
  { href: "/base-values", label: "Base Values", keywords: ["prices", "table"] },
  { href: "/faq", label: "Help & FAQ", keywords: ["help", "faq"] },
  { href: "/updates", label: "Updates", keywords: ["changelog", "news"] },
];

export function searchLookupPages(
  pages: LookupPage[],
  query: string,
): LookupPage[] {
  const normalized = normalizeLookupQuery(query);
  if (!normalized) return [];
  return pages.filter((page) =>
    [page.label, ...page.keywords].some((term) =>
      term.toLowerCase().startsWith(normalized),
    ),
  );
}

function isTraderOffer(offer: { vendor?: { normalizedName?: string } }) {
  const vendor = offer.vendor?.normalizedName;
  return Boolean(vendor) && vendor !== FLEA_VENDOR;
}

/** Trader sell offers, best price first. Flea market is excluded. */
export function getTraderSellOffers(item: SimplifiedItem): TraderSellOffer[] {
  return (item.sellFor ?? [])
    .filter(isTraderOffer)
    .sort((a, b) => b.priceRUB - a.priceRUB);
}

/** Trader buy offers, cheapest first. Flea market is excluded. */
export function getTraderBuyOffers(item: SimplifiedItem): TraderBuyOffer[] {
  return (item.buyFor ?? [])
    .filter(isTraderOffer)
    .sort(
      (a, b) =>
        a.priceRUB - b.priceRUB ||
        (a.vendor.minTraderLevel ?? 1) - (b.vendor.minTraderLevel ?? 1),
    );
}

export function getFleaLevelRequirement(item: SimplifiedItem): number {
  for (const name of [
    item.englishName,
    item.name,
    item.englishShortName,
    item.shortName,
  ]) {
    if (!name) continue;
    const requirement = getItemLevelRequirement(name);
    if (requirement !== undefined) return requirement;
  }
  return Math.max(
    0,
    ...(item.categories ?? []).map(getCategoryLevelRequirement),
  );
}

export function getItemSlots(item: SimplifiedItem): number {
  return Math.max(1, (item.width ?? 1) * (item.height ?? 1));
}

export type RelatedRecipe = {
  recipe: Recipe;
  asInput: boolean;
  asOutput: boolean;
};

function getRecipeOutputs(recipe: Recipe): string[] {
  return recipe.producedItems.flatMap((entry) =>
    typeof entry === "string" ? [entry] : entry.items,
  );
}

/** Known recipes using this item, output matches first. */
export function findRelatedRecipes(
  item: SimplifiedItem,
  recipes: Recipe[],
): RelatedRecipe[] {
  const names = new Set([...getNames(item), ...getShortNames(item)]);
  const matches = (entry: string) =>
    names.has(extractItemName(entry).toLowerCase());

  return recipes
    .map((recipe) => ({
      recipe,
      asInput: recipe.requiredItems.some(matches),
      asOutput: getRecipeOutputs(recipe).some(matches),
    }))
    .filter(({ asInput, asOutput }) => asInput || asOutput)
    .sort((a, b) => Number(b.asOutput) - Number(a.asOutput));
}

function readStoredIds(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function readRecentItemIds(): string[] {
  return readStoredIds(RECENTS_STORAGE_KEY);
}

export function pushRecentItemId(itemId: string): string[] {
  const next = [
    itemId,
    ...readRecentItemIds().filter((id) => id !== itemId),
  ].slice(0, RECENTS_LIMIT);
  try {
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable; recents are best-effort
  }
  return next;
}

// Same storage as useFavorites, so stars are shared with the Base Values page.
// Read-modify-write keeps this palette from overwriting changes made there.
const favoritesKey = (mode: GameMode) => `favorites_${mode}`;

export function readFavoriteItemIds(mode: GameMode): string[] {
  return readStoredIds(favoritesKey(mode));
}

export function toggleFavoriteItemId(mode: GameMode, itemId: string): string[] {
  const current = readFavoriteItemIds(mode);
  const next = current.includes(itemId)
    ? current.filter((id) => id !== itemId)
    : [...current, itemId];
  try {
    if (next.length > 0) {
      localStorage.setItem(favoritesKey(mode), JSON.stringify(next));
    } else {
      localStorage.removeItem(favoritesKey(mode));
    }
  } catch {
    // Storage unavailable; keep the in-memory result
  }
  return next;
}

/** Calculator exclusions: user's saved list merged with the defaults. */
export function readExcludedItemNames(): Set<string> {
  const names = new Set(
    Array.from(DEFAULT_EXCLUDED_ITEMS, (name) => name.toLowerCase()),
  );
  for (const name of readStoredIds("excludedItems")) {
    names.add(name.toLowerCase());
  }
  return names;
}
