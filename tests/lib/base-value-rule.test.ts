import { describe, expect, test } from "vitest";
import {
  partChains,
  solve,
  type FillerOption,
  type LabTest,
  type Subject,
  type Timer,
} from "@/lib/base-value-lab";
import {
  checkRules,
  fitMultiplier,
  mainPart,
  pickTest,
  precision,
  predict,
  ruleState,
  singlePartBuilds,
  toMultiplier,
  type PricedItem,
} from "@/lib/base-value-rule";
import { partsValue } from "@/lib/base-value-site";

const mod = (name: string, baseValue: number) => ({
  itemId: name,
  name,
  baseValue,
  count: 1,
});

// Shaped like the lab's first guns: a bare TOZ, its Default preset, a TOZ
// build with a reflex sight, and an MP5 Default.
const subjects: Subject[] = [
  {
    id: "toz-bare",
    mode: "pve",
    name: "TOZ-106 20ga bolt-action shotgun",
    kind: "weapon-bare",
    apiBaseValue: 3_526,
  },
  {
    id: "toz-default",
    mode: "pve",
    name: "TOZ-106 20ga bolt-action shotgun Default",
    kind: "weapon",
    apiBaseValue: 6_763,
    frameValue: 3_526,
    parts: [
      { name: "magazine", count: 1 },
      { name: "stock", count: 1 },
      { name: "grip", count: 1 },
    ],
  },
  {
    id: "toz-build",
    mode: "pve",
    name: "TOZ-106 20ga bolt-action shotgun + sight",
    kind: "weapon",
    apiBaseValue: 32_903,
    build: {
      gunValue: 3_526,
      mods: [
        mod("magazine", 785),
        mod("stock", 1_702),
        mod("grip", 750),
        mod("dovetail mount", 1_100),
        mod("rail scope mount", 2_300),
        mod("sight", 22_740),
      ],
    },
  },
  {
    id: "mp5-default",
    mode: "pve",
    name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) Default",
    kind: "weapon",
    apiBaseValue: 41_548,
    frameValue: 12_132,
    parts: Array.from({ length: 7 }, (_, i) => ({ name: `p${i}`, count: 1 })),
  },
];

let n = 0;
const run = (
  entries: [string, number][],
  timer: Timer,
  fillers: number[] = [],
): LabTest => ({
  id: `t${n++}`,
  mode: "pve",
  createdAt: "2026-01-01T00:00:00.000Z",
  entries: entries.map(([subjectId, qty]) => ({ subjectId, qty })),
  fillers: fillers.map((baseValue, i) => ({
    name: `f${i}`,
    baseValue,
    qty: 1,
  })),
  timer,
});

const tests: LabTest[] = [
  run([["toz-bare", 1]], "2h", [5_000]),
  run([["toz-default", 1]], "3h"),
  run([["toz-default", 1]], "4h", [31_000]),
  run([["toz-build", 1]], "8h"),
  run([["mp5-default", 1]], "8h", [35_000]),
  run([["mp5-default", 4]], "14h"),
];

const results = solve(subjects, tests);
const rows = subjects.map((subject) => ({
  subject,
  value: partsValue(subject, results.get(subject.id)),
}));

// Junk in steps of 100, 1k and 5k, all cheap to buy.
const fillers: FillerOption[] = [100, 1_000, 5_000].map((baseValue) => ({
  itemId: `junk-${baseValue}`,
  name: `Junk ${baseValue}`,
  baseValue,
  cost: baseValue,
  available: 10,
  owned: false,
}));

