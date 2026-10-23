// Plans calculator picks from market prices (flea or trader).
// Goal: the cheapest set of up to `slots` items whose base value reaches the
// threshold. Going over the threshold costs nothing in-game, so overshoot is
// never penalised and fewer items are fine.

import { planSacrifice, type OwnedItem } from "@/lib/stash-scan/optimize";
import type { TraderLevels } from "@/components/ui/trader-level-selector";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

/** Cheapest trader cash offer the player's trader levels unlock. */
export function cheapestTraderPrice(
  item: Pick<SimplifiedItem, "buyFor">,
  traderLevels: TraderLevels,
): number | undefined {
  let best: number | undefined;
  for (const offer of item.buyFor ?? []) {
    const vendor = offer.vendor?.normalizedName as
      keyof TraderLevels | undefined;
    if (!vendor) continue;
    const userLvl = traderLevels[vendor];
    if (!userLvl || userLvl < (offer.vendor?.minTraderLevel ?? 1)) continue;
    if (typeof offer.priceRUB !== "number") continue;
    if (best === undefined || offer.priceRUB < best) best = offer.priceRUB;
  }
  return best;
}

export interface MarketCandidate {
  id: string;
  /** Base value after the sacrifice bonus. */
  baseValue: number;
  /** Rouble cost to obtain one. */
  cost: number;
}

export interface MarketPlanInput {
  candidates: MarketCandidate[];
  /** Base value still needed after pinned items. */
  remaining: number;
  /** Free (unpinned) slots. */
  slots: number;
  /** Item ids to leave out (used for re-roll). */
  avoid?: ReadonlySet<string>;
  /** Pool size for the exact solver; keeps large item lists fast. */
  poolSize?: number;
}

export interface MarketPlan {
  /** Item ids, one per used slot (an id may repeat). */
  ids: string[];
  totalBaseValue: number;
  totalCost: number;
}

const DEFAULT_POOL_SIZE = 120;
const SINGLE_CLEARERS = 30;

function isUsable(c: MarketCandidate): boolean {
  return (
    Number.isFinite(c.baseValue) &&
    c.baseValue > 0 &&
    Number.isFinite(c.cost) &&
    c.cost > 0
  );
}

/**
 * Builds the solver pool: the best base-value-per-rouble items, plus the
 * cheapest items that clear the remaining value on their own (a single cheap
 * high-value item can have a modest ratio yet still be the best pick).
 */
export function marketPool(
  candidates: MarketCandidate[],
  remaining: number,
  poolSize = DEFAULT_POOL_SIZE,
): MarketCandidate[] {
  const usable = candidates.filter(isUsable);
  const byRatio = [...usable].sort(
    (a, b) => b.baseValue / b.cost - a.baseValue / a.cost || a.cost - b.cost,
  );
  const clearers = usable
    .filter((c) => c.baseValue >= remaining)
    .sort((a, b) => a.cost - b.cost)
    .slice(0, SINGLE_CLEARERS);
  const pool = new Map<string, MarketCandidate>();
  for (const c of byRatio.slice(0, poolSize)) pool.set(c.id, c);
  for (const c of clearers) pool.set(c.id, c);
  return [...pool.values()];
}

export function planFromMarket(input: MarketPlanInput): MarketPlan | null {
  const { remaining, avoid } = input;
  const slots = Math.max(0, Math.floor(input.slots));
  if (remaining <= 0) return { ids: [], totalBaseValue: 0, totalCost: 0 };
  if (!slots) return null;

  const candidates = avoid
    ? input.candidates.filter((c) => !avoid.has(c.id))
    : input.candidates;
  const pool = marketPool(candidates, remaining, input.poolSize);

  // Market items can be bought more than once, so each may fill every slot.
  const owned: OwnedItem[] = pool.map((c) => ({
    key: c.id,
    count: slots,
    baseValue: c.baseValue,
    cost: c.cost,
  }));
  const plan = planSacrifice(owned, remaining, slots);
  if (!plan) return null;
  return {
    ids: plan.picks.flatMap((pick) =>
      Array.from({ length: pick.count }, () => pick.key),
    ),
    totalBaseValue: plan.totalBaseValue,
    totalCost: plan.totalCost,
  };
}

/** Single items that reach `remaining` alone, cheapest first. */
export function singleSlotCandidates(
  candidates: MarketCandidate[],
  remaining: number,
): MarketCandidate[] {
  return candidates
    .filter((c) => isUsable(c) && c.baseValue >= remaining)
    .sort((a, b) => a.cost - b.cost || a.baseValue - b.baseValue);
}
