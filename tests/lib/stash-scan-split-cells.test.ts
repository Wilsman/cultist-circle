import {
  displayCells,
  initialAssignments,
  splitCellRects,
  splitOptions,
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

describe("splitOptions", () => {
  it("offers nothing for a single-slot cell", () => {
    expect(splitOptions({ slotsWide: 1, slotsHigh: 1 })).toEqual([]);
  });

  it("offers each way a cell divides evenly", () => {
    expect(splitOptions({ slotsWide: 1, slotsHigh: 2 })).toEqual([
      { direction: "rows", count: 2 },
    ]);
    expect(splitOptions({ slotsWide: 4, slotsHigh: 8 })).toEqual([
      { direction: "rows", count: 2 },
      { direction: "rows", count: 4 },
      { direction: "rows", count: 8 },
      { direction: "columns", count: 2 },
      { direction: "columns", count: 4 },
      { direction: "slots", count: 32 },
    ]);
  });
});

describe("splitCellRects with a count", () => {
  it("cuts a tall cell into the asked-for number of stacked items", () => {
    const tall = cell({ width: 127, height: 505, slotsWide: 2, slotsHigh: 8 });
    const halves = splitCellRects(tall, "rows", 2);
    expect(halves).toHaveLength(2);
    expect(halves[0]).toMatchObject({ x: 100, y: 200, width: 127, slotsWide: 2, slotsHigh: 4 });
    expect(halves[1]).toMatchObject({ x: 100, y: 452, width: 127, slotsWide: 2, slotsHigh: 4 });
  });

  it("cuts a wide cell into side-by-side items", () => {
    const wide = cell({ width: 253, height: 127, slotsWide: 4, slotsHigh: 2 });
    const parts = splitCellRects(wide, "columns", 2);
    expect(parts.map((r) => [r.x, r.slotsWide, r.slotsHigh])).toEqual([
      [100, 2, 2],
      [226, 2, 2],
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
