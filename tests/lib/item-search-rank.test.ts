import { describe, expect, it } from "vitest";
import { getMatchTier, rankSearchResults } from "@/lib/item-search-rank";

describe("getMatchTier", () => {
  it("grades exact, prefix, word-prefix, substring and fuzzy matches", () => {
    expect(getMatchTier(["LEDX"], "ledx")).toBe(0);
    expect(getMatchTier(["LEDX Skin Transilluminator"], "ledx")).toBe(1);
    expect(getMatchTier(["Graphics card"], "card gra")).toBe(2);
    expect(getMatchTier(["Sledgehammer"], "edge")).toBe(3);
    expect(getMatchTier(["Sledgehammer"], "ledx")).toBe(4);
  });

  it("uses the best of several names", () => {
    expect(getMatchTier(["Moonshine bottle", "Moonshine"], "moonshine")).toBe(
      0,
    );
  });
});

describe("rankSearchResults", () => {
  const names = (item: string) => [item];

  it("orders by tier, then score, then original order", () => {
    const ranked = rankSearchResults(
      [
        { item: "Bolts box", score: 0.1 },
        { item: "Bolts", score: 0.3 },
        { item: "Box of bolts", score: 0.2 },
      ],
      "bolts",
      names,
    );
    expect(ranked).toEqual(["Bolts", "Bolts box", "Box of bolts"]);
  });

  it("drops fuzzy-only results when a plain match exists", () => {
    const ranked = rankSearchResults(
      [
        { item: "Sledgehammer", score: 0.2 },
        { item: "LEDX", score: 0.3 },
      ],
      "ledx",
      names,
    );
    expect(ranked).toEqual(["LEDX"]);
  });

  it("keeps fuzzy results for a typo with no plain match", () => {
    const ranked = rankSearchResults(
      [{ item: "LEDX", score: 0.3 }],
      "lexd",
      names,
    );
    expect(ranked).toEqual(["LEDX"]);
  });
});
