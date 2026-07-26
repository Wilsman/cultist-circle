import type { SimplifiedItem, TraderBuyOffer } from "@/types/SimplifiedItem";
import type { TraderLevels } from "@/components/ui/trader-level-selector";

export const WEAPON_CATEGORY_ID = "5422acb9af1c889c16000029";
export const ALL_CATEGORIES_FILTER = "all";
export type SelectorTraderFilter = keyof TraderLevels | "any";

function getCategoryIds(item: SimplifiedItem): string[] {
  if (item.categories?.length) {
    return item.categories;
  }

  return (item.categories_display_en ?? [])
    .map((category) => category.id)
    .filter((id): id is string => Boolean(id));
}

export function matchesItemCategory(
  item: SimplifiedItem,
  categoryId: string | null,
): boolean {
  return categoryId === null || getCategoryIds(item).includes(categoryId);
}

export function getAccessibleTraderOffer(
  item: SimplifiedItem,
  trader: string,
  traderLevels: object,
): TraderBuyOffer | undefined {
  const configuredLevel = (traderLevels as Record<string, number>)[trader];
  if (configuredLevel === undefined) {
    return undefined;
  }

  return item.buyFor
    ?.filter(
      (offer) =>
        offer.vendor?.normalizedName === trader &&
        (offer.vendor.minTraderLevel === undefined ||
          offer.vendor.minTraderLevel <= configuredLevel),
    )
    .sort((a, b) => b.priceRUB - a.priceRUB)[0];
}

export function filterManualDiscoveryItems(
  items: SimplifiedItem[],
  categoryId: string | null,
  trader: string | null,
  traderLevels: object,
): SimplifiedItem[] {
  return items.filter(
    (item) =>
      matchesItemCategory(item, categoryId) &&
      (!trader ||
        Boolean(getAccessibleTraderOffer(item, trader, traderLevels))),
  );
}

function isDefaultWeapon(item: SimplifiedItem): boolean {
  return [item.name, item.englishName]
    .filter(Boolean)
    .some((name) => /\bdefault\b/i.test(name!));
}

export function prioritizeDefaultWeapons(
  items: SimplifiedItem[],
): SimplifiedItem[] {
  const defaultWeapons: SimplifiedItem[] = [];
  const otherWeapons: SimplifiedItem[] = [];

  for (const item of items) {
    if (isDefaultWeapon(item)) {
      defaultWeapons.push(item);
    } else {
      otherWeapons.push(item);
    }
  }

  return [...defaultWeapons, ...otherWeapons];
}
