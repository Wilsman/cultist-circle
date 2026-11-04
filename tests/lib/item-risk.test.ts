import { describe, expect, it } from "vitest";
import {
  getItemFleaLevel,
  getItemRisks,
  isBrokenExcludedItem,
} from "@/lib/item-risk";
import { getItemMaxUses } from "@/hooks/use-tarkov-api";
import { CATEGORY_ID_BY_NAME } from "@/config/item-categories";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const id = (name: string) => CATEGORY_ID_BY_NAME.get(name)!;

function makeItem(partial: Partial<SimplifiedItem>): SimplifiedItem {
  return {
    id: "item",
    name: "Test item",
    shortName: "Test",
    basePrice: 1000,
    categories: [],
    ...partial,
  };
}

describe("getItemRisks", () => {
  it("flags assembled gear as unverified", () => {
    for (const name of ["Weapon", "Armor", "Armor Plate", "Chest rig"]) {
      expect(getItemRisks(makeItem({ categories: [id(name)] }))).toEqual([
        "unverified-value",
      ]);
    }
  });

  it("flags items with more than one use, and repair kits", () => {
    expect(getItemRisks(makeItem({ maxUses: 10 }))).toEqual(["has-uses"]);
    expect(getItemRisks(makeItem({ maxUses: 1 }))).toEqual([]);
    expect(
      getItemRisks(makeItem({ categories: [id("Repair Kits")] })),
    ).toEqual(["has-uses"]);
  });

  it("flags ammo as a per-round value", () => {
    expect(getItemRisks(makeItem({ categories: [id("Ammo")] }))).toEqual([
      "stack-value",
    ]);
  });

  it("falls back to English display categories", () => {
    expect(
      getItemRisks(
        makeItem({ categories: [], categories_display_en: [{ name: "Weapon" }] }),
      ),
    ).toEqual(["unverified-value"]);
  });

  it("leaves ordinary barter items alone", () => {
    expect(getItemRisks(makeItem({}))).toEqual([]);
  });
});

describe("getItemFleaLevel", () => {
  it("uses the strictest category requirement", () => {
    expect(
      getItemFleaLevel(
        makeItem({ categories: ["5447b5f14bdc2d61278b4567", id("Weapon")] }),
      ),
    ).toBe(25);
    expect(getItemFleaLevel(makeItem({}))).toBe(0);
  });
});

describe("isBrokenExcludedItem", () => {
  const roubles = makeItem({ name: "Roubles", englishName: "Roubles" });

  it("hides built-in broken items the user still excludes", () => {
    expect(isBrokenExcludedItem(roubles, new Set(["roubles"]))).toBe(true);
  });

  it("shows built-in items the user has un-excluded", () => {
    expect(isBrokenExcludedItem(roubles, new Set())).toBe(false);
  });

  it("ignores the user's own exclusions", () => {
    const rooster = makeItem({ name: "Golden rooster" });
    expect(isBrokenExcludedItem(rooster, new Set(["golden rooster"]))).toBe(
      false,
    );
  });
});

describe("getItemMaxUses", () => {
  it("reads uses, units or hitpoints from item properties", () => {
    expect(getItemMaxUses({ uses: 10 })).toBe(10);
    expect(getItemMaxUses({ units: 60 })).toBe(60);
    expect(getItemMaxUses({ hitpoints: 400 })).toBe(400);
    expect(getItemMaxUses({ uses: 0 })).toBeUndefined();
    expect(getItemMaxUses(null)).toBeUndefined();
  });
});
