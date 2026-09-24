// The scanned stash persisted in the browser: every recognised item with its
// count, which ones the user wants to keep, and which matches need a look.

import { GAME_MODES, type GameMode } from "@/lib/game-mode";
import type { OwnedGroup } from "@/lib/stash-scan/owned-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

export const STASH_INVENTORY_STORAGE_KEY = "stashInventory";

export interface StashInventoryEntry {
  count: number;
  /** The user wants to keep this item; it is never planned. */
  keep?: boolean;
  /** The match was not confident enough to trust blindly. */
  needsReview?: boolean;
}

export interface StashInventory {
  version: 1;
  gameMode: GameMode;
  /** Epoch ms when the scan finished. */
  scannedAt: number;
  screenshots: number;
  /** itemId -> entry for every detected item. */
  items: Record<string, StashInventoryEntry>;
}

export function buildInventoryFromGroups(
  groups: OwnedGroup[],
  excluded: ReadonlySet<string>,
  gameMode: GameMode,
  screenshots: number,
): StashInventory {
  const items: Record<string, StashInventoryEntry> = {};
  for (const group of groups) {
    const entry: StashInventoryEntry = { count: group.cells.length };
    if (excluded.has(group.itemId)) entry.keep = true;
    if (group.needsReview) entry.needsReview = true;
    items[group.itemId] = entry;
  }
  return {
    version: 1,
    gameMode,
    scannedAt: Date.now(),
    screenshots,
    items,
  };
}

export function parseStashInventory(raw: unknown): StashInventory | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<StashInventory>;
  if (candidate.version !== 1) return null;
  if (
    typeof candidate.gameMode !== "string" ||
    !GAME_MODES.includes(candidate.gameMode as GameMode)
  ) {
    return null;
  }
  if (typeof candidate.scannedAt !== "number" || !Number.isFinite(candidate.scannedAt)) {
    return null;
  }
  if (typeof candidate.screenshots !== "number" || !Number.isFinite(candidate.screenshots)) {
    return null;
  }
  if (!candidate.items || typeof candidate.items !== "object" || Array.isArray(candidate.items)) {
    return null;
  }
  const items: Record<string, StashInventoryEntry> = {};
  for (const [itemId, entry] of Object.entries(candidate.items)) {
    if (!entry || typeof entry !== "object") return null;
    const { count, keep, needsReview } = entry as StashInventoryEntry;
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
      return null;
    }
    items[itemId] = {
      count: Math.floor(count),
      ...(keep === true ? { keep: true } : {}),
      ...(needsReview === true ? { needsReview: true } : {}),
    };
  }
  return {
    version: 1,
    gameMode: candidate.gameMode as GameMode,
    scannedAt: candidate.scannedAt,
    screenshots: candidate.screenshots,
    items,
  };
}

/** itemId -> owned count for every detected item, kept ones included. */
export function stashCounts(inv: StashInventory | null): Map<string, number> {
  const counts = new Map<string, number>();
  if (!inv) return counts;
  for (const [itemId, entry] of Object.entries(inv.items)) {
    counts.set(itemId, entry.count);
  }
  return counts;
}

/** itemId -> how many active slots currently hold that item. */
export function selectedCounts(
  selected: Array<SimplifiedItem | null>,
  slotCount: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < Math.min(slotCount, selected.length); i++) {
    const item = selected[i];
    if (!item) continue;
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }
  return counts;
}

export function toggleKeep(inv: StashInventory, itemId: string): StashInventory {
  const entry = inv.items[itemId];
  if (!entry) return inv;
  const { keep, ...rest } = entry;
  return {
    ...inv,
    items: {
      ...inv.items,
      [itemId]: keep ? rest : { ...rest, keep: true },
    },
  };
}

export function totalStashItems(inv: StashInventory): number {
  return Object.values(inv.items).reduce((sum, entry) => sum + entry.count, 0);
}
