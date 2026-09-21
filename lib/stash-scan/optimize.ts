// Exact bounded knapsack in the browser. Prune only states dominated by a
// cheaper state with at least as much value; never bucket distinct totals.
export interface OwnedItem {
  key: string;
  count: number;
  baseValue: number;
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
interface State {
  value: number;
  cost: number;
  previous?: State;
  pick?: SacrificePick;
}
function frontier(states: State[]): State[] {
  states.sort((a, b) => b.value - a.value || a.cost - b.cost);
  const kept: State[] = [];
  let cheapest = Infinity;
  let lastValue = Infinity;
  for (const state of states) {
    // Equal-cost alternatives may win the overshoot tie later.
    if (state.value !== lastValue && state.cost <= cheapest) {
      kept.push(state);
      cheapest = state.cost;
    }
    lastValue = state.value;
  }
  return kept;
}
export function planSacrifice(
  owned: OwnedItem[],
  threshold: number,
  maxSlots: number,
): SacrificePlan | null {
  if (threshold <= 0)
    return { picks: [], itemCount: 0, totalBaseValue: 0, totalCost: 0 };
  if (!Number.isFinite(threshold) || !Number.isFinite(maxSlots)) return null;
  const slots = Math.max(0, Math.floor(maxSlots));
  if (!slots) return null;
  let states: State[][] = Array.from({ length: slots + 1 }, () => []);
  states[0] = [{ value: 0, cost: 0 }];
  let best: State | null = null;
  let bestCount = 0;
  for (const item of owned) {
    if (
      !Number.isFinite(item.baseValue) ||
      item.baseValue <= 0 ||
      !Number.isFinite(item.cost) ||
      item.cost < 0 ||
      !Number.isFinite(item.count) ||
      item.count < 1
    )
      continue;
    const next = states.map((list) => list.slice());
    for (let count = 0; count < slots; count++) {
      for (const previous of states[count]) {
        for (
          let take = 1;
          take <= Math.min(Math.floor(item.count), slots - count);
          take++
        ) {
          const cost = previous.cost + take * item.cost;
          if (best && cost > best.cost) break;
          const candidate: State = {
            value: previous.value + take * item.baseValue,
            cost,
            previous,
            pick: { key: item.key, count: take },
          };
          if (candidate.value >= threshold) {
            if (
              !best ||
              cost < best.cost ||
              (cost === best.cost && candidate.value < best.value)
            ) {
              best = candidate;
              bestCount = count + take;
            }
            break;
          }
          if (count + take < slots) next[count + take].push(candidate);
        }
      }
    }
    states = next.map(frontier);
  }
  if (!best) return null;
  const picks: SacrificePick[] = [];
  for (let state: State | undefined = best; state?.pick; state = state.previous)
    picks.push(state.pick);
  picks.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return {
    picks,
    itemCount: bestCount,
    totalBaseValue: best.value,
    totalCost: best.cost,
  };
}