describe("Base Value Lab hidden rule", () => {
  test("one parts multiplier fits; whole-gun and flat per-part rules don't", () => {
    const checks = new Map(checkRules(subjects, results).map((c) => [c.id, c]));
    const shared = checks.get("parts-multiplier")!;
    expect(shared.verdict).toBe("fits");
    expect(shared.used).toBe(3);
    expect(shared.range!.lo).toBeCloseTo(3.28, 2);
    expect(shared.range!.hi).toBeCloseTo(4.78, 2);
    expect(checks.get("whole-gun")!.verdict).toBe("ruled-out");
    expect(checks.get("per-part")!.verdict).toBe("ruled-out");
    expect(checks.get("by-part-type")!.verdict).toBe("cant-tell");
  });

  test("precision and predictions come from the shared range", () => {
    const state = ruleState(rows);
    expect(state.fit!.fit).toHaveLength(3);
    expect(state.precision).toBeCloseTo(0.186, 2);
    expect(state.ready).toBe(false);
    const toz = partsValue(subjects[1])!;
    expect(predict(toz, { lo: 3, hi: 4 })).toEqual({
      lo: 3_526 + 3 * 3_237,
      hi: 3_526 + 4 * 3_237,
    });
    expect(precision({ lo: 3.9, hi: 4.1 })).toBeCloseTo(0.025, 5);
  });

  test("fitMultiplier keeps the largest group of guns that agree", () => {
    const value = (lo: number, hi: number) => ({
      frame: 0,
      apiParts: 1,
      multiplier: { lo, hi },
    });
    const fit = fitMultiplier([
      { subject: subjects[1], value: value(3, 5) },
      { subject: subjects[2], value: value(4, 6) },
      { subject: subjects[3], value: value(8, 9) },
    ])!;
    expect(fit.band).toEqual({ lo: 4, hi: 5 });
    expect(fit.fit).toEqual(["toz-default", "toz-build"]);
    expect(fit.tested).toHaveLength(3);
  });

  test("a build is a single-part build when one part carries its value", () => {
    expect(mainPart(subjects[2])).toBeNull();
    const single: Subject = {
      ...subjects[2],
      build: {
        gunValue: 3_526,
        mods: [
          mod("dovetail mount", 1_100),
          mod("rail scope mount", 2_300),
          mod("sight", 22_740),
        ],
      },
    };
    expect(mainPart(single)?.name).toBe("sight");
  });

  test("single-part builds that disagree point to a multiplier by type", () => {
    const sight: Subject = {
      id: "sight-only",
      mode: "pve",
      name: "TOZ + sight",
      kind: "weapon",
      apiBaseValue: 3_526 + 22_740,
      build: { gunValue: 3_526, mods: [mod("sight", 22_740)] },
    };
    const stock: Subject = {
      id: "stock-only",
      mode: "pve",
      name: "TOZ + stock",
      kind: "weapon",
      apiBaseValue: 3_526 + 1_702,
      build: { gunValue: 3_526, mods: [mod("stock", 1_702)] },
    };
    const solved = solve(
      [sight, stock],
      [
        // Sight: 26.3k–51.5k total, so 1–2× its API value.
        run([["sight-only", 1]], "4h"),
        run([["sight-only", 1]], "4h", [3_000]),
        // Stock: 10k–25k total, so 3.8–12.6×.
        run([["stock-only", 1]], "3h"),
      ],
    );
    const check = checkRules([sight, stock], solved).find(
      (c) => c.id === "by-part-type",
    )!;
    expect(check.verdict).toBe("fits");
  });

  test("the picker aims at the middle of the shared multiplier", () => {
    const pick = pickTest({
      subjects,
      results,
      fillers,
      skip: new Set(),
      copyCost: () => 50_000,
    })!;
    expect(pick.rule).toBeDefined();
    const { band } = pick.rule!;
    const k = toMultiplier(pick.rule!, {
      lo: pick.plan.splitAt,
      hi: pick.plan.splitAt,
    }).lo;
    // The split lands well inside the band, near its middle.
    expect(k).toBeGreaterThan(band.lo + (band.hi - band.lo) * 0.25);
    expect(k).toBeLessThan(band.hi - (band.hi - band.lo) * 0.25);
    // Each timer it can show maps to a narrower multiplier range.
    expect(pick.plan.outcomes.length).toBeGreaterThanOrEqual(2);
    for (const o of pick.plan.outcomes) {
      const m = toMultiplier(pick.rule!, o.implies);
      expect(m.lo).toBeGreaterThanOrEqual(band.lo - 1e-9);
      expect(m.hi).toBeLessThanOrEqual(band.hi + 1e-9);
      expect(m.hi - m.lo).toBeLessThan(band.hi - band.lo);
    }
  });

  test("the picker falls back to single guns when the guns disagree", () => {
    const disagree = solve(subjects, [
      ...tests.filter((t) => t.entries[0].subjectId !== "toz-default"),
      // The TOZ Default under 10k means its parts count under 2×, which
      // the other two guns rule out.
      run([["toz-default", 1]], "2h"),
    ]);
    expect(
      ruleState(
        subjects.map((subject) => ({
          subject,
          value: partsValue(subject, disagree.get(subject.id)),
        })),
      ).fit!.fit,
    ).toHaveLength(2);
    const pick = pickTest({
      subjects,
      results: disagree,
      fillers,
      skip: new Set(),
      copyCost: () => 50_000,
    });
    expect(pick?.rule).toBeUndefined();
  });

  describe("single-part builds", () => {
    const item = (
      id: string,
      basePrice: number,
      slots: string[][] = [],
    ): PricedItem => ({
      id,
      name: id,
      basePrice,
      slots: slots.map((allowed, i) => ({ name: `mod_${i}`, allowed })),
    });
    // A frame with a magazine and a dovetail; the sight needs dovetail + rail.
    const gun = item("frame", 3_526, [["magazine"], ["dovetail mount"]]);
    const parts = [
      item("sight", 22_740),
      item("rail mount", 2_300, [["sight"]]),
      item("magazine", 785),
      item("dovetail mount", 1_100, [["rail mount"]]),
    ];

    test("each part's chain runs from the frame out, in any order", () => {
      const chains = partChains(gun, parts);
      expect(chains.get("sight")!.map((p) => p.id)).toEqual([
        "dovetail mount",
        "rail mount",
        "sight",
      ]);
      expect(chains.get("magazine")!.map((p) => p.id)).toEqual(["magazine"]);
    });

    test("valuable parts become builds with just the mounts they need", () => {
      const [build, ...rest] = singlePartBuilds({
        mode: "pve",
        gun,
        parts,
        existing: [],
      });
      expect(rest).toHaveLength(0);
      expect(build.build!.main).toBe("sight");
      expect(build.build!.mods.map((m) => m.itemId)).toEqual([
        "dovetail mount",
        "rail mount",
        "sight",
      ]);
      expect(build.apiBaseValue).toBe(3_526 + 1_100 + 2_300 + 22_740);
      expect(mainPart(build)?.itemId).toBe("sight");
      // Already in the lab: not suggested again.
      expect(
        singlePartBuilds({ mode: "pve", gun, parts, existing: [build] }),
      ).toEqual([]);
    });
  });
});
