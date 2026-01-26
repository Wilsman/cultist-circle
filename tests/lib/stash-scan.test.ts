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
  } as SimplifiedItem);

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
      items
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
  });
});
