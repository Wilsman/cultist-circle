import { describe, expect, it } from "vitest";

import {
  clampSacrificeSlotCount,
  DEFAULT_SACRIFICE_SLOTS,
  parseSacrificeSlotCount,
} from "@/lib/sacrifice-slots";

describe("sacrifice slots", () => {
  it("defaults to 5 sacrifices", () => {
    expect(DEFAULT_SACRIFICE_SLOTS).toBe(5);
  });

  it("clamps the slot count to 1-5", () => {
    expect(clampSacrificeSlotCount(3)).toBe(3);
    expect(clampSacrificeSlotCount(0)).toBe(1);
    expect(clampSacrificeSlotCount(-2)).toBe(1);
    expect(clampSacrificeSlotCount(6)).toBe(5);
    expect(clampSacrificeSlotCount(99)).toBe(5);
    expect(clampSacrificeSlotCount(Number.NaN)).toBe(5);
  });

  it("parses the persisted slot count", () => {
    expect(parseSacrificeSlotCount(null)).toBe(5);
    expect(parseSacrificeSlotCount("3")).toBe(3);
    expect(parseSacrificeSlotCount("1")).toBe(1);
    expect(parseSacrificeSlotCount("0")).toBe(1);
    expect(parseSacrificeSlotCount("9")).toBe(5);
    expect(parseSacrificeSlotCount("nope")).toBe(5);
  });
});
