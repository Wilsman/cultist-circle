import { describe, expect, it } from "vitest";

import type { StashInventory } from "@/lib/stash-inventory";
import { ownedFromInventory } from "@/lib/stash-planner";
import { isRecipeOverrideItem } from "@/lib/recipe-override-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function makeItem(id: string, name: string): SimplifiedItem {
  return {
    id,
    name,
    shortName: id,
    basePrice: 100_000,
    lastLowPrice: 50_000,
    sellFor: [{ priceRUB: 50_000, vendor: { normalizedName: "prapor" } }],
  };
}

describe("recipe override items", () => {
  it("matches the Mazoni golden dumbbell by name", () => {
    expect(isRecipeOverrideItem({ name: "Mazoni golden dumbbell" })).toBe(true);
    expect(isRecipeOverrideItem({ name: "Golden egg" })).toBe(false);
  });

  it("is never offered from the stash, even with filters ignored", () => {
    const mazoni = makeItem("mazoni", "Mazoni golden dumbbell");
    const egg = makeItem("egg", "Golden egg");
    const inventory = {
      items: { mazoni: { count: 1 }, egg: { count: 1 } },
    } as unknown as StashInventory;
    const owned = ownedFromInventory({
      inventory,
      itemsById: new Map([
        [mazoni.id, mazoni],
        [egg.id, egg],
      ]),
      pricing: {
        priceMode: "flea",
        fleaPriceType: "lastLowPrice",
        itemBonus: 0,
      },
      excludedNames: new Set(),
      ignoreFilters: true,
    });
    expect(owned.map((o) => o.key)).toEqual(["egg"]);
  });
});
