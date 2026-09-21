import { describe, expect, it } from "vitest";

import {
  cellNeedsReview,
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
