import { describe, expect, it } from "vitest";

import {
  cellNeedsReview,
  cellsWithSameReviewSuggestion,
  displayCells,
  initialAssignments,
} from "@/lib/stash-scan/owned-items";
import type { ScanCell, ScanImageResult } from "@/lib/stash-scan/types";

function makeImage(confidences: Array<"high" | "medium" | "low" | "empty">): ScanImageResult {
  return {
    width: 100,
    height: 100,
    pitch: 10,
    cells: confidences.map((confidence, i) => ({
      x: i,
      y: 0,
      width: 10,
      height: 10,
      slotsWide: 1,
      slotsHigh: 1,
      empty: confidence === "empty",
      confidence: confidence === "empty" ? "high" : confidence,
      matches:
        confidence === "empty"
          ? []
          : [{ itemId: `item-${confidence}`, shortName: confidence, rotated: false, score: 1 }],
    })),
  };
}

describe("initialAssignments", () => {
  it("keys cells by image and cell index", () => {
    const assignments = initialAssignments(
      displayCells([makeImage(["high", "low", "empty"])], {}),
    );
    expect(assignments).toEqual({
      "0:0": "item-high",
      "0:1": null,
    });
  });

  it("keys appended images by their real image index", () => {
    const all = [makeImage(["high"]), makeImage(["medium"])];
    const appended = displayCells(all, {}).filter((cell) => cell.imageIndex >= 1);
    expect(initialAssignments(appended)).toEqual({ "1:0": "item-medium" });
  });
});

describe("cellNeedsReview", () => {
  const cell = (confidence: "high" | "medium" | "low"): ScanCell => ({
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    slotsWide: 1,
    slotsHigh: 1,
    empty: false,
    confidence,
    matches: [
      { itemId: "best", shortName: "best", rotated: false, score: 1 },
      { itemId: "other", shortName: "other", rotated: false, score: 0.5 },
    ],
  });

  it("is false for unassigned cells (unrecognised, not review)", () => {
    expect(cellNeedsReview(cell("medium"), null)).toBe(false);
    expect(cellNeedsReview(cell("low"), undefined)).toBe(false);
  });

  it("is false for a high-confidence best match", () => {
    expect(cellNeedsReview(cell("high"), "best")).toBe(false);
  });

  it("is true for a non-high-confidence best match", () => {
    expect(cellNeedsReview(cell("medium"), "best")).toBe(true);
    expect(cellNeedsReview(cell("low"), "best")).toBe(true);
  });

  it("is false when re-assigned to a non-best item", () => {
    expect(cellNeedsReview(cell("medium"), "other")).toBe(false);
  });
});

describe("cellsWithSameReviewSuggestion", () => {
  it("returns only other unchecked cells with the same top match", () => {
    const samples: Array<{
      itemId: string;
      confidence: ScanCell["confidence"];
    }> = [
      { itemId: "meds", confidence: "low" },
      { itemId: "meds", confidence: "medium" },
      { itemId: "meds", confidence: "high" },
      { itemId: "ammo", confidence: "low" },
    ];
    const image: ScanImageResult = {
      width: 100,
      height: 100,
      pitch: 10,
      cells: samples.map(({ itemId, confidence }) => ({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        slotsWide: 1,
        slotsHigh: 1,
        empty: false,
        confidence,
        matches: [
          {
            itemId,
            shortName: itemId,
            rotated: false,
            score: 1,
          },
        ],
      })),
    };
    const cells = displayCells([image], {});
    const stillNeedsReview = new Set(["0:0", "0:1", "0:3"]);

    expect(cellsWithSameReviewSuggestion(cells[0], cells, stillNeedsReview)).toEqual([
      "0:1",
    ]);
  });

  it("returns nothing when the active cell has no top match", () => {
    const cells = displayCells([makeImage(["empty"])], {});
    expect(cellsWithSameReviewSuggestion(cells[0], cells, new Set())).toEqual([]);
  });
});
