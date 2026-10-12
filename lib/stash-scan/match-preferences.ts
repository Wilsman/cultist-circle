// Per-user corrections and tie-breaks applied on top of the icon matcher.

import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { ScanCell, ScanImageResult } from "./types";

/**
 * Remembered corrections: the matcher's suggestion → the item the user picked
 * instead. Look-alike variants (for example a quest flash drive and the normal
 * one) keep the user's choice on later scans.
 */
export type MatchPreferences = Record<string, string>;

export const MATCH_PREFERENCES_STORAGE_KEY = "stashScanMatchPreferences";

/** Same gap the review panel uses to tell strong suggestions from weak ones. */
export const TRADEABLE_PREFERENCE_GAP = 0.08;

export function isMatchPreferences(value: unknown): value is MatchPreferences {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}

/**
 * Records what the user chose for a cell the matcher suggested `suggestedId`
 * for. Picking the suggestion again forgets the correction; dismissing a cell
 * (null) says nothing about which variant they own.
 */
export function recordMatchCorrection(
  preferences: MatchPreferences,
  suggestedId: string | undefined,
  chosenId: string | null,
): MatchPreferences {
  if (!suggestedId || !chosenId) return preferences;
  if (chosenId === suggestedId) {
    if (!(suggestedId in preferences)) return preferences;
    const next = { ...preferences };
    delete next[suggestedId];
    return next;
  }
  if (preferences[suggestedId] === chosenId) return preferences;
  return { ...preferences, [suggestedId]: chosenId };
}

/** The remembered replacement for a cell's best match, if any. */
export function preferredItemId(
  cell: Pick<ScanCell, "matches">,
  preferences: MatchPreferences,
): string | undefined {
  const best = cell.matches[0]?.itemId;
  return best ? preferences[best] : undefined;
}

/**
 * Quest items cannot be sold anywhere, so they rarely sit in a stash. Those
 * without any flea or trader price are treated as quest-only.
 */
export function isQuestOnlyItem(item: SimplifiedItem): boolean {
  const hasFleaPrice = [item.lastLowPrice, item.avg24hPrice].some(
    (price) => typeof price === "number" && price > 0,
  );
  return !hasFleaPrice && !(item.sellFor ?? []).some((o) => o.priceRUB > 0);
}

/**
 * Moves a strong tradeable candidate ahead of a quest-only best match, so
 * look-alike quest items stop winning by a hair. Unknown items are left alone.
 */
export function preferTradeableMatch(
  cell: ScanCell,
  itemsById: ReadonlyMap<string, SimplifiedItem>,
): ScanCell {
  const [best, ...rest] = cell.matches;
  const bestItem = best && itemsById.get(best.itemId);
  if (!bestItem || !isQuestOnlyItem(bestItem)) return cell;
  const index = rest.findIndex((match) => {
    if (match.itemId === best.itemId) return false;
    if (best.score - match.score > TRADEABLE_PREFERENCE_GAP) return false;
    const item = itemsById.get(match.itemId);
    return !!item && !isQuestOnlyItem(item);
  });
  if (index < 0) return cell;
  const promoted = rest[index];
  return {
    ...cell,
    matches: [promoted, best, ...rest.filter((_, i) => i !== index)],
  };
}

export function preferTradeableMatches(
  images: ScanImageResult[],
  itemsById: ReadonlyMap<string, SimplifiedItem>,
): ScanImageResult[] {
  if (!itemsById.size) return images;
  return images.map((image) => ({
    ...image,
    cells: image.cells.map((cell) =>
      cell.empty ? cell : preferTradeableMatch(cell, itemsById),
    ),
  }));
}
