import { describe, expect, it } from "vitest";

import {
  preferTradeableMatch,
  recordMatchCorrection,
} from "@/lib/stash-scan/match-preferences";
import { displayCells, initialAssignments } from "@/lib/stash-scan/owned-items";
import type { ScanCell, ScanImageResult } from "@/lib/stash-scan/types";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function makeCell(matches: Array<[string, number]>): ScanCell {
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    slotsWide: 1,
    slotsHigh: 1,
    empty: false,
    confidence: "medium",
    matches: matches.map(([itemId, score]) => ({
      itemId,
      shortName: itemId,
      rotated: false,
      score,
    })),
  };
}

function makeItem(id: string, price: number | null): SimplifiedItem {
  return {
    id,
    name: id,
    shortName: id,
    basePrice: 1000,
    lastLowPrice: price ?? undefined,
    sellFor: price
      ? [{ priceRUB: price, vendor: { normalizedName: "prapor" } }]
      : [],
  };
}

const itemsById = new Map(
  [makeItem("quest-drive", null), makeItem("flash-drive", 14000)].map(
    (item) => [item.id, item],
  ),
);

describe("recordMatchCorrection", () => {
  it("remembers a correction and forgets it when the suggestion is picked again", () => {
    const corrected = recordMatchCorrection({}, "quest-drive", "flash-drive");
    expect(corrected).toEqual({ "quest-drive": "flash-drive" });
    expect(
      recordMatchCorrection(corrected, "quest-drive", "quest-drive"),
    ).toEqual({});
  });

  it("ignores dismissed cells", () => {
    expect(recordMatchCorrection({}, "quest-drive", null)).toEqual({});
  });
});

describe("initialAssignments with preferences", () => {
  it("starts from the remembered correction", () => {
    const image: ScanImageResult = {
      width: 100,
      height: 100,
      pitch: 10,
      cells: [makeCell([["quest-drive", 0.9]])],
    };
    const cells = displayCells([image], {});
    expect(
      initialAssignments(cells, { "quest-drive": "flash-drive" })[cells[0].key],
    ).toBe("flash-drive");
  });
});

describe("preferTradeableMatch", () => {
  it("promotes a close tradeable look-alike over a quest-only best match", () => {
    const cell = makeCell([
      ["quest-drive", 0.9],
      ["flash-drive", 0.86],
    ]);
    expect(
      preferTradeableMatch(cell, itemsById).matches.map((m) => m.itemId),
    ).toEqual(["flash-drive", "quest-drive"]);
  });

  it("keeps the quest item when the tradeable one scores clearly worse", () => {
    const cell = makeCell([
      ["quest-drive", 0.9],
      ["flash-drive", 0.7],
    ]);
    expect(preferTradeableMatch(cell, itemsById)).toBe(cell);
  });
});
