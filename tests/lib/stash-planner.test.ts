import { describe, expect, it } from "vitest";

import type { StashInventory } from "@/lib/stash-inventory";
import {
  bestReachableFromStash,
  ownedFromInventory,
  planFromStash,
  suggestFromStash,
  type StashPlanInput,
} from "@/lib/stash-planner";
import type { PricingSettings } from "@/lib/stash-scan/owned-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const pricing: PricingSettings = {
  priceMode: "flea",
  fleaPriceType: "lastLowPrice",
  itemBonus: 0,
};

function makeItem(
  id: string,
  basePrice: number,
  lastLowPrice = basePrice,
): SimplifiedItem {
  return {
    id,
    name: `Item ${id}`,
    shortName: id,
    basePrice,
    lastLowPrice,
    avg24hPrice: lastLowPrice,
    sellFor: [{ priceRUB: lastLowPrice, vendor: { normalizedName: "prapor" } }],
  };
}

function makeInventory(
  items: Record<string, { count: number; keep?: boolean }>,
): StashInventory {
  const entries: StashInventory["items"] = {};
  for (const [id, entry] of Object.entries(items)) entries[id] = entry;
  return {
    version: 1,
    gameMode: "pvp",
    scannedAt: 0,
    screenshots: 1,
    items: entries,
  };
}

function makeInput(
  items: SimplifiedItem[],
  inventory: StashInventory,
  overrides: Partial<StashPlanInput> = {},
): StashPlanInput {
  return {
    inventory,
    itemsById: new Map(items.map((item) => [item.id, item])),
    selectedItems: [null, null, null, null, null],
    pinnedItems: [false, false, false, false, false],
    slotCount: 5,
    threshold: 400000,
    pricing,
    excludedNames: new Set(),
    ignoreFilters: false,
    ...overrides,
  };
}

