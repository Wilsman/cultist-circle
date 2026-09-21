import { planSacrifice, type OwnedItem } from "@/lib/stash-scan/optimize";
import { describe, expect, it } from "vitest";

/** Exhaustive search over every multiset of at most `slots` units. */
function bruteForce(owned: OwnedItem[], threshold: number, slots: number) {
  let best: { cost: number; base: number } | null = null;
  const counts = owned.map(() => 0);
  const visit = (index: number, used: number, base: number, cost: number) => {
    if (base >= threshold && used > 0) {
      if (
        !best ||
        cost < best.cost - 1e-9 ||
        (Math.abs(cost - best.cost) < 1e-9 && base < best.base)
      ) {
        best = { cost, base };
      }
    }
    if (index === owned.length || used === slots) return;
    for (let k = 0; k <= Math.min(owned[index].count, slots - used); k++) {
      counts[index] = k;
      visit(
        index + 1,
        used + k,
        base + k * owned[index].baseValue,
        cost + k * owned[index].cost,
      );
    }
    counts[index] = 0;
  };
  visit(0, 0, 0, 0);
  return best as { cost: number; base: number } | null;
}

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("planSacrifice", () => {
  it("prefers the cheapest items that still reach the threshold", () => {
    const plan = planSacrifice(
      [
        { key: "graphics-card", count: 1, baseValue: 400000, cost: 1500000 },
        { key: "junk", count: 5, baseValue: 90000, cost: 20000 },
      ],
      400000,
      5,
    );
    expect(plan).not.toBeNull();
    expect(plan!.picks).toEqual([{ key: "junk", count: 5 }]);
    expect(plan!.totalBaseValue).toBe(450000);
    expect(plan!.totalCost).toBe(100000);
  });

  it("never uses more of an item than the stash holds", () => {
    const plan = planSacrifice(
      [
        { key: "a", count: 1, baseValue: 200000, cost: 1000 },
        { key: "b", count: 3, baseValue: 150000, cost: 50000 },
      ],
      400000,
      5,
    );
    expect(plan!.picks).toEqual([
      { key: "b", count: 2 },
      { key: "a", count: 1 },
    ]);
  });

  it("respects the slot limit and reports impossible plans", () => {
    const owned = [{ key: "a", count: 10, baseValue: 50000, cost: 1 }];
    expect(planSacrifice(owned, 400000, 5)).toBeNull();
    expect(planSacrifice(owned, 250000, 5)!.itemCount).toBe(5);
  });

  it("matches exhaustive search on random stashes", () => {
    const random = seeded(42);
    for (let round = 0; round < 150; round++) {
      const owned: OwnedItem[] = Array.from(
        { length: 2 + Math.floor(random() * 6) },
        (_, i) => ({
          key: `item-${i}`,
          count: 1 + Math.floor(random() * 3),
          // Non-rounded values exercise the former bucket collisions.
          baseValue: 1 + Math.floor(random() * 200000),
          cost: Math.floor(random() * 300000),
        }),
      );
      const threshold = 100 * (1000 + Math.floor(random() * 3000));
      const slots = 1 + Math.floor(random() * 5);

      const plan = planSacrifice(owned, threshold, slots);
      const expected = bruteForce(owned, threshold, slots);
      if (!expected) {
        expect(plan).toBeNull();
        continue;
      }
      expect(plan).not.toBeNull();
      expect(plan!.totalBaseValue).toBeGreaterThanOrEqual(threshold);
      expect(plan!.itemCount).toBeLessThanOrEqual(slots);
      expect(plan!.totalCost).toBe(expected.cost);
      expect(plan!.totalBaseValue).toBe(expected.base);
      const pickedValue = plan!.picks.reduce(
        (sum, pick) =>
          sum + pick.count * owned.find((o) => o.key === pick.key)!.baseValue,
        0,
      );
      expect(pickedValue).toBe(plan!.totalBaseValue);
      for (const pick of plan!.picks) {
        const item = owned.find((o) => o.key === pick.key)!;
        expect(pick.count).toBeLessThanOrEqual(item.count);
      }
    }
  });
});

it("keeps the higher-valued partial plan needed for the cheapest sacrifice", () => {
  const plan = planSacrifice(
    [
      { key: "higher", count: 1, baseValue: 200049, cost: 20000 },
      { key: "cheaper", count: 1, baseValue: 200001, cost: 19999 },
      { key: "filler", count: 1, baseValue: 199951, cost: 1 },
    ],
    400000,
    2,
  );
  expect(plan?.totalCost).toBe(20001);
  expect(plan?.totalBaseValue).toBe(400000);
});

it("only uses overshoot to break equal costs", () => {
  expect(
    planSacrifice(
      [
        { key: "cheap", count: 1, baseValue: 900000, cost: 100 },
        { key: "near", count: 1, baseValue: 400000, cost: 101 },
      ],
      400000,
      1,
    )?.picks,
  ).toEqual([{ key: "cheap", count: 1 }]);
});
