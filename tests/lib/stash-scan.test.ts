import { describe, expect, it } from "vitest";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import {
  matchOcrTokensToItems,
  normalizeOcrLabel,
  pickOptimalCombo,
  tokenizeOcrText,
} from "@/lib/stash-scan";

const makeItem = (id: string, shortName: string, basePrice: number) =>
  ({
    id,
    name: `${shortName} Full`,
    shortName,
    basePrice,
  }) as SimplifiedItem;

describe("stash-scan utils", () => {
  it("normalizes OCR labels and tokenizes text", () => {
    expect(normalizeOcrLabel("M.parts")).toBe("MPARTS");
    expect(normalizeOcrLabel("  S Plug ")).toBe("SPLUG");
    expect(tokenizeOcrText("SPlug   M.parts\nTape")).toEqual([
      "SPlug",
      "M.parts",
      "Tape",
    ]);
  });

  it("matches OCR tokens to items with counts", () => {
    const items = [
      makeItem("1", "SPlug", 120000),
      makeItem("2", "M Parts", 90000),
      makeItem("3", "Tape", 20000),
    ];
    const result = matchOcrTokensToItems(
      ["SPlug", "SPlug", "M.parts", "Tape"],
      items,
    );
    expect(result.matched.get("1")).toBe(2);
    expect(result.matched.get("2")).toBe(1);
    expect(result.matched.get("3")).toBe(1);
    expect(result.unmatched).toHaveLength(0);
  });

  it("picks optimal combo near threshold", () => {
    const inventory = [
      { item: makeItem("a", "A", 200000), count: 1 },
      { item: makeItem("b", "B", 150000), count: 1 },
      { item: makeItem("c", "C", 100000), count: 1 },
      { item: makeItem("d", "D", 90000), count: 1 },
    ];
    const result = pickOptimalCombo(inventory, 400000, 4);
    expect(result).not.toBeNull();
    expect(result?.total).toBe(440000);
    expect(result?.fleaCost).toBe(440000);
    expect(result?.items.length).toBe(3);
  });

  it("falls back to best below threshold when needed", () => {
    const inventory = [
      { item: makeItem("a", "A", 50000), count: 1 },
      { item: makeItem("b", "B", 40000), count: 1 },
      { item: makeItem("c", "C", 30000), count: 1 },
    ];
    const result = pickOptimalCombo(inventory, 400000, 4);
    expect(result?.total).toBe(120000);
    expect(result?.fleaCost).toBe(120000);
  });

  it("prefers lower flea cost even if base price is higher", () => {
    // Item A: high base price but low flea cost
    // Item B: lower base price but high flea cost
    // Combo with A should be preferred even if it goes further over threshold
    const itemA = {
      ...makeItem("a", "A", 300000),
      lastLowPrice: 50000, // Cheap on flea
    } as SimplifiedItem;
    const itemB = {
      ...makeItem("b", "B", 250000),
      lastLowPrice: 250000, // Same as base
    } as SimplifiedItem;
    const inventory = [
      { item: itemA, count: 1 },
      { item: itemB, count: 1 },
    ];
    // Threshold is 200000
    // A alone: base=300000 (meets), flea=50000
    // B alone: base=250000 (meets), flea=250000
    // Should pick A because flea cost is lower (50000 vs 250000)
    const result = pickOptimalCombo(inventory, 200000, 1);
    expect(result).not.toBeNull();
    expect(result?.items[0].id).toBe("a");
    expect(result?.fleaCost).toBe(50000);
  });
});
