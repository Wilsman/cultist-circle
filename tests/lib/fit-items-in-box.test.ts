import { describe, expect, test } from "vitest";

import { doItemsFitInBox } from "@/lib/fit-items-in-box";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function makeItem(
  name: string,
  width?: number,
  height?: number,
): SimplifiedItem {
  return {
    id: name.toLowerCase(),
    name,
    shortName: name,
    basePrice: 1,
    width,
    height,
  };
}

describe("doItemsFitInBox", () => {
  test("returns true for items that fit within the default 9x6 box", () => {
    expect(
      doItemsFitInBox([
        makeItem("Alpha", 2, 2),
        makeItem("Bravo", 3, 1),
        makeItem("Charlie", 1, 2),
      ]),
    ).toBe(true);
  });

  test("defaults missing dimensions to 1x1", () => {
    expect(doItemsFitInBox([makeItem("Unknown")], 1, 1)).toBe(true);
  });

  test("returns an immediate debug failure when an item is oversized", () => {
    expect(doItemsFitInBox([makeItem("Tank Battery", 10, 2)], 9, 6, true)).toEqual(
      {
        fit: false,
        triedCount: 0,
        failReason: "Tank Battery too big",
      },
    );
  });

  test("returns placements and a filled grid in debug mode when packing succeeds", () => {
    const result = doItemsFitInBox(
      [makeItem("Alpha", 2, 2), makeItem("Bravo", 1, 1)],
      3,
      2,
      true,
    );

    expect(result).toMatchObject({
      fit: true,
      failReason: undefined,
    });
    expect(typeof result).toBe("object");
    if (typeof result === "boolean") {
      throw new Error("Expected debug result object");
    }
    expect(result.placements).toHaveLength(2);
    expect(result.grid).toEqual([
      [1, 1, 2],
      [1, 1, 0],
    ]);
    expect(result.triedCount).toBeGreaterThan(0);
  });

  test("reports no arrangement found when area exists but packing still fails", () => {
    const result = doItemsFitInBox(
      [
        makeItem("Alpha", 2, 2),
        makeItem("Bravo", 2, 2),
        makeItem("Charlie", 1, 1),
      ],
      3,
      3,
      true,
    );

    expect(result).toMatchObject({
      fit: false,
      failReason: "No arrangement found",
    });
    expect(typeof result).toBe("object");
    if (typeof result === "boolean") {
      throw new Error("Expected debug result object");
    }
    expect(result.triedCount).toBeGreaterThan(0);
    expect(result.placements).toBeUndefined();
    expect(result.grid).toBeUndefined();
  });
});
