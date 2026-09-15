import {
  displayCells,
  initialAssignments,
  splitCellRects,
} from "@/lib/stash-scan/owned-items";
import type { ScanCell, ScanImageResult } from "@/lib/stash-scan/types";
import { describe, expect, it } from "vitest";

function cell(overrides: Partial<ScanCell> = {}): ScanCell {
  return {
    x: 100,
    y: 200,
    width: 127,
    height: 64,
    slotsWide: 2,
    slotsHigh: 1,
    empty: false,
    confidence: "high",
    matches: [{ itemId: "a", shortName: "A", rotated: false, score: 0.9 }],
    ...overrides,
  };
}

describe("splitCellRects", () => {
  it("splits a two-slot cell into two slots that share their border", () => {
    expect(splitCellRects(cell())).toEqual([
      { x: 100, y: 200, width: 64, height: 64, slotsWide: 1, slotsHigh: 1 },
      { x: 163, y: 200, width: 64, height: 64, slotsWide: 1, slotsHigh: 1 },
    ]);
  });

  it("splits a tall cell downwards", () => {
    const rects = splitCellRects(cell({ width: 64, height: 127, slotsWide: 1, slotsHigh: 2 }));
    expect(rects.map((r) => [r.x, r.y])).toEqual([
      [100, 200],
      [100, 263],
    ]);
  });

  it("splits a 2x2 cell into four slots, rows first", () => {
    const rects = splitCellRects(cell({ width: 127, height: 127, slotsWide: 2, slotsHigh: 2 }));
    expect(rects).toHaveLength(4);
    expect(rects.every((r) => r.slotsWide === 1 && r.slotsHigh === 1)).toBe(true);
    expect(rects.map((r) => [r.x, r.y])).toEqual([
      [100, 200],
      [163, 200],
      [100, 263],
      [163, 263],
    ]);
  });
});

describe("displayCells", () => {
  const results: ScanImageResult[] = [
    { width: 1920, height: 1080, pitch: 63, cells: [cell(), cell({ x: 300 })] },
  ];

  it("returns detected cells with stable keys", () => {
    expect(displayCells(results, {}).map((c) => c.key)).toEqual(["0:0", "0:1"]);
  });

  it("replaces a split cell with its slots", () => {
    const parts = splitCellRects(results[0].cells[0]).map((rect) => ({
      ...cell(),
      ...rect,
      matches: [],
      confidence: "low" as const,
    }));
    const shown = displayCells(results, { "0:0": parts });
    expect(shown.map((c) => c.key)).toEqual(["0:0#0", "0:0#1", "0:1"]);
    expect(shown[0]).toMatchObject({ x: 100, width: 64, imageIndex: 0 });
    // Unmatched slots start unassigned, so they show as "not recognised".
    expect(initialAssignments(shown)["0:0#0"]).toBeNull();
  });
});
