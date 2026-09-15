// Turns scan results into owned items the sacrifice planner can use, applying
// the calculator's pricing settings.

import type { FleaPriceType, PriceMode } from "@/hooks/use-app-settings";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { OwnedItem } from "./optimize";
import type { ScanImageResult } from "./types";

/** Identifies a cell across all scanned screenshots. */
export type CellKey = `${number}:${number}`;

export const cellKey = (image: number, cell: number): CellKey => `${image}:${cell}`;

/**
 * What each non-empty cell was resolved to: an item id, or null when the user
 * dismissed it (or it was never recognised).
 */
export type CellAssignments = Record<CellKey, string | null>;

export interface OwnedGroup {
  itemId: string;
  item: SimplifiedItem | undefined;
  cells: CellKey[];
  /** Lowest confidence among the group's cells. */
  needsReview: boolean;
}

/** Initial assignments: the best match of every recognised, non-empty cell. */
export function initialAssignments(images: ScanImageResult[]): CellAssignments {
  const assignments: CellAssignments = {};
  images.forEach((image, i) => {
    image.cells.forEach((cell, c) => {
      if (cell.empty) return;
      const best = cell.matches[0];
      assignments[cellKey(i, c)] = best && cell.confidence !== "low" ? best.itemId : null;
    });
  });
  return assignments;
}

export function groupOwnedItems(
  images: ScanImageResult[],
  assignments: CellAssignments,
  itemsById: Map<string, SimplifiedItem>,
): OwnedGroup[] {
  const groups = new Map<string, OwnedGroup>();
  for (const [key, itemId] of Object.entries(assignments) as Array<[CellKey, string | null]>) {
    if (!itemId) continue;
    const [imageIndex, cellIndex] = key.split(":").map(Number);
    const cell = images[imageIndex]?.cells[cellIndex];
    if (!cell) continue;
    const group = groups.get(itemId) ?? {
      itemId,
      item: itemsById.get(itemId),
      cells: [],
      needsReview: false,
    };
    group.cells.push(key);
    // A cell the user re-assigned is reviewed; otherwise trust the matcher.
    const matchedAsBest = cell.matches[0]?.itemId === itemId;
    if (matchedAsBest && cell.confidence !== "high") group.needsReview = true;
    groups.set(itemId, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      (b.item?.basePrice ?? 0) - (a.item?.basePrice ?? 0) ||
      a.itemId.localeCompare(b.itemId),
  );
}

export interface PricingSettings {
  priceMode: PriceMode;
  fleaPriceType: FleaPriceType;
  /** Sacred amulet style bonus, in percent. */
  itemBonus: number;
}

/** Base value the circle counts for one item, with the bonus applied. */
export function sacrificeBaseValue(item: SimplifiedItem, itemBonus: number): number {
  return Math.floor(item.basePrice * (1 + itemBonus / 100));
}

/**
 * Market value given up by sacrificing an item you own: what it would sell
 * for on the flea market, or to the best trader in trader mode. Falls back to
 * the trader price for items that cannot be sold on the flea market.
 */
export function valueGivenUp(
  item: SimplifiedItem,
  { priceMode, fleaPriceType }: PricingSettings,
): number {
  const traderPrice = Math.max(0, ...(item.sellFor ?? []).map((offer) => offer.priceRUB));
  if (priceMode === "trader") return traderPrice;
  const flea = item[fleaPriceType];
  return typeof flea === "number" && flea > 0 ? flea : traderPrice;
}

export function toOwnedItems(
  groups: OwnedGroup[],
  excluded: ReadonlySet<string>,
  pricing: PricingSettings,
): OwnedItem[] {
  return groups
    .filter((group) => group.item && !excluded.has(group.itemId))
    .map((group) => ({
      key: group.itemId,
      count: group.cells.length,
      baseValue: sacrificeBaseValue(group.item!, pricing.itemBonus),
      cost: valueGivenUp(group.item!, pricing),
    }));
}
