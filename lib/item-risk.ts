import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { CATEGORY_ID_BY_NAME } from "@/config/item-categories";
import {
  getCategoryLevelRequirement,
  getItemLevelRequirement,
} from "@/config/flea-level-requirements";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { isItemNameExcluded } from "@/lib/excluded-item-names";

/**
 * Why a selected item's result may be off:
 * - `unverified-value`: the real in-game base value is unknown (assembled
 *   gear such as weapons and armour).
 * - `stack-value`: price and base value are for a single round.
 * - `has-uses`: the cheapest flea listing may be a partly used copy.
 */
export type ItemRisk = "unverified-value" | "stack-value" | "has-uses";

export const ITEM_RISK_ORDER: readonly ItemRisk[] = [
  "unverified-value",
  "has-uses",
  "stack-value",
];

const categoryIds = (names: string[]) =>
  new Set(
    names
      .map((name) => CATEGORY_ID_BY_NAME.get(name))
      .filter((id): id is string => Boolean(id)),
  );

const UNVERIFIED_VALUE_CATEGORY_IDS = categoryIds([
  "Weapon",
  "Armor",
  "Armor Plate",
  "Armored equipment",
  "Chest rig",
]);
const STACK_VALUE_CATEGORY_IDS = categoryIds(["Ammo", "Ammo container"]);
// tarkov.dev has no uses data for repair kits.
const HAS_USES_CATEGORY_IDS = categoryIds(["Repair Kits"]);

/** Category IDs for an item, falling back to its English display categories. */
export function getItemCategoryIds(item: SimplifiedItem): string[] {
  if (item.categories && item.categories.length > 0) return item.categories;
  return (item.categories_display_en ?? [])
    .map((c) => c.id ?? CATEGORY_ID_BY_NAME.get(c.name) ?? null)
    .filter((id): id is string => Boolean(id));
}

export function getItemRisks(item: SimplifiedItem): ItemRisk[] {
  const ids = getItemCategoryIds(item);
  const inAny = (set: Set<string>) => ids.some((id) => set.has(id));
  const risks: ItemRisk[] = [];
  if (inAny(UNVERIFIED_VALUE_CATEGORY_IDS)) risks.push("unverified-value");
  if ((item.maxUses ?? 0) > 1 || inAny(HAS_USES_CATEGORY_IDS)) {
    risks.push("has-uses");
  }
  if (inAny(STACK_VALUE_CATEGORY_IDS)) risks.push("stack-value");
  return risks;
}

/**
 * Player level needed to buy the item on the flea market. An item-specific
 * rule wins; otherwise the strictest of its categories applies. 0 means none.
 */
export function getItemFleaLevel(item: SimplifiedItem): number {
  const names = [
    item.englishName,
    item.name,
    item.englishShortName,
    item.shortName,
  ].filter((name): name is string => Boolean(name));
  for (const name of names) {
    const requirement = getItemLevelRequirement(name);
    if (requirement !== undefined) return requirement;
  }
  return getItemCategoryIds(item).reduce(
    (max, id) => Math.max(max, getCategoryLevelRequirement(id)),
    0,
  );
}

const BROKEN_ITEM_NAMES = new Set(
  Array.from(DEFAULT_EXCLUDED_ITEMS, (name) => name.toLowerCase()),
);

/**
 * True for built-in "doesn't work in the circle" items the user still
 * excludes. Search hides only these; the user's own exclusions affect Auto
 * Select only. `excludedLookup` must be lowercased.
 */
export function isBrokenExcludedItem(
  item: SimplifiedItem,
  excludedLookup: ReadonlySet<string>,
): boolean {
  return (
    isItemNameExcluded(item, BROKEN_ITEM_NAMES) &&
    isItemNameExcluded(item, excludedLookup)
  );
}
