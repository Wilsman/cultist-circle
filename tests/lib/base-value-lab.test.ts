import { describe, expect, it } from "vitest";

import {
  emptyState,
  mergeStates,
  parseState,
  partsRange,
  pickFillers,
  planTest,
  solve,
  timerForTotal,
  type FillerOption,
  type LabTest,
  type Subject,
  type Timer,
} from "@/lib/base-value-lab";

const gun: Subject = {
  id: "gun",
  mode: "pve",
  name: "Test SMG Default",
  kind: "weapon",
  durability: 100,
  apiBaseValue: 41_548,
  owned: 5,
};

let n = 0;
const test = (
  qty: number,
  timer: Timer | null,
  fillers: LabTest["fillers"] = [],
  subjectId = "gun",
): LabTest => ({
  id: `t${++n}`,
  mode: "pve",
  createdAt: "2026-10-21T00:00:00.000Z",
  entries: [{ subjectId, qty }],
  fillers,
  timer,
});

const junk = (baseValue: number, available = 20, cost = 0): FillerOption => ({
  name: `Junk ${baseValue}`,
  baseValue,
  cost,
  available,
  owned: cost === 0,
});

describe("solve", () => {
  it("narrows a weapon from several stacked tests", () => {
    // Mirrors the sheet's MP5 Navy runs: 4x -> 14h, 3x -> 12h, 2x -> 8h.
    const result = solve(
      [gun],
      [test(4, "14h"), test(3, "12h"), test(2, "8h")],
    ).get("gun")!;

    expect(result.range.lo).toBeCloseTo(350_001 / 4, 0);
    expect(result.range.hi).toBeCloseTo(100_000, 0);
    expect(result.status).toBe("open");
  });

  it("subtracts known fillers", () => {
    const result = solve(
      [gun],
      [test(1, "5h", [{ name: "Junk", baseValue: 30_000, qty: 1 }])],
    ).get("gun")!;

    expect(result.range).toEqual({ lo: 20_001, hi: 70_000 });
  });

  it("only calls a value confident once each bound is backed twice", () => {
    const once = solve(
      [gun],
      [
        test(1, "5h", [{ name: "J", baseValue: 2_000, qty: 1 }]),
        test(1, "4h", [{ name: "J", baseValue: 47_000, qty: 1 }]),
      ],
    ).get("gun")!;
    // 5h says at least 48,001; 4h says at most 3,000.
    expect(once.status).toBe("conflict");

    const tests = [
      test(1, "5h", [{ name: "J", baseValue: 52_000, qty: 1 }]), // v <= 48,000
      test(1, "5h", [{ name: "J", baseValue: 7_000, qty: 1 }]), // v >= 43,001
      test(1, "5h", [{ name: "J", baseValue: 53_000, qty: 1 }]), // v <= 47,000
    ];
    const single = solve([gun], tests).get("gun")!;
    expect(single.range).toEqual({ lo: 43_001, hi: 47_000 });
    expect(single.status).toBe("needs-confirmation");

    const confirmed = solve(
      [gun],
      [...tests, test(1, "5h", [{ name: "J", baseValue: 6_500, qty: 1 }])], // v >= 43,501
    ).get("gun")!;
    expect(confirmed.confirmed.lo).toBeCloseTo(43_001, 0);
    expect(confirmed.confirmed.hi).toBeCloseTo(48_000, 0);
    expect(confirmed.status).toBe("confident");
  });

  it("flags contradicting tests and names the suspects", () => {
    const tests = [test(1, "2h"), test(1, "2h"), test(1, "5h")];
    const result = solve([gun], tests).get("gun")!;

    expect(result.status).toBe("conflict");
    expect(result.suspects).toEqual([tests[2].id]);
  });

  it("solves two unknowns tested together", () => {
    const bare: Subject = {
      ...gun,
      id: "bare",
      kind: "weapon-bare",
      name: "Bare",
    };
    const both: LabTest = {
      ...test(1, "4h"),
      entries: [
        { subjectId: "gun", qty: 1 },
        { subjectId: "bare", qty: 1 },
      ],
    };
    const results = solve([gun, bare], [test(1, "3h", [], "bare"), both]);

    expect(results.get("bare")!.range).toEqual({ lo: 10_001, hi: 25_000 });
    expect(results.get("gun")!.range).toEqual({ lo: 1, hi: 39_999 });
  });

  it("keeps an unrelated conflict from spreading", () => {
    const other: Subject = { ...gun, id: "other" };
    const results = solve(
      [gun, other],
      [test(1, "2h"), test(1, "5h"), test(1, "3h", [], "other")],
    );

    expect(results.get("gun")!.status).toBe("conflict");
    expect(results.get("other")!.status).toBe("open");
  });

  it("ignores excluded and unfinished tests", () => {
    const results = solve(
      [gun],
      [{ ...test(1, "2h"), excluded: true }, test(1, null)],
    );

    expect(results.get("gun")!.status).toBe("untested");
  });
});

