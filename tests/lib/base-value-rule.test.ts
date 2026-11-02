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
  compareTheories,
  fitMultiplier,
  fits,
  mainPart,
  nestedValue,
  pickTest,
  singlePartBuilds,
  type CatalogItem,
  type PricedItem,
} from "@/lib/base-value-rule";

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
    itemId: "toz-frame",
    name: "TOZ-106 20ga bolt-action shotgun",
    kind: "weapon-bare",
    apiBaseValue: 3_526,
  },
  {
    id: "toz-default",
    mode: "pve",
    itemId: "toz-preset",
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
    itemId: "toz-frame",
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

// Junk in steps of 100, 1k and 5k, all cheap to buy.
const fillers: FillerOption[] = [100, 1_000, 5_000].map((baseValue) => ({
  itemId: `junk-${baseValue}`,
  name: `Junk ${baseValue}`,
  baseValue,
  cost: baseValue,
  available: 10,
  owned: false,
}));

// The TOZ's slot tree: the grip sits on the stock, the sight on a rail on a
// dovetail mount. Parts on the gun are depth 1, parts on those depth 2, ...
const slotted = (
  id: string,
  basePrice: number,
  slots: string[][] = [],
): CatalogItem => ({
  id,
  basePrice,
  slots: slots.map((allowed, i) => ({ name: `mod_${i}`, allowed })),
});
const catalog = new Map(
  [
    {
      ...slotted("toz-frame", 3_526, [
        ["magazine"],
        ["stock"],
        ["dovetail mount"],
      ]),
      gun: true,
      // Like json.tarkov.dev, a receiver lists its factory parts.
      contains: ["magazine", "stock", "grip"],
    },
    slotted("magazine", 785),
    slotted("stock", 1_702, [["grip"]]),
    slotted("grip", 750),
    slotted("dovetail mount", 1_100, [["rail scope mount"]]),
    slotted("rail scope mount", 2_300, [["sight"]]),
    slotted("sight", 22_740),
    {
      id: "toz-preset",
      basePrice: 6_763,
      contains: ["magazine", "toz-frame", "stock", "grip"],
    },
  ].map((c) => [c.id, c]),
);

describe("Base Value Lab hidden rule", () => {
  test("nested: each part counts once more per part it hangs from", () => {
    const [bare, preset, build, mp5] = subjects;
    expect(nestedValue(bare, catalog)).toBe(3_526);
    // Frame 1×, magazine and stock 2×, grip (on the stock) 3×.
    expect(nestedValue(preset, catalog)).toBe(
      3_526 + 2 * (785 + 1_702) + 3 * 750,
    );
    // Plus the dovetail 2×, the rail 3× and the sight on it 4×.
    expect(nestedValue(build, catalog)).toBe(110_810);
    // Not in the item cache.
    expect(nestedValue(mp5, catalog)).toBeNull();
  });

  test("nested: a part that fits nowhere gives no prediction", () => {
    const odd: Subject = {
      ...subjects[2],
      build: { gunValue: 3_526, mods: [mod("sight", 22_740)] },
    };
    expect(nestedValue(odd, catalog)).toBeNull();
  });

  test("both rules are scored against the measured range", () => {
    const {
      multiplier,
      band,
      rows: theory,
    } = compareTheories(subjects, results, catalog);
    // The three tested guns share 3.28–4.78×; flat uses the middle.
    expect(band?.lo).toBeCloseTo(3.28, 1);
    expect(band?.hi).toBeCloseTo(4.78, 1);
    expect(multiplier).toBeCloseTo((3.28 + 4.78) / 2, 1);
    const toz = theory.find((r) => r.subject.id === "toz-default")!;
    expect(toz.measured).toEqual({ lo: 10_001, hi: 19_000 });
    expect(toz.parts?.multiplier).toBeDefined();
    expect(fits(toz, "nested")).toBe(true);
    expect(fits(toz, "flat")).toBe(true);
    const mp5 = theory.find((r) => r.subject.id === "mp5-default")!;
    expect(fits(mp5, "nested")).toBeNull();
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

  test("the picker splits a gun between the two predictions", () => {
    const pick = pickTest({
      subjects,
      results,
      fillers,
      skip: new Set(),
      copyCost: () => 50_000,
      catalog,
    })!;
    const { nested, flat } = pick.theory!;
    const lo = Math.min(nested, flat);
    const hi = Math.max(nested, flat);
    expect(pick.plan.splitAt).toBeGreaterThan(lo);
    expect(pick.plan.splitAt).toBeLessThan(hi);
    // One timer backs each rule.
    const backs = (v: number) =>
      pick.plan.outcomes.filter((o) => o.implies.lo <= v && v <= o.implies.hi);
    expect(backs(nested)).toHaveLength(1);
    expect(backs(flat)).toHaveLength(1);
    expect(backs(nested)[0].timer).not.toBe(backs(flat)[0].timer);
  });

  test("without slot data the picker narrows guns one at a time", () => {
    const pick = pickTest({
      subjects,
      results,
      fillers,
      skip: new Set(),
      copyCost: () => 50_000,
      catalog: new Map(),
    });
    expect(pick).not.toBeNull();
    expect(pick!.theory).toBeUndefined();
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
