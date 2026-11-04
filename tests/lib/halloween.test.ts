import { describe, expect, it } from "vitest";
import { BUCKET_CURSOR_CSS, isHalloweenSeason } from "@/lib/halloween";

describe("isHalloweenSeason", () => {
  it("is on from 1 October to 10 November", () => {
    expect(isHalloweenSeason(new Date(2026, 9, 1))).toBe(true);
    expect(isHalloweenSeason(new Date(2026, 9, 31))).toBe(true);
    expect(isHalloweenSeason(new Date(2026, 10, 10, 23, 59))).toBe(true);
  });

  it("is off outside the season", () => {
    expect(isHalloweenSeason(new Date(2026, 8, 30))).toBe(false);
    expect(isHalloweenSeason(new Date(2026, 10, 11))).toBe(false);
    expect(isHalloweenSeason(new Date(2026, 11, 25))).toBe(false);
  });
});

describe("BUCKET_CURSOR_CSS", () => {
  it("is a data-URI cursor with a hotspot and fallback", () => {
    expect(BUCKET_CURSOR_CSS).toMatch(/^url\("data:image\/svg\+xml,%3Csvg.*"\) 16 5, auto$/);
  });
});