describe("planTest", () => {
  it("first checks the API value with the boundary right above it", () => {
    const plan = planTest({
      subject: { ...gun, owned: 1 },
      fillers: [junk(5_000), junk(1_000), junk(500)],
    })!;

    // 41,548 + fillers should land on the 50,000 edge.
    expect(plan.boundary).toBe(50_000);
    // Within an eighth of the aim: fewer fillers beats a perfect split.
    expect(Math.abs(plan.splitAt - 41_548)).toBeLessThanOrEqual(41_548 / 8);
    expect(plan.outcomes.map((o) => o.timer)).toContain("5h");
  });

  it("bisects the remaining range", () => {
    const result = solve([gun], [test(4, "14h"), test(2, "8h")]).get("gun")!;
    const plan = planTest({
      subject: gun,
      result,
      fillers: [junk(10_000), junk(5_000), junk(1_000)],
    })!;
    const mid = (result.range.lo + result.range.hi) / 2;

    expect(Math.abs(plan.splitAt - mid)).toBeLessThan(
      (result.range.hi - result.range.lo) / 4,
    );
    expect(plan.outcomes.length).toBeGreaterThanOrEqual(2);
  });

  it("prefers owned fillers over buying", () => {
    const plan = planTest({
      subject: { ...gun, owned: 1 },
      fillers: [junk(8_452, 1, 20_000), junk(4_226, 2, 0)],
    })!;

    expect(plan.fillers.every((f) => f.owned)).toBe(true);
    expect(plan.fillerCost).toBe(0);
  });

  it("re-checks a tight but unconfirmed edge", () => {
    const tests = [
      test(1, "5h", [{ name: "J", baseValue: 52_000, qty: 1 }]),
      test(1, "5h", [{ name: "J", baseValue: 7_000, qty: 1 }]),
      test(1, "5h", [{ name: "J", baseValue: 53_000, qty: 1 }]),
    ];
    const result = solve([gun], tests).get("gun")!;
    const plan = planTest({
      subject: gun,
      result,
      fillers: [junk(1_000), junk(500), junk(5_000)],
    })!;

    expect(plan.goal).toBe("confirm-low");
    expect(plan.splitAt).toBeLessThanOrEqual(result.range.lo);
  });

  it("plans a confirmation when the range is exactly tolerance-wide", () => {
    // A 5_000-wide range leaves no confirm margin; fillers still need slack.
    const result = solve(
      [gun],
      [
        test(1, "5h", [{ name: "J", baseValue: 45_001, qty: 1 }]), // v >= 5_000
        test(1, "3h", [{ name: "J", baseValue: 15_000, qty: 1 }]), // v <= 10_000
      ],
    ).get("gun")!;
    expect(result.range.hi - result.range.lo).toBe(5_000);

    // 4_900 junk can land near the 5_000 split but never exactly on a need.
    const plan = planTest({
      subject: { ...gun, owned: 1 },
      result,
      fillers: [junk(4_900)],
    })!;

    expect(plan).not.toBeNull();
    expect(plan.goal).toBe("confirm-low");
    expect(Math.abs(plan.splitAt - 5_000)).toBeLessThanOrEqual(250);
  });

  it("gives up above 350k where timers no longer differ", () => {
    const result = solve([gun], [test(1, "6h")]).get("gun")!;

    expect(result.status).toBe("too-high");
    expect(
      planTest({ subject: gun, result, fillers: [junk(1_000)] }),
    ).toBeNull();
  });
});

describe("pickFillers", () => {
  it("hits the target within the slack using few items", () => {
    const pick = pickFillers(
      [junk(10_000), junk(3_000), junk(700)],
      23_700,
      200,
      6,
    )!;

    expect(Math.abs(pick.total - 23_700)).toBeLessThanOrEqual(200);
    expect(pick.picks.reduce((s, p) => s + p.qty, 0)).toBeLessThanOrEqual(4);
  });

  it("respects owned counts", () => {
    expect(pickFillers([junk(10_000, 1)], 20_000, 100, 5)).toBeNull();
  });
});

