import { describe, expect, it } from "vitest";
import {
  filterManualDiscoveryItems,
  getAccessibleTraderOffer,
  matchesItemCategory,
  prioritizeDefaultWeapons,
  WEAPON_CATEGORY_ID,
} from "@/lib/item-selector-filters";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function makeItem(partial: Partial<SimplifiedItem>): SimplifiedItem {
  return {
    id: partial.id ?? "item-1",
    name: partial.name ?? "Test item",
    shortName: partial.shortName ?? "Test",
    basePrice: partial.basePrice ?? 10_000,
    categories: partial.categories ?? [],
    buyFor: partial.buyFor ?? [],
    ...partial,
  };
}

const traderLevels = {
  prapor: 2,
  peacekeeper: 1,
};

describe("item selector discovery filters", () => {
  it("matches any exact category by stable category ID", () => {
    const componentCategoryId = "5448fe124bdc2da5018b4567";
    const gun = makeItem({ categories: [WEAPON_CATEGORY_ID] });
    const component = makeItem({ categories: [componentCategoryId] });

    expect(matchesItemCategory(gun, WEAPON_CATEGORY_ID)).toBe(true);
    expect(matchesItemCategory(gun, componentCategoryId)).toBe(false);
    expect(matchesItemCategory(component, componentCategoryId)).toBe(true);
    expect(matchesItemCategory(component, null)).toBe(true);
  });

  it("falls back to English display category IDs", () => {
    const gun = makeItem({
      categories: [],
      categories_display_en: [{ id: WEAPON_CATEGORY_ID, name: "Weapon" }],
    });

    expect(matchesItemCategory(gun, WEAPON_CATEGORY_ID)).toBe(true);
  });

  it("matches only trader offers accessible at the configured level", () => {
    const item = makeItem({
      buyFor: [
        {
          priceRUB: 12_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 3 },
        },
        {
          priceRUB: 10_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 2 },
        },
      ],
    });

    expect(
      getAccessibleTraderOffer(item, "prapor", traderLevels)?.priceRUB,
    ).toBe(10_000);
    expect(
      getAccessibleTraderOffer(item, "peacekeeper", traderLevels),
    ).toBeUndefined();
  });

  it("combines category and trader filters", () => {
    const componentCategoryId = "5448fe124bdc2da5018b4567";
    const praporGun = makeItem({
      id: "gun",
      categories: [WEAPON_CATEGORY_ID],
      buyFor: [
        {
          priceRUB: 10_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 2 },
        },
      ],
    });
    const inaccessibleGun = makeItem({
      id: "locked-gun",
      categories: [WEAPON_CATEGORY_ID],
      buyFor: [
        {
          priceRUB: 15_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 3 },
        },
      ],
    });
    const praporComponent = makeItem({
      id: "component",
      categories: [componentCategoryId],
      buyFor: [
        {
          priceRUB: 5_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 1 },
        },
      ],
    });

    expect(
      filterManualDiscoveryItems(
        [praporGun, inaccessibleGun, praporComponent],
        WEAPON_CATEGORY_ID,
        "prapor",
        traderLevels,
      ).map((item) => item.id),
    ).toEqual(["gun"]);
  });

  it("stable-partitions Default weapons ahead of other results", () => {
    const base = makeItem({ id: "base", name: "HK MP5 base" });
    const defaultPreset = makeItem({
      id: "default",
      name: "HK MP5 Navy Default",
    });
    const exception = makeItem({ id: "exception", name: "HK MP5 SD" });

    expect(
      prioritizeDefaultWeapons([base, defaultPreset, exception]).map(
        (item) => item.id,
      ),
    ).toEqual(["default", "base", "exception"]);
  });
});