describe("planFromStash", () => {
  it("keeps pinned items, counts them toward the threshold and never reuses their units", () => {
    const a = makeItem("a", 300000, 1); // cheap: would be picked if available
    const b = makeItem("b", 150000, 2);
    const input = makeInput(
      [a, b],
      makeInventory({ a: { count: 1 }, b: { count: 5 } }),
      {
        selectedItems: [a, null, null, null, null],
        pinnedItems: [true, false, false, false, false],
        slotCount: 3,
      },
    );

    const result = planFromStash(input);
    expect(result).not.toBeNull();
    expect(result!.slots[0]?.id).toBe("a");
    expect(result!.slots.slice(0, 3).map((s) => s?.id ?? null)).toEqual([
      "a",
      "b",
      null,
    ]);
    // The single owned "a" is already pinned, so it cannot be picked again.
    expect(result!.plan.picks).toEqual([{ key: "b", count: 1 }]);
    expect(result!.totalBaseValue).toBe(450000);
  });

  it("returns null when the stash cannot reach the threshold", () => {
    const a = makeItem("a", 100000);
    const b = makeItem("b", 50000);
    const input = makeInput(
      [a, b],
      makeInventory({ a: { count: 1 }, b: { count: 5 } }),
    );

    expect(planFromStash(input)).toBeNull();
    expect(bestReachableFromStash(ownedFromInventory(input), 5)).toBe(300000);
  });

  it("never picks kept items and honours excludedNames unless ignoreFilters", () => {
    const kept = makeItem("kept", 500000, 1);
    const filler = makeItem("filler", 100000, 2);
    const input = makeInput(
      [kept, filler],
      makeInventory({ kept: { count: 3, keep: true }, filler: { count: 5 } }),
    );
    const result = planFromStash(input);
    expect(result!.plan.picks).toEqual([{ key: "filler", count: 4 }]);
    expect(planFromStash({ ...input, ignoreFilters: true })!.plan.picks).toEqual([
      { key: "filler", count: 4 },
    ]);

    const cheap = makeItem("cheap", 200000, 1);
    const pricey = makeItem("pricey", 200000, 999);
    const excludedInput = makeInput(
      [cheap, pricey],
      makeInventory({ cheap: { count: 1 }, pricey: { count: 1 } }),
      { threshold: 200000, slotCount: 1, excludedNames: new Set(["Item cheap"]) },
    );
    expect(planFromStash(excludedInput)!.plan.picks).toEqual([
      { key: "pricey", count: 1 },
    ]);
    expect(
      planFromStash({ ...excludedInput, ignoreFilters: true })!.plan.picks,
    ).toEqual([{ key: "cheap", count: 1 }]);
    // Lowercase stored names are honoured too.
    expect(
      planFromStash({
        ...excludedInput,
        excludedNames: new Set(["item cheap"]),
      })!.plan.picks,
    ).toEqual([{ key: "pricey", count: 1 }]);
  });

  it("excludes avoided ids and returns the selection unchanged when nothing is needed", () => {
    const a = makeItem("a", 200000, 1);
    const b = makeItem("b", 200000, 5);
    const input = makeInput(
      [a, b],
      makeInventory({ a: { count: 1 }, b: { count: 1 } }),
      { threshold: 200000, slotCount: 1 },
    );
    expect(planFromStash(input)!.plan.picks).toEqual([
      { key: "a", count: 1 },
    ]);
    expect(planFromStash({ ...input, avoid: new Set(["a"]) })!.plan.picks).toEqual([
      { key: "b", count: 1 },
    ]);
    expect(planFromStash({ ...input, ignoreFilters: true, avoid: new Set(["a"]) })!.plan.picks).toEqual([
      { key: "b", count: 1 },
    ]);

    const big = makeItem("big", 500000);
    const pinnedInput = makeInput(
      [big],
      makeInventory({ big: { count: 1 } }),
      {
        selectedItems: [big, null, null, null, null],
        pinnedItems: [true, false, false, false, false],
      },
    );
    const met = planFromStash(pinnedInput);
    expect(met!.plan).toEqual({
      picks: [],
      itemCount: 0,
      totalBaseValue: 0,
      totalCost: 0,
    });
    expect(met!.slots).toEqual(pinnedInput.selectedItems);
    expect(met!.totalBaseValue).toBe(500000);
  });
});

describe("suggestFromStash", () => {
  it("suggests only owned items and leads with one that meets the need alone", () => {
    const selected = makeItem("a", 300000, 1);
    const cheap = makeItem("b", 150000, 10);
    const big = makeItem("c", 200000, 20);
    const input = makeInput(
      [selected, cheap, big],
      makeInventory({
        a: { count: 1 }, // the only unit is already selected
        b: { count: 5 },
        c: { count: 1 },
      }),
      {
        selectedItems: [selected, null, null, null, null],
        slotCount: 5,
      },
    );

    const suggestions = suggestFromStash({ ...input, slotIndex: 1 });
    expect(suggestions.length).toBeGreaterThan(0);
    // "a" is already in a slot and only one is owned, so it cannot be suggested.
    expect(suggestions.some((item) => item.id === "a")).toBe(false);
    // need = 100k; the cheapest item meeting it alone leads.
    expect(suggestions[0].id).toBe("b");
    expect(suggestions[0].basePrice).toBeGreaterThanOrEqual(100000);
    for (const item of suggestions) {
      expect(["b", "c"]).toContain(item.id);
    }
  });

  it("falls back to cheap owned items when the threshold is already met", () => {
    const a = makeItem("a", 500000, 100);
    const b = makeItem("b", 10000, 1);
    const input = makeInput(
      [a, b],
      makeInventory({ a: { count: 2 }, b: { count: 1 } }),
      { selectedItems: [a, null, null, null, null] },
    );
    const suggestions = suggestFromStash({ ...input, slotIndex: 1 });
    // need is 0: cheapest owned items come first, "a" has one unit left.
    expect(suggestions.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