describe("helpers", () => {
  it("maps totals to timers", () => {
    expect(timerForTotal(10_000)).toBe("2h");
    expect(timerForTotal(10_001)).toBe("3h");
    expect(timerForTotal(410_000)).toBe("14h");
  });

  it("derives attached-part value from full and bare guns", () => {
    expect(
      partsRange({ lo: 90_000, hi: 95_000 }, { lo: 20_000, hi: 22_000 }),
    ).toEqual({
      lo: 68_000,
      hi: 75_000,
    });
  });

  it("round-trips an export and merges shared subjects", () => {
    const a = emptyState();
    a.subjects.push(gun);
    a.tests.push(test(1, "5h"));
    const b = parseState(JSON.parse(JSON.stringify(a)));
    b.subjects[0] = { ...b.subjects[0], id: "theirs" };
    b.tests = [
      { ...test(2, "8h"), entries: [{ subjectId: "theirs", qty: 2 }] },
    ];

    const merged = mergeStates(a, b);
    expect(merged.subjects).toHaveLength(1);
    expect(merged.tests).toHaveLength(2);
    expect(merged.tests[1].entries[0].subjectId).toBe("gun");
  });

  it("re-ids an imported subject whose id belongs to a different item", () => {
    const a = emptyState();
    a.subjects.push(gun);
    const b = emptyState();
    // Same id, different item: the key differs so it is not a shared subject.
    b.subjects.push({ ...gun, name: "Somebody else's gun", kind: "armour" });
    b.tests.push(test(1, "5h")); // references subjectId "gun"

    const merged = mergeStates(a, b);
    expect(merged.subjects.map((s) => s.id)).toEqual(["gun", "gun-2"]);
    expect(merged.tests[0].entries[0].subjectId).toBe("gun-2");
  });

  it("merges stash items and adopts settings still at defaults", () => {
    const a = emptyState();
    a.stash.pve.push({
      itemId: "moonshine",
      name: "Moonshine",
      baseValue: 200_000,
      count: 2,
    });
    a.settings.tolerance = 9_000; // customised locally: the import must not win

    const b = emptyState();
    b.stash.pve.push(
      { itemId: "moonshine", name: "Moonshine", baseValue: 200_000, count: 5 },
      { itemId: "vase", name: "Antique vase", baseValue: 67_800, count: 3 },
    );
    b.settings = { tolerance: 7_500, maxItems: 8 };

    const merged = mergeStates(a, b);
    expect(merged.stash.pve).toEqual([
      { itemId: "moonshine", name: "Moonshine", baseValue: 200_000, count: 2 },
      { itemId: "vase", name: "Antique vase", baseValue: 67_800, count: 3 },
    ]);
    expect(merged.settings.tolerance).toBe(9_000);
    expect(merged.settings.maxItems).toBe(8);
  });

  it("matches stash items by name when they have no item id", () => {
    const a = emptyState();
    a.stash.pve.push({ name: "Loose junk", baseValue: 1_000, count: 2 });
    const b = emptyState();
    b.stash.pve.push({ name: "Loose junk", baseValue: 1_000, count: 9 });

    expect(mergeStates(a, b).stash.pve).toHaveLength(1);
  });

  it("rejects malformed imports", () => {
    expect(() => parseState({ version: 2 })).toThrow("Unsupported");
    expect(() =>
      parseState({
        version: 1,
        subjects: [],
        tests: [{ id: "x", mode: "pve", entries: [], timer: "7h" }],
      }),
    ).toThrow("unknown timer");

    const valid = () => ({
      version: 1,
      subjects: [{ id: "s1", mode: "pve", name: "Thing" }],
      tests: [
        {
          id: "t1",
          mode: "pve",
          entries: [{ subjectId: "s1", qty: 1 }] as {
            subjectId: string;
            qty: number;
          }[],
          fillers: [] as { name: string; baseValue: number; qty: number }[],
          timer: "5h",
        },
      ],
    });

    // A negative filler value would flip a measurement's maths, and a
    // non-positive or fractional qty is meaningless.
    for (const filler of [
      { name: "J", baseValue: -50_000, qty: 1 },
      { name: "J", baseValue: 1_000, qty: 0 },
      { name: "J", baseValue: 1_000, qty: -2 },
      { name: "J", baseValue: 1_000, qty: 1.5 },
    ]) {
      const raw = valid();
      raw.tests[0].fillers = [filler];
      expect(() => parseState(raw)).toThrow("bad filler");
    }

    // Entry qty has to be a positive integer too.
    for (const qty of [0, -1, 0.5]) {
      const raw = valid();
      raw.tests[0].entries = [{ subjectId: "s1", qty }];
      expect(() => parseState(raw)).toThrow("bad entry");
    }

    // Entries must reference a subject in the same export, or a merge would
    // attach the test to an unrelated local subject sharing the id.
    const dangling = valid();
    dangling.tests[0].entries = [{ subjectId: "ghost", qty: 1 }];
    expect(() => parseState(dangling)).toThrow("unknown subject");

    // A well-formed export still parses.
    expect(parseState(valid()).tests).toHaveLength(1);
  });
});
