import { describe, expect, it } from "vitest";
import { isItemNameExcluded } from "@/lib/excluded-item-names";
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
});
