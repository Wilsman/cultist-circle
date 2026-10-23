import { describe, expect, it } from "vitest";
import {
  isItemNameExcluded,
  toExcludedNameLookup,
  toggleItemExclusion,
} from "@/lib/excluded-item-names";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

describe("excluded item names", () => {
  const item = {
    name: "Réservoir de carburant",
    shortName: "Carburant",
    englishName: "Metal fuel tank",
    englishShortName: "Fuel",
  } as SimplifiedItem;
  it.each(["réservoir de carburant", "carburant", "metal fuel tank", "fuel"])(
    "respects %s",
    (name) => {
      expect(isItemNameExcluded(item, new Set([name]))).toBe(true);
    },
  );
  it("leaves unrelated items available", () => {
    expect(isItemNameExcluded(item, new Set(["another item"]))).toBe(false);
  });

  it("stores the English name when excluding a localized item", () => {
    const next = toggleItemExclusion(new Set(), item);
    expect([...next]).toEqual(["Metal fuel tank"]);
    expect(isItemNameExcluded(item, toExcludedNameLookup(next))).toBe(true);
  });
  it("removes a stored name in any language or case", () => {
    const stored = new Set([
      "metal fuel tank",
      "Réservoir de carburant",
      "Other",
    ]);
    expect([...toggleItemExclusion(stored, item)]).toEqual(["Other"]);
  });
});
