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
  fleaCost: number;
}

const DEFAULT_MIN_TOKEN_LENGTH = 2;
const MIN_FUZZY_TOKEN_LENGTH = 4; // Require longer tokens for fuzzy matching
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
    threshold: 0.18, // Tightened from 0.28 to reduce false positives
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

    // Only allow fuzzy matching for longer tokens to avoid false positives
    if (normalizedLookup.length >= MIN_FUZZY_TOKEN_LENGTH) {
      const fuzzy = fuse.search(normalizedLookup, { limit: 1 })[0];
      if (fuzzy && (fuzzy.score ?? 1) <= 0.18) {
        return {
          item: fuzzy.item.item as SimplifiedItem,
          score: fuzzy.score ?? 1,
          method: "fuzzy",
          normalized,
        };
      }
    }

    return { score: 1, method: "none", normalized };
  };
}

export function matchOcrTokensToItems(
  tokens: string[],
  items: SimplifiedItem[],
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
  manualCounts: Record<string, number>,
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
  maxItems: number,
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

// Reward tier upper bounds - prevent crossing into next bracket
const REWARD_TIER_BOUNDS = [
  10000, // 0-10k
  25000, // 10k-25k
  50000, // 25k-50k
  100000, // 50k-100k
  200000, // 100k-200k
  350000, // 200k-350k
  400000, // 350k-400k (special tier)
  Infinity, // 400k+
];

function getUpperBound(threshold: number): number {
  for (const bound of REWARD_TIER_BOUNDS) {
    if (threshold < bound) {
      return bound;
    }
  }
  return Infinity;
}

export function pickOptimalCombo(
  inventory: InventoryItemCount[],
  threshold: number,
  maxItems: number,
  seed = 0,
): ComboResult | null {
  if (inventory.length === 0) return null;
  if (maxItems <= 0) return null;

  let expanded = trimPool(expandInventory(inventory, maxItems));
  if (expanded.length === 0) return null;

  // Shuffle the expanded array based on seed to explore different combos first
  if (seed > 0) {
    expanded = [...expanded];
    for (let i = expanded.length - 1; i > 0; i--) {
      const j = Math.floor(
        (((seed * (i + 1) * 9301 + 49297) % 233280) / 233280) * (i + 1),
      );
      [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
    }
  }

  // Get upper bound to stay within reward tier
  const upperBound = getUpperBound(threshold);

  // Helper to calculate flea cost for a combination
  const calcFleaCost = (items: SimplifiedItem[]): number =>
    items.reduce(
      (sum, item) => sum + (item.lastLowPrice ?? item.basePrice ?? 0),
      0,
    );

  const aboveThreshold: ComboResult[] = [];
  let bestBelow: ComboResult | null = null;
  let minFleaCost = Infinity;
  const MAX_CANDIDATES = 20;
  const MAX_TIME_MS = 100; // Stop after 100ms to keep UI responsive
  const startTime = Date.now();

  const dfs = (start: number, chosen: SimplifiedItem[], total: number) => {
    // Time limit check
    if (Date.now() - startTime > MAX_TIME_MS) return;

    const fleaCost = calcFleaCost(chosen);

    if (total >= threshold) {
      // Only store if we stay within the upper bound (reward tier)
      if (total < upperBound) {
        if (aboveThreshold.length < MAX_CANDIDATES) {
          aboveThreshold.push({
            items: [...chosen],
            total,
            threshold,
            fleaCost,
          });
          if (fleaCost < minFleaCost) minFleaCost = fleaCost;
        } else if (fleaCost < minFleaCost) {
          // Replace worst candidate if this is better
          aboveThreshold.sort((a, b) => a.fleaCost - b.fleaCost);
          aboveThreshold.pop();
          aboveThreshold.push({
            items: [...chosen],
            total,
            threshold,
            fleaCost,
          });
          minFleaCost = aboveThreshold[aboveThreshold.length - 1].fleaCost;
        }
      }
      return;
    }

    // Track best below-threshold combo (closest to threshold by base price)
    if (!bestBelow || total > bestBelow.total) {
      bestBelow = { items: [...chosen], total, threshold, fleaCost };
    }

    if (chosen.length >= maxItems) return;

    for (let i = start; i < expanded.length; i += 1) {
      // Time limit check in loop
      if (Date.now() - startTime > MAX_TIME_MS) return;

      const nextTotal = total + expanded[i].basePrice;
      // Pruning: skip if we're already way over the best found
      if (aboveThreshold.length >= MAX_CANDIDATES && nextTotal > threshold * 2)
        continue;
      chosen.push(expanded[i]);
      dfs(i + 1, chosen, nextTotal);
      chosen.pop();
    }
  };

  dfs(0, [], 0);

  if (aboveThreshold.length === 0) {
    return bestBelow;
  }

  // Deduplicate combos
  const seen = new Set<string>();
  const uniqueCombos: ComboResult[] = [];
  for (const combo of aboveThreshold) {
    const key = combo.items.map((i) => i.id).join(",");
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCombos.push(combo);
    }
  }

  if (seed === 0) {
    // No seed: sort by flea cost and return the best
    uniqueCombos.sort((a, b) => a.fleaCost - b.fleaCost);
    return uniqueCombos[0];
  }

  // With seed: pick a different combo than before if possible
  // Don't sort - keep in discovery order (which is randomized by seed)
  // This gives variety when shuffling
  if (uniqueCombos.length === 1) {
    return uniqueCombos[0]; // Only one valid combo exists
  }

  // Use seed to deterministically pick from available unique combos
  // Prefer returning a different combo than the "best" one
  const rng = (((seed * 9301 + 49297) % 233280) / 233280) * uniqueCombos.length;
  const selectedIndex = Math.floor(rng);

  return uniqueCombos[selectedIndex];
}
