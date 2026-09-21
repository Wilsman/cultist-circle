// Turns scan results into owned items the sacrifice planner can use, applying
// the calculator's pricing settings.

import type { FleaPriceType, PriceMode } from "@/hooks/use-app-settings";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { OwnedItem } from "./optimize";
import type { ScanCell, ScanImageResult, ScanRect } from "./types";

/**
 * Identifies a cell across all scanned screenshots: "image:cell", or
 * "image:cell#slot" for one slot of a cell the user split apart.
 */
export type CellKey = string;

export const cellKey = (image: number, cell: number): CellKey => `${image}:${cell}`;
export const splitCellKey = (parent: CellKey, slot: number): CellKey => `${parent}#${slot}`;

/** A cell as shown: either a detected cell or one slot of a split one. */
export interface DisplayCell extends ScanCell {
  key: CellKey;
  imageIndex: number;
}

/** How a cell is cut up: into stacked rows, side-by-side columns, or slots. */
export type SplitDirection = "rows" | "columns" | "slots";

export interface SplitOption {
  direction: SplitDirection;
  /** Number of items the cell is split into. */
  count: number;
}

const divisors = (slots: number): number[] =>
  Array.from({ length: slots }, (_, i) => i + 1).filter((n) => n > 1 && slots % n === 0);

/**
 * The ways a cell can be split. A cell spanning several slots may hold items
 * stacked vertically, side by side, or one item per slot.
 */
export function splitOptions(cell: Pick<ScanCell, "slotsWide" | "slotsHigh">): SplitOption[] {
  const options: SplitOption[] = [
    ...divisors(cell.slotsHigh).map((count) => ({ direction: "rows" as const, count })),
    ...divisors(cell.slotsWide).map((count) => ({ direction: "columns" as const, count })),
  ];
  const slots = cell.slotsWide * cell.slotsHigh;
  // "Every slot" only when it is not already covered by a row/column split.
  if (slots > 1 && !options.some((o) => o.count === slots)) {
    options.push({ direction: "slots", count: slots });
  }
  return options;
}

/**
 * Cuts a cell into `count` equal parts, as rectangles to re-match. A detected
 * cell spans `slotsWide x slotsHigh` inventory slots and includes both border
 * lines, so the parts share the borders between them.
 */
export function splitCellRects(
  cell: ScanCell,
  direction: SplitDirection = "slots",
  count?: number,
): ScanRect[] {
  const columns = direction === "columns" ? (count ?? cell.slotsWide) : direction === "slots" ? cell.slotsWide : 1;
  const rows = direction === "rows" ? (count ?? cell.slotsHigh) : direction === "slots" ? cell.slotsHigh : 1;

  const rects: ScanRect[] = [];
  const columnAt = (i: number) => cell.x + Math.round((i * (cell.width - 1)) / columns);
  const rowAt = (j: number) => cell.y + Math.round((j * (cell.height - 1)) / rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      rects.push({
        x: columnAt(i),
        y: rowAt(j),
        width: columnAt(i + 1) - columnAt(i) + 1,
        height: rowAt(j + 1) - rowAt(j) + 1,
        slotsWide: Math.max(1, Math.round(cell.slotsWide / columns)),
        slotsHigh: Math.max(1, Math.round(cell.slotsHigh / rows)),
      });
    }
  }
  return rects;
}

/**
 * The cells to show for one screenshot: detected cells, with any the user
 * split replaced by their slots.
 */
export function displayCells(
  images: ScanImageResult[],
  splits: Record<CellKey, ScanCell[]>,
): DisplayCell[] {
  const cells: DisplayCell[] = [];
  images.forEach((image, imageIndex) => {
    image.cells.forEach((cell, index) => {
      const key = cellKey(imageIndex, index);
      const parts = splits[key];
      if (!parts) {
        cells.push({ ...cell, key, imageIndex });
        return;
      }
      parts.forEach((part, slot) => {
        cells.push({ ...part, key: splitCellKey(key, slot), imageIndex });
      });
    });
  });
  return cells;
}

/**
 * What each non-empty cell was resolved to: an item id, or null when the user
 * dismissed it (or it was never recognised).
 */
export type CellAssignments = Record<CellKey, string | null>;

/**
 * A cell "needs review" when it kept the matcher's best suggestion without
 * high confidence. Unassigned cells are unrecognised, not reviewable; cells
 * re-assigned to another item count as reviewed.
 */
export function cellNeedsReview(
  cell: Pick<ScanCell, "matches" | "confidence">,
  assignedId: string | null | undefined,
): boolean {
  return (
    !!assignedId &&
    cell.matches[0]?.itemId === assignedId &&
    cell.confidence !== "high"
  );
}

export interface OwnedGroup {
  itemId: string;
  item: SimplifiedItem | undefined;
  cells: CellKey[];
  /** Lowest confidence among the group's cells. */
  needsReview: boolean;
}

/** Initial assignments: the best match of every recognised, non-empty cell. */
export function initialAssignments(cells: DisplayCell[]): CellAssignments {
  const assignments: CellAssignments = {};
  for (const cell of cells) {
    if (cell.empty) continue;
    const best = cell.matches[0];
    assignments[cell.key] = best && cell.confidence !== "low" ? best.itemId : null;
  }
  return assignments;
}

export function groupOwnedItems(
  cells: DisplayCell[],
  assignments: CellAssignments,
  itemsById: Map<string, SimplifiedItem>,
): OwnedGroup[] {
  const byKey = new Map(cells.map((cell) => [cell.key, cell] as const));
  const groups = new Map<string, OwnedGroup>();
  for (const [key, itemId] of Object.entries(assignments) as Array<[CellKey, string | null]>) {
    if (!itemId) continue;
    const cell = byKey.get(key);
    if (!cell) continue;
    const group = groups.get(itemId) ?? {
      itemId,
      item: itemsById.get(itemId),
      cells: [],
      needsReview: false,
    };
    group.cells.push(key);
    // A cell the user re-assigned is reviewed; otherwise trust the matcher.
    if (cellNeedsReview(cell, itemId)) group.needsReview = true;
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
