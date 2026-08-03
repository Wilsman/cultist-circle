import { describe, expect, test, vi, beforeEach } from "vitest";

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  generateShareableCode,
  parseShareableCode,
  loadItemsFromCode,
} from "@/lib/share-utils";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function makeItem(
  id: string,
  overrides: Partial<SimplifiedItem> = {},
): SimplifiedItem {
  return {
    id,
    name: overrides.name ?? `Item ${id}`,
    shortName: overrides.shortName ?? id.slice(0, 4),
    basePrice: overrides.basePrice ?? 1000,
    lastLowPrice: overrides.lastLowPrice,
    ...overrides,
  };
}

describe("share-utils", () => {
  beforeEach(() => {
    toastMock.mockClear();
  });

  test("generates compact codes and parses them back to short ids", () => {
    const code = generateShareableCode(
      [makeItem("abcdefgh1234"), null, makeItem("ijklmnop9876")],
      "pve",
    );

    expect(code).not.toBe("");
    expect(parseShareableCode(code)).toEqual({
      itemIds: ["abcdefgh", "ijklmnop"],
      gameMode: "pve",
    });
  });

  test("rejects invalid base64 input", () => {
    expect(parseShareableCode("not-a-valid-code!")).toEqual({
      itemIds: [],
      gameMode: null,
      error: "Invalid code format",
    });
  });

  test("loads matching items from a share code and normalizes numeric fields", () => {
    const code = generateShareableCode(
      [
        makeItem("abcdefgh1234", {
          name: "Alpha",
          basePrice: 12345,
          lastLowPrice: 45678,
        }),
        makeItem("ijklmnop9876", {
          name: "Bravo",
          basePrice: undefined as unknown as number,
          lastLowPrice: undefined,
        }),
      ],
      "pvp",
    );

    const result = loadItemsFromCode(code, [
      makeItem("abcdefgh1234", {
        name: "Alpha",
        basePrice: 12345,
        lastLowPrice: 45678,
      }),
      makeItem("ijklmnop9876", {
        name: "Bravo",
        basePrice: undefined as unknown as number,
        lastLowPrice: undefined,
      }),
      makeItem("qrstuvwx0000", { name: "Ignored" }),
    ]);

    expect(result.gameMode).toBe("pvp");
    expect(result.items).toHaveLength(5);
    expect(result.items?.[0]).toMatchObject({
      id: "abcdefgh1234",
      name: "Alpha",
      basePrice: 12345,
      lastLowPrice: 45678,
    });
    expect(result.items?.[1]).toMatchObject({
      id: "ijklmnop9876",
      name: "Bravo",
      basePrice: 0,
      lastLowPrice: 0,
    });
    expect(result.items?.slice(2)).toEqual([null, null, null]);
    expect(toastMock).toHaveBeenCalledWith("Items Loaded", {
      description: "Items have been loaded from the shared code.",
    });
  });

  test("returns null items and shows a toast for invalid codes", () => {
    const result = loadItemsFromCode("bad!", [makeItem("abcdefgh1234")]);

    expect(result).toEqual({ items: null, gameMode: null });
    expect(toastMock).toHaveBeenCalledWith("Invalid Code", {
      description: "The code format is invalid. Please check and try again.",
    });
  });

  test("round-trips Season codes without changing legacy mode markers", () => {
    const seasonCode = generateShareableCode(
      [makeItem("abcdefgh1234")],
      "season",
    );

    expect(atob(seasonCode)).toBe("s:abcdefgh");
    expect(parseShareableCode(seasonCode)).toEqual({
      itemIds: ["abcdefgh"],
      gameMode: "season",
    });
    expect(parseShareableCode(btoa("v:abcdefgh"))).toMatchObject({
      gameMode: "pvp",
    });
    expect(parseShareableCode(btoa("p:abcdefgh"))).toMatchObject({
      gameMode: "pve",
    });
  });
});
