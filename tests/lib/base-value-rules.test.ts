import { describe, expect, it } from "vitest";

import type { LabTest } from "@/lib/base-value-lab";
import {
  checkControls,
  comparePair,
  compareRanges,
  doubtfulResults,
  fitRules,
  predictRange,
  suggestExperiment,
  type Composition,
  type Observation,
} from "@/lib/base-value-rules";

const obs = (
  id: string,
  comp: Composition,
  lo: number,
  hi: number,
): Observation => ({ id, name: id, comp, range: { lo, hi } });

const byId = (fits: ReturnType<typeof fitRules>, id: string) =>
  fits.find((f) => f.id === id)!;

describe("fitRules", () => {
  // Hidden truth for these: gun body at API value, attached mods count x2.
  const smg = { gun: 12_000, mods: 30_000, modCount: 7 };
  const pistol = { gun: 5_000, mods: 4_000, modCount: 4 };
  const bare = { gun: 14_000, mods: 0, modCount: 0 };
  const data = [
    obs("smg", smg, 70_000, 74_000), // 72k
    obs("pistol", pistol, 12_000, 14_000), // 13k
    obs("bare", bare, 12_000, 16_000), // 14k
  ];

  it("keeps the true rule and pins its number", () => {
    const fits = fitRules(data, { weapons: true });
    const mods = byId(fits, "mods");

    expect(mods.verdict).toBe("fits");
    expect(mods.fitted!.lo).toBeLessThanOrEqual(2);
    expect(mods.fitted!.hi).toBeGreaterThanOrEqual(2);
    expect(mods.fitted!.hi - mods.fitted!.lo).toBeLessThan(0.2);
  });

  it("rules out the others and names what breaks them", () => {
    const fits = fitRules(data, { weapons: true });

    expect(byId(fits, "api").verdict).toBe("ruled-out");
    expect(byId(fits, "api").offenders.map((o) => o.id)).toEqual([
      "smg",
      "pistol",
    ]);
    // One multiplier can't make the bare gun ~1x and the SMG ~1.7x.
    expect(byId(fits, "whole").verdict).toBe("ruled-out");
    expect(byId(fits, "gun").verdict).toBe("ruled-out");
  });

  it("only offers the whole-item rules for armour and keys", () => {
    const fits = fitRules(
      [obs("armour", { gun: 20_000, mods: 0, modCount: 0 }, 30_000, 40_000)],
      { weapons: false },
    );

    expect(fits.map((f) => f.id)).toEqual(["api", "whole"]);
    expect(byId(fits, "whole").fitted).toEqual({ lo: 1.5, hi: 2 });
  });

  it("pins a rare-parts multiplier from the rarity-tagged value", () => {
    // Hidden truth: Rare/Superrare parts count x2, the rest at API value.
    const fits = fitRules(
      [
        // 10k API, 4k of it rare -> 14k.
        obs(
          "rare",
          { gun: 6_000, mods: 4_000, modCount: 2, rare: 4_000 },
          13_500,
          14_500,
        ),
        // Nothing rare -> stays at API value.
        obs(
          "plain",
          { gun: 8_000, mods: 2_000, modCount: 1, rare: 0 },
          9_500,
          10_500,
        ),
      ],
      { weapons: true },
    );
    const rare = byId(fits, "rare");

    expect(rare.verdict).toBe("fits");
    expect(rare.informative).toBe(1);
    expect(rare.fitted).toEqual({ lo: 1.875, hi: 2.125 });
    // A gun with no rare parts must sit at its API value.
    const broken = fitRules(
      [
        obs(
          "plain",
          { gun: 8_000, mods: 2_000, modCount: 1, rare: 0 },
          15_000,
          16_000,
        ),
      ],
      { weapons: true },
    );
    expect(byId(broken, "rare").verdict).toBe("ruled-out");
  });

  it("leaves the rarity rule out without rarity data", () => {
    const fits = fitRules(data, { weapons: true });
    expect(fits.some((f) => f.id === "rare")).toBe(false);
  });

  it("can't pin a mod multiplier from bare guns alone", () => {
    const fits = fitRules([data[2]], { weapons: true });
    const mods = byId(fits, "mods");

    expect(mods.verdict).toBe("fits");
    expect(mods.informative).toBe(0);
  });
});

describe("suggestExperiment", () => {
  it("picks the item the surviving rules disagree about most", () => {
    // Only one gun with mods measured: "mods x k" and "whole x k" both fit.
    const fits = fitRules(
      [obs("smg", { gun: 12_000, mods: 30_000, modCount: 7 }, 70_000, 74_000)],
      { weapons: true },
    );
    const open = { lo: 0, hi: Infinity };
    const s = suggestExperiment(fits, [
      {
        id: "cheap",
        name: "cheap",
        comp: { gun: 3_000, mods: 0, modCount: 0 },
        range: open,
      },
      {
        id: "bare",
        name: "bare",
        comp: { gun: 20_000, mods: 0, modCount: 0 },
        range: open,
      },
    ])!;

    // A bare 20k gun: "whole" says ~34k, "mods" says 20k.
    expect(s.candidate.id).toBe("bare");
    expect(s.spread).toBeGreaterThan(10_000);
  });

  it("skips items already measured tighter than the disagreement", () => {
    const fits = fitRules(
      [obs("smg", { gun: 12_000, mods: 30_000, modCount: 7 }, 70_000, 74_000)],
      { weapons: true },
    );
    const s = suggestExperiment(fits, [
      {
        id: "done",
        name: "done",
        comp: { gun: 20_000, mods: 0, modCount: 0 },
        range: { lo: 19_000, hi: 21_000 },
      },
    ]);

    expect(s?.candidate.id ?? null).toBe(null);
  });
});

