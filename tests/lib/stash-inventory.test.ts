import { describe, expect, it } from "vitest";

import {
  buildInventoryFromGroups,
  parseStashInventory,
  selectedCounts,
  stashCounts,
  toggleKeep,
  totalStashItems,
  type StashInventory,
} from "@/lib/stash-inventory";
import type { OwnedGroup } from "@/lib/stash-scan/owned-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function makeItem(id: string, basePrice = 1000): SimplifiedItem {
  return { id, name: `Item ${id}`, shortName: id, basePrice };
}

function makeGroup(
  itemId: string,
  cells: string[],
  needsReview = false,
): OwnedGroup {
  return {
    itemId,
    item: makeItem(itemId),
    cells: cells as OwnedGroup["cells"],
    needsReview,
  };
}

describe("buildInventoryFromGroups", () => {
  it("records counts, keep for excluded ids and needsReview flags", () => {
    const inv = buildInventoryFromGroups(
      [
        makeGroup("a", ["0:0", "0:1"]),
        makeGroup("b", ["0:2"], true),
        makeGroup("c", ["1:0"]),
      ],
      new Set(["b"]),
      "pvp",
      2,
    );

    expect(inv.version).toBe(1);
    expect(inv.gameMode).toBe("pvp");
    expect(inv.screenshots).toBe(2);
    expect(inv.items.a).toEqual({ count: 2 });
    expect(inv.items.b).toEqual({ count: 1, keep: true, needsReview: true });
    expect(inv.items.c).toEqual({ count: 1 });
    expect(totalStashItems(inv)).toBe(4);
  });
});

describe("parseStashInventory", () => {
  const valid: StashInventory = {
    version: 1,
    gameMode: "pve",
    scannedAt: 123,
    screenshots: 1,
    items: { a: { count: 2, keep: true } },
  };

  it("accepts a valid inventory", () => {
    expect(parseStashInventory(valid)).toEqual(valid);
  });

  it("returns null for null, garbage and malformed entries", () => {
    expect(parseStashInventory(null)).toBeNull();
    expect(parseStashInventory("nope")).toBeNull();
    expect(parseStashInventory({ version: 2 })).toBeNull();
    expect(parseStashInventory({ ...valid, gameMode: "mars" })).toBeNull();
    expect(
      parseStashInventory({ ...valid, items: { a: { count: "x" } } }),
    ).toBeNull();
    expect(parseStashInventory({ ...valid, items: [1, 2] })).toBeNull();
  });
});

describe("stashCounts / selectedCounts", () => {
  it("maps every item id to its count", () => {
    const inv: StashInventory = {
      version: 1,
      gameMode: "pvp",
      scannedAt: 0,
      screenshots: 1,
      items: { a: { count: 3 }, b: { count: 1, keep: true } },
    };
    expect(stashCounts(inv)).toEqual(
      new Map([
        ["a", 3],
        ["b", 1],
      ]),
    );
    expect(stashCounts(null).size).toBe(0);
  });

  it("counts only active slots", () => {
    const a = makeItem("a");
    const b = makeItem("b");
    const selected = [a, a, null, b, a];
    expect(selectedCounts(selected, 5)).toEqual(
      new Map([
        ["a", 3],
        ["b", 1],
      ]),
    );
    expect(selectedCounts(selected, 2)).toEqual(new Map([["a", 2]]));
  });
});

describe("toggleKeep", () => {
  const inv: StashInventory = {
    version: 1,
    gameMode: "pvp",
    scannedAt: 0,
    screenshots: 1,
    items: { a: { count: 2 }, b: { count: 1, keep: true } },
  };

  it("flips keep on and off", () => {
    const kept = toggleKeep(inv, "a");
    expect(kept.items.a.keep).toBe(true);
    const unkept = toggleKeep(kept, "a");
    expect(unkept.items.a.keep).toBeUndefined();
    expect(toggleKeep(inv, "b").items.b.keep).toBeUndefined();
    expect(toggleKeep(inv, "missing")).toBe(inv);
  });
});
