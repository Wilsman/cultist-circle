// Picks which owned items to sacrifice.
//
// Bounded knapsack over at most `maxSlots` items: reach `threshold` total base
// value while giving up as little market value as possible.
//
// The table is indexed by item count and by total base value in buckets of
// roughly threshold / MAX_BUCKETS roubles, with one extra bucket for "at least
// the threshold". Each state also carries the exact rouble total of its best
// path, so reaching the threshold is decided on real values and never on
// rounded ones. Two paths that land in the same bucket keep only the cheaper,
// which can at worst miss a plan that needed less than one bucket more.

export interface OwnedItem {
  /** Caller's identifier, returned in the picks. */
  key: string;
  count: number;
  /** Base value per unit, bonuses already applied. */
  baseValue: number;
  /** Market value given up per unit (flea or trader sell price). */
  cost: number;
}

export interface SacrificePick {
  key: string;
  count: number;
}

export interface SacrificePlan {
  picks: SacrificePick[];
  itemCount: number;
  totalBaseValue: number;
  totalCost: number;
}

const MAX_BUCKETS = 8000;
/**
 * Tie-breaker: one rouble of cost per this much base value, so that among
 * equally cheap options the one overshooting the threshold least wins.
 */
const OVERSHOOT_PENALTY = 0.001;

export function planSacrifice(
  owned: OwnedItem[],
  threshold: number,
  maxSlots: number,
): SacrificePlan | null {
  const slots = Math.max(0, Math.floor(maxSlots));
  if (threshold <= 0) {
    return { picks: [], itemCount: 0, totalBaseValue: 0, totalCost: 0 };
  }
  const usable = owned.filter(
    (o) => o.count > 0 && o.baseValue > 0 && Number.isFinite(o.cost) && o.cost >= 0,
  );
  if (slots === 0 || usable.length === 0) return null;

  const bucket = Math.max(1, Math.ceil(threshold / MAX_BUCKETS));
  const reached = Math.floor((threshold - 1) / bucket) + 1;
  const width = reached + 1;
  const states = (slots + 1) * width;
  const keyOf = (total: number) => (total >= threshold ? reached : Math.floor(total / bucket));

  let cost = new Float64Array(states).fill(Infinity);
  let total = new Float64Array(states);
  cost[0] = 0;
  // choice[i][state]: how many of item i the best path to `state` uses.
  const choice: Uint8Array[] = [];

  for (const item of usable) {
    const nextCost = cost.slice();
    const nextTotal = total.slice();
    const picked = new Uint8Array(states);
    const unitCost = item.cost + item.baseValue * OVERSHOOT_PENALTY;
    const maxTake = Math.min(item.count, slots);

    for (let c = 0; c < slots; c++) {
      for (let v = 0; v < width; v++) {
        const from = c * width + v;
        const base = cost[from];
        if (base === Infinity) continue;
        for (let k = 1; k <= maxTake && c + k <= slots; k++) {
          const newTotal = total[from] + k * item.baseValue;
          const state = (c + k) * width + keyOf(newTotal);
          const candidate = base + k * unitCost;
          const current = nextCost[state];
          // On equal cost, keep the higher total below the threshold (it is
          // closer to reaching it) and the lower one above it (less waste).
          const better =
            candidate < current - 1e-9 ||
            (Math.abs(candidate - current) <= 1e-9 &&
              (state % width === reached
                ? newTotal < nextTotal[state]
                : newTotal > nextTotal[state]));
          if (better) {
            nextCost[state] = candidate;
            nextTotal[state] = newTotal;
            picked[state] = k;
          }
        }
      }
    }
    cost = nextCost;
    total = nextTotal;
    choice.push(picked);
  }

  let bestState = -1;
  for (let c = 1; c <= slots; c++) {
    const state = c * width + reached;
    if (cost[state] === Infinity) continue;
    if (bestState < 0 || cost[state] < cost[bestState] - 1e-9) bestState = state;
  }
  if (bestState < 0) return null;

  // Step back through the items, undoing each recorded choice.
  const picks: SacrificePick[] = [];
  let state = bestState;
  let remaining = total[bestState];
  let itemCount = 0;
  let totalCost = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    const k = choice[i][state];
    if (!k) continue;
    const item = usable[i];
    picks.push({ key: item.key, count: k });
    itemCount += k;
    totalCost += k * item.cost;
    remaining -= k * item.baseValue;
    state = (Math.floor(state / width) - k) * width + keyOf(remaining);
  }

  picks.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { picks, itemCount, totalBaseValue: total[bestState], totalCost };
}
