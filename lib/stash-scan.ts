import Fuse from "fuse.js";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { STASH_OCR_ALIASES } from "@/config/stash-ocr-aliases";

export interface OcrMatchResult {
  matched: Map<string, number>;
  unmatched: string[];
}

export interface OcrTokenMatch {
  item?: SimplifiedItem;
  score: number;
  method: "exact" | "fuzzy" | "none";
  normalized: string;
}

export interface InventoryItemCount {
  item: SimplifiedItem;
  count: number;
}

export interface ComboResult {
  items: SimplifiedItem[];
  total: number;
  threshold: number;
}

const DEFAULT_MIN_TOKEN_LENGTH = 2;
const MAX_POOL_SIZE = 120;

export function normalizeOcrLabel(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function tokenizeOcrText(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildItemIndexes(items: SimplifiedItem[]) {
  const exactByNormalized = new Map<string, SimplifiedItem>();
  const searchItems = items.map((item) => {
    const shortName = item.englishShortName ?? item.shortName ?? "";
    const name = item.englishName ?? item.name ?? "";
    const normalizedShort = normalizeOcrLabel(shortName);
    if (normalizedShort && !exactByNormalized.has(normalizedShort)) {
      exactByNormalized.set(normalizedShort, item);
    }
    return {
      id: item.id,
      name,
      shortName,
      normalizedName: normalizeOcrLabel(name),
      normalizedShortName: normalizedShort,
      item,
    };
  });

  const fuse = new Fuse(searchItems, {
    keys: ["normalizedShortName", "normalizedName", "shortName", "name"],
    threshold: 0.28,
    includeScore: true,
  });

  return { exactByNormalized, fuse };
}

export function createOcrMatcher(items: SimplifiedItem[]) {
  const { exactByNormalized, fuse } = buildItemIndexes(items);

  return (rawToken: string): OcrTokenMatch => {
    const normalized = normalizeOcrLabel(rawToken);
    if (normalized.length < DEFAULT_MIN_TOKEN_LENGTH) {
      return { score: 1, method: "none", normalized };
    }
    if (/^\d+$/.test(normalized)) {
      return { score: 1, method: "none", normalized };
    }

    const alias = STASH_OCR_ALIASES[normalized];
    const normalizedLookup = alias ?? normalized;
    const exact = exactByNormalized.get(normalizedLookup);
    if (exact) {
      return { item: exact, score: 0, method: "exact", normalized };
    }

    const fuzzy = fuse.search(normalizedLookup, { limit: 1 })[0];
    if (fuzzy) {
      return {
        item: fuzzy.item.item as SimplifiedItem,
        score: fuzzy.score ?? 1,
        method: "fuzzy",
        normalized,
      };
    }

    return { score: 1, method: "none", normalized };
  };
}

export function matchOcrTokensToItems(
  tokens: string[],
  items: SimplifiedItem[]
): OcrMatchResult {
  const matchToken = createOcrMatcher(items);
  const matched = new Map<string, number>();
  const unmatched: string[] = [];

  tokens.forEach((rawToken) => {
    const result = matchToken(rawToken);
    if (result.method === "none" || !result.item) {
      unmatched.push(rawToken);
      return;
    }
    if (result.method === "exact" || result.score <= 0.22) {
      matched.set(result.item.id, (matched.get(result.item.id) ?? 0) + 1);
    } else {
      unmatched.push(rawToken);
    }
  });

  return { matched, unmatched };
}

export function buildInventoryCounts(
  items: SimplifiedItem[],
  matched: Map<string, number>,
  manualCounts: Record<string, number>
): InventoryItemCount[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const inventory: InventoryItemCount[] = [];

  for (const [itemId, count] of matched.entries()) {
    const item = itemsById.get(itemId);
    if (!item) continue;
    const override = manualCounts[itemId];
    const finalCount = Number.isFinite(override) ? override : count;
    if (finalCount > 0) {
      inventory.push({ item, count: finalCount });
    }
  }

  for (const [itemId, count] of Object.entries(manualCounts)) {
    if (matched.has(itemId)) continue;
    const item = itemsById.get(itemId);
    if (!item) continue;
    if (count > 0) {
      inventory.push({ item, count });
    }
  }

  return inventory.sort((a, b) => b.item.basePrice - a.item.basePrice);
}

function expandInventory(
  inventory: InventoryItemCount[],
  maxItems: number
): SimplifiedItem[] {
  const expanded: SimplifiedItem[] = [];
  for (const { item, count } of inventory) {
    const limit = Math.min(count, maxItems);
    for (let i = 0; i < limit; i += 1) {
      expanded.push(item);
    }
  }
  return expanded;
}

function trimPool(items: SimplifiedItem[]): SimplifiedItem[] {
  if (items.length <= MAX_POOL_SIZE) return items;
  const sorted = [...items].sort((a, b) => b.basePrice - a.basePrice);
  const top = sorted.slice(0, 80);
  const middle = sorted.slice(80, 100);
  const bottom = sorted.slice(-20);
  const combined = [...top, ...middle, ...bottom];
  return combined.slice(0, MAX_POOL_SIZE);
}

export function pickOptimalCombo(
  inventory: InventoryItemCount[],
  threshold: number,
  maxItems: number
): ComboResult | null {
  if (inventory.length === 0) return null;
  if (maxItems <= 0) return null;

  const expanded = trimPool(expandInventory(inventory, maxItems));
  if (expanded.length === 0) return null;

  let bestAbove: ComboResult | null = null;
  let bestBelow: ComboResult | null = null;

  const dfs = (start: number, chosen: SimplifiedItem[], total: number) => {
    if (total >= threshold) {
      if (!bestAbove || total < bestAbove.total) {
        bestAbove = { items: [...chosen], total, threshold };
      }
      return;
    }
    if (!bestBelow || total > bestBelow.total) {
      bestBelow = { items: [...chosen], total, threshold };
    }
    if (chosen.length >= maxItems) return;

    for (let i = start; i < expanded.length; i += 1) {
      const nextTotal = total + expanded[i].basePrice;
      if (bestAbove && nextTotal >= bestAbove.total) continue;
      chosen.push(expanded[i]);
      dfs(i + 1, chosen, nextTotal);
      chosen.pop();
    }
  };

  dfs(0, [], 0);
  return bestAbove ?? bestBelow;
}
