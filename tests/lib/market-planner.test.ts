import { describe, expect, it } from "vitest";

import {
  cheapestTraderPrice,
  planFromMarket,
  singleSlotCandidates,
  type MarketCandidate,
} from "@/lib/market-planner";
import type { TraderLevels } from "@/components/ui/trader-level-selector";
import type { TraderBuyOffer } from "@/types/SimplifiedItem";

const item = (
  id: string,
  baseValue: number,
  cost: number,
): MarketCandidate => ({
  id,
  baseValue,
  cost,
});

describe("planFromMarket", () => {
  it("picks one cheap item far above the threshold over a pricier exact fit", () => {
    const plan = planFromMarket({
      candidates: [
        item("exact-a", 200_000, 150_000),
        item("exact-b", 200_000, 150_000),
        item("overshoot", 1_000_000, 50_000),
      ],
      remaining: 400_000,
      slots: 5,
    });

    expect(plan?.ids).toEqual(["overshoot"]);
    expect(plan?.totalCost).toBe(50_000);
    expect(plan?.totalBaseValue).toBe(1_000_000);
  });

  it("treats the slot count as a maximum, not a target", () => {
    const plan = planFromMarket({
      candidates: [item("small", 80_000, 10_000), item("big", 410_000, 30_000)],
      remaining: 400_000,
      slots: 5,
    });

    expect(plan?.ids).toEqual(["big"]);
  });

  it("finds a cheap clearer even when its value-per-rouble ranks outside the pool", () => {
    const filler = Array.from({ length: 50 }, (_, i) =>
      item(`filler-${i}`, 50_000, 5_000),
    );
    const plan = planFromMarket({
      candidates: [...filler, item("clearer", 450_000, 60_000)],
      remaining: 400_000,
      slots: 1,
      poolSize: 10,
    });

    expect(plan?.ids).toEqual(["clearer"]);
  });

  it("can repeat an item across slots", () => {
    const plan = planFromMarket({
      candidates: [
        item("cheap", 200_000, 20_000),
        item("pricey", 400_000, 90_000),
      ],
      remaining: 400_000,
      slots: 3,
    });

    expect(plan?.ids).toEqual(["cheap", "cheap"]);
    expect(plan?.totalCost).toBe(40_000);
  });

  it("skips avoided items on re-roll", () => {
    const plan = planFromMarket({
      candidates: [
        item("best", 500_000, 10_000),
        item("next", 450_000, 20_000),
      ],
      remaining: 400_000,
      slots: 2,
      avoid: new Set(["best"]),
    });

    expect(plan?.ids).toEqual(["next"]);
  });

  it("returns null when the slots cannot reach the threshold", () => {
    expect(
      planFromMarket({
        candidates: [item("a", 100_000, 10_000)],
        remaining: 400_000,
        slots: 2,
      }),
    ).toBeNull();
  });
});

describe("singleSlotCandidates", () => {
  it("lists every item that clears the rest, cheapest first, with no upper cap", () => {
    const list = singleSlotCandidates(
      [
        item("too-small", 100_000, 1_000),
        item("near", 402_000, 80_000),
        item("huge", 2_000_000, 40_000),
      ],
      400_000,
    );

    expect(list.map((c) => c.id)).toEqual(["huge", "near"]);
  });
});

describe("cheapestTraderPrice", () => {
  const levels: TraderLevels = {
    prapor: 4,
    therapist: 4,
    skier: 4,
    peacekeeper: 1,
    mechanic: 4,
    ragman: 4,
    jaeger: 4,
  } as TraderLevels;

  const offer = (
    normalizedName: string,
    minTraderLevel: number,
    priceRUB: number,
  ): TraderBuyOffer =>
    ({
      priceRUB,
      vendor: { normalizedName, minTraderLevel },
    }) as TraderBuyOffer;

  it("uses the lowest unlocked offer", () => {
    expect(
      cheapestTraderPrice(
        {
          buyFor: [
            offer("prapor", 2, 90_000),
            offer("skier", 3, 60_000),
            offer("peacekeeper", 4, 10_000),
          ],
        },
        levels,
      ),
    ).toBe(60_000);
  });

  it("returns undefined when nothing is unlocked", () => {
    expect(
      cheapestTraderPrice(
        { buyFor: [offer("peacekeeper", 4, 10_000)] },
        levels,
      ),
    ).toBeUndefined();
  });
});
