// Plans calculator picks out of the persisted stash inventory.

import {
  selectedCounts,
  type StashInventory,
} from "@/lib/stash-inventory";
import {
  planSacrifice,
  type OwnedItem,
  type SacrificePlan,
} from "@/lib/stash-scan/optimize";
import {
  sacrificeBaseValue,
  valueGivenUp,
  type PricingSettings,
} from "@/lib/stash-scan/owned-items";
import { isItemNameExcluded } from "@/lib/excluded-item-names";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

export interface StashPlanInput {
  inventory: StashInventory;
  itemsById: Map<string, SimplifiedItem>;
  selectedItems: Array<SimplifiedItem | null>;
  pinnedItems: boolean[];
  slotCount: number;
  threshold: number;
  pricing: PricingSettings;
  /** The calculator's excludedItems set; holds item names as stored. */
  excludedNames: ReadonlySet<string>;
  ignoreFilters: boolean;
  /** Item ids to leave out (used for re-roll). */
  avoid?: ReadonlySet<string>;
}

export interface StashPlanResult {
  slots: Array<SimplifiedItem | null>;
  plan: SacrificePlan;
  totalBaseValue: number;
}

type OwnedInput = Omit<
  StashPlanInput,
  "pinnedItems" | "selectedItems" | "slotCount" | "threshold"
> & { reserved?: Map<string, number> };

export function ownedFromInventory(input: OwnedInput): OwnedItem[] {
  const owned: OwnedItem[] = [];
  if (input.ignoreFilters) {
    for (const [itemId, entry] of Object.entries(input.inventory.items)) {
      const item = input.itemsById.get(itemId);
      if (!item) continue;
      const count = entry.count - (input.reserved?.get(itemId) ?? 0);
      if (count <= 0) continue;
      owned.push({
        key: itemId,
        count,
        baseValue: sacrificeBaseValue(item, input.pricing.itemBonus),
        cost: valueGivenUp(item, input.pricing),
      });
    }
    return owned;
  }
  const excludedLower = new Set(
    [...input.excludedNames].map((name) => name.toLowerCase()),
  );
  for (const [itemId, entry] of Object.entries(input.inventory.items)) {
    if (entry.keep) continue;
    const item = input.itemsById.get(itemId);
    if (!item) continue;
    if (isItemNameExcluded(item, excludedLower)) continue;
    if (input.avoid?.has(itemId)) continue;
    const count = entry.count - (input.reserved?.get(itemId) ?? 0);
    if (count <= 0) continue;
    owned.push({
      key: itemId,
      count,
      baseValue: sacrificeBaseValue(item, input.pricing.itemBonus),
      cost: valueGivenUp(item, input.pricing),
    });
  }
  return owned;
}

export function planFromStash(input: StashPlanInput): StashPlanResult | null {
  const { selectedItems, pinnedItems, slotCount, threshold, pricing } = input;

  const isPinned = (i: number) =>
    i < slotCount && Boolean(pinnedItems[i] && selectedItems[i]);
  const pinnedIds = selectedItems
    .map((item, i) => (isPinned(i) ? item : null))
    .filter((item): item is SimplifiedItem => Boolean(item));
  const pinnedTotal = pinnedIds.reduce(
    (sum, item) => sum + sacrificeBaseValue(item, pricing.itemBonus),
    0,
  );
  const remaining = Math.max(0, threshold - pinnedTotal);
  const slotsLeft = slotCount - pinnedIds.length;

  if (remaining === 0) {
    return {
      slots: [...selectedItems],
      plan: { picks: [], itemCount: 0, totalBaseValue: 0, totalCost: 0 },
      totalBaseValue: pinnedTotal,
    };
  }
  if (slotsLeft <= 0) return null;

  const reserved = new Map<string, number>();
  for (const item of pinnedIds) {
    reserved.set(item.id, (reserved.get(item.id) ?? 0) + 1);
  }
  const owned = ownedFromInventory({ ...input, reserved });
  const plan = planSacrifice(owned, remaining, slotsLeft);
  if (!plan) return null;

  const slots: Array<SimplifiedItem | null> = [...selectedItems];
  while (slots.length < Math.max(selectedItems.length, 5)) slots.push(null);
  const pickIds = plan.picks.flatMap((pick) =>
    Array.from({ length: pick.count }, () => pick.key),
  );
  let next = 0;
  for (let i = 0; i < slotCount; i++) {
    if (isPinned(i)) continue;
    const itemId = pickIds[next++];
    slots[i] = itemId ? (input.itemsById.get(itemId) ?? null) : null;
  }
  return { slots, plan, totalBaseValue: pinnedTotal + plan.totalBaseValue };
}

/** Sum of the best `slotsLeft` unit base values in the stash. */
export function bestReachableFromStash(
  owned: OwnedItem[],
  slotsLeft: number,
): number {
  const units = owned
    .flatMap((o) =>
      Array.from({ length: Math.min(o.count, slotsLeft) }, () => o.baseValue),
    )
    .sort((a, b) => b - a);
  return units.slice(0, slotsLeft).reduce((sum, value) => sum + value, 0);
}

export function suggestFromStash(
  input: StashPlanInput & { slotIndex: number },
): SimplifiedItem[] {
  const { selectedItems, slotCount, threshold, pricing, itemsById, slotIndex } =
    input;

  const otherTotal = selectedItems.reduce(
    (sum, item, i) =>
      i === slotIndex || i >= slotCount || !item
        ? sum
        : sum + sacrificeBaseValue(item, pricing.itemBonus),
    0,
  );
  const need = Math.max(0, threshold - otherTotal);
  const reserved = selectedCounts(selectedItems, slotCount);
  const owned = ownedFromInventory({ ...input, reserved });
  const ownedItems = owned
    .map((o) => itemsById.get(o.key))
    .filter((item): item is SimplifiedItem => Boolean(item));

  const byCost = [...owned].sort((a, b) => a.cost - b.cost);
  if (need === 0) {
    return byCost
      .slice(0, 3)
      .map((o) => itemsById.get(o.key))
      .filter((item): item is SimplifiedItem => Boolean(item));
  }

  const emptySlots = selectedItems
    .slice(0, slotCount)
    .filter((item) => !item).length;
  const singleKey = byCost.find((o) => o.baseValue >= need)?.key;
  const plan = planSacrifice(owned, need, Math.max(1, emptySlots));
  const planItems = (plan?.picks ?? [])
    .map((pick) => itemsById.get(pick.key))
    .filter((item): item is SimplifiedItem => Boolean(item));

  const out: SimplifiedItem[] = [];
  const single = singleKey ? itemsById.get(singleKey) : undefined;
  if (single) out.push(single);
  for (const item of planItems) {
    if (out.length >= 3) break;
    if (single && item.id === single.id) continue;
    if (out.some((o) => o.id === item.id)) continue;
    out.push(item);
  }
  if (out.length === 0) {
    return ownedItems
      .sort((a, b) => b.basePrice - a.basePrice)
      .slice(0, 3);
  }
  return out;
}