describe("predictRange", () => {
  it("treats an unbounded parameter on a zero coefficient as no effect", () => {
    // Only a bare gun measured: the mod multiplier stays unbounded and the
    // flat bonus keeps its open range — Infinity * 0 used to give NaN.
    const fits = fitRules(
      [obs("bare", { gun: 14_000, mods: 0, modCount: 0 }, 12_000, 16_000)],
      { weapons: true },
    );
    const bare = { gun: 14_000, mods: 0, modCount: 0 };

    expect(byId(fits, "mods").fitted).toEqual({ lo: 0, hi: Infinity });
    expect(predictRange(byId(fits, "mods"), bare)).toEqual({
      lo: 14_000,
      hi: 14_000,
    });
    expect(predictRange(byId(fits, "flat"), bare)).toEqual({
      lo: 14_000,
      hi: 14_000,
    });
    // On a modded gun the same open flat rule is still genuinely open.
    expect(
      predictRange(byId(fits, "flat"), {
        gun: 14_000,
        mods: 6_000,
        modCount: 2,
      }),
    ).toEqual({ lo: 0, hi: Infinity });
  });

  it("spans the fitted parameter", () => {
    const fits = fitRules(
      [obs("a", { gun: 10_000, mods: 10_000, modCount: 2 }, 30_000, 40_000)],
      { weapons: true },
    );

    expect(
      predictRange(byId(fits, "mods"), {
        gun: 5_000,
        mods: 1_000,
        modCount: 1,
      }),
    ).toEqual({
      lo: 7_000,
      hi: 8_000,
    });
  });
});

describe("doubtfulResults", () => {
  it("flags single-test results that break most rules", () => {
    const smg = { gun: 12_000, mods: 30_000, modCount: 7 };
    const fits = fitRules(
      [
        obs("smg", smg, 70_000, 74_000),
        obs("smg2", { ...smg, gun: 13_000 }, 71_000, 75_000),
        obs("pistol", { gun: 5_000, mods: 4_000, modCount: 4 }, 12_000, 14_000),
        // A misread timer: way below every rule.
        obs("odd", { gun: 30_000, mods: 20_000, modCount: 3 }, 0, 10_000),
      ],
      { weapons: true },
    );
    const tests: Record<string, number> = {
      smg: 3,
      smg2: 2,
      pistol: 2,
      odd: 1,
    };

    expect(doubtfulResults(fits, (id) => tests[id]).map((d) => d.id)).toEqual([
      "odd",
    ]);
  });
});

describe("comparePair", () => {
  const comp = { gun: 12_000, mods: 30_000, modCount: 7 };

  it("puts the extra in the mods when the bare gun matches the API", () => {
    const c = comparePair(
      { lo: 11_000, hi: 13_000 },
      { lo: 70_000, hi: 74_000 },
      comp,
    );

    expect(c.finding).toBe("mods-extra");
    expect(c.modsValue).toEqual({ lo: 57_000, hi: 63_000 });
  });

  it("puts the extra in the gun when the mods add their loose value", () => {
    const c = comparePair(
      { lo: 30_000, hi: 32_000 },
      { lo: 60_000, hi: 62_000 },
      comp,
    );

    expect(c.finding).toBe("gun-extra");
  });

  it("stays unclear while the ranges are wide", () => {
    const c = comparePair(
      { lo: 10_001, hi: 25_000 },
      { lo: 25_001, hi: 50_000 },
      comp,
    );

    expect(c.finding).toBe("unclear");
  });
});

describe("compareRanges", () => {
  it("tells different, same and unclear apart", () => {
    expect(compareRanges({ lo: 0, hi: 10 }, { lo: 20, hi: 30 }, 5)).toBe(
      "different",
    );
    expect(compareRanges({ lo: 0, hi: 8 }, { lo: 2, hi: 9 }, 5)).toBe("same");
    expect(compareRanges({ lo: 0, hi: 100 }, { lo: 2, hi: 9 }, 5)).toBe(
      "unclear",
    );
  });
});

describe("checkControls", () => {
  const control = (value: number, timer: LabTest["timer"]): LabTest => ({
    id: `c${value}`,
    mode: "pve",
    createdAt: "2026-10-21T00:00:00.000Z",
    entries: [],
    fillers: [{ name: "Junk", baseValue: value, qty: 1 }],
    timer,
  });

  it("checks known-only tests against the expected timer", () => {
    const checks = checkControls([
      control(10_400, "3h"),
      control(9_600, "3h"),
      control(9_000, null),
    ]);

    expect(checks).toEqual([
      { testId: "c10400", total: 10_400, expected: "3h", got: "3h", ok: true },
      { testId: "c9600", total: 9_600, expected: "2h", got: "3h", ok: false },
    ]);
  });
});
