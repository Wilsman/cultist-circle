import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { GAME_MODE_STORAGE_KEY } from "@/lib/game-mode";
import {
  SELECTED_ITEM_IDS_STORAGE_KEY,
  SELECTED_ITEM_SLOT_COUNT,
} from "@/lib/persisted-selected-items";
import type {
  RewardValuation,
  RitualRecord,
  TrackedItemSnapshot,
} from "@/types/ritual-tracker";

export const RITUAL_DURATION_OPTIONS = [
  120, 180, 240, 300, 360, 480, 720, 840,
] as const;

export function getSuggestedRitualDurations(baseValue: number): number[] {
  if (baseValue >= 400_000) return [360, 840];
  if (baseValue >= 350_001) return [840];
  if (baseValue >= 200_001) return [720];
  if (baseValue >= 100_001) return [480];
  if (baseValue >= 50_001) return [300];
  if (baseValue >= 25_001) return [240];
  if (baseValue >= 10_001) return [180];
  return [120];
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!remainingMinutes) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function getBestTraderSellPrice(item: SimplifiedItem): number | null {
  const prices = (item.sellFor ?? [])
    .map((offer) => offer.priceRUB)
    .filter((price) => Number.isFinite(price) && price >= 0);
  return prices.length > 0 ? Math.max(...prices) : null;
}

export function snapshotSelectedItems(
  selectedItems: Array<SimplifiedItem | null>,
  inputPrices: Array<number | null>,
): TrackedItemSnapshot[] {
  const grouped = new Map<string, TrackedItemSnapshot>();

  selectedItems.forEach((item, index) => {
    if (!item) return;
    const existing = grouped.get(item.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }

    grouped.set(item.id, {
      key: item.id,
      itemId: item.id,
      name: item.name,
      shortName: item.shortName,
      iconLink: item.iconLink,
      quantity: 1,
      basePrice: Number.isFinite(item.basePrice) ? item.basePrice : null,
      lastLowPrice:
        typeof item.lastLowPrice === "number" ? item.lastLowPrice : null,
      avg24hPrice:
        typeof item.avg24hPrice === "number" ? item.avg24hPrice : null,
      traderSellPrice: getBestTraderSellPrice(item),
      inputPrice: inputPrices[index] ?? null,
      isManual: false,
    });
  });

  return Array.from(grouped.values());
}

export function calculateItemTotal(
  items: TrackedItemSnapshot[],
  value: (item: TrackedItemSnapshot) => number | null,
): number | null {
  let total = 0;
  for (const item of items) {
    const unitValue = value(item);
    if (unitValue === null || !Number.isFinite(unitValue)) return null;
    total += unitValue * item.quantity;
  }
  return total;
}

export function applyTrackedItemLineCost(
  item: TrackedItemSnapshot,
  lineCost: number | null,
): TrackedItemSnapshot {
  return {
    ...item,
    inputPrice: lineCost === null ? null : lineCost / item.quantity,
  };
}

export function getRitualRewardValue(
  ritual: RitualRecord,
  valuation: RewardValuation,
): number | null {
  return valuation === "flea"
    ? ritual.totals.rewardFleaValue
    : ritual.totals.rewardTraderValue;
}

export function isRitualReady(ritual: RitualRecord, now = Date.now()): boolean {
  return ritual.status === "active" && ritual.endsAt <= now;
}

export function getCombinationKey(ritual: RitualRecord): string {
  const items = ritual.sacrifices
    .map((item) => `${item.itemId ?? item.name.toLowerCase()}:${item.quantity}`)
    .sort()
    .join("|");
  return `${ritual.mode}:${ritual.sacredBonus}:${items}`;
}

export interface TrackerInsights {
  completedCount: number;
  pricedCount: number;
  totalInputCost: number;
  averageInputCost: number;
  totalRewardValue: number;
  netReturn: number;
  averageRoi: number | null;
  profitableRate: number | null;
  topRewards: Array<{
    key: string;
    name: string;
    shortName: string;
    iconLink?: string;
    quantity: number;
    totalValue: number;
  }>;
  combinations: Array<{
    key: string;
    ritual: RitualRecord;
    uses: number;
    averageInput: number;
    averageReward: number;
    averageNet: number;
    averageRoi: number | null;
  }>;
}

export function calculateTrackerInsights(
  records: RitualRecord[],
  valuation: RewardValuation,
): TrackerInsights {
  const completed = records.filter((record) => record.status === "completed");
  const priced = completed.filter(
    (record) =>
      record.totals.inputCost !== null &&
      getRitualRewardValue(record, valuation) !== null,
  );

  const totalInputCost = priced.reduce(
    (sum, record) => sum + (record.totals.inputCost ?? 0),
    0,
  );
  const totalRewardValue = priced.reduce(
    (sum, record) => sum + (getRitualRewardValue(record, valuation) ?? 0),
    0,
  );
  const rois = priced
    .filter((record) => (record.totals.inputCost ?? 0) > 0)
    .map((record) => {
      const input = record.totals.inputCost ?? 0;
      const reward = getRitualRewardValue(record, valuation) ?? 0;
      return ((reward - input) / input) * 100;
    });
  const profitable = priced.filter(
    (record) =>
      (getRitualRewardValue(record, valuation) ?? 0) >
      (record.totals.inputCost ?? 0),
  ).length;

  const rewards = new Map<string, TrackerInsights["topRewards"][number]>();
  for (const record of completed) {
    for (const reward of record.rewards) {
      const key = reward.itemId ?? `manual:${reward.name.toLowerCase()}`;
      const unitValue =
        valuation === "flea" ? reward.lastLowPrice : reward.traderSellPrice;
      const current = rewards.get(key) ?? {
        key,
        name: reward.name,
        shortName: reward.shortName,
        iconLink: reward.iconLink,
        quantity: 0,
        totalValue: 0,
      };
      current.quantity += reward.quantity;
      if (unitValue !== null) current.totalValue += unitValue * reward.quantity;
      rewards.set(key, current);
    }
  }

  const comboGroups = new Map<string, RitualRecord[]>();
  for (const record of completed) {
    const key = getCombinationKey(record);
    comboGroups.set(key, [...(comboGroups.get(key) ?? []), record]);
  }

  const combinations = Array.from(comboGroups.entries()).map(([key, group]) => {
    const groupPriced = group.filter(
      (record) =>
        record.totals.inputCost !== null &&
        getRitualRewardValue(record, valuation) !== null,
    );
    const input = groupPriced.reduce(
      (sum, record) => sum + (record.totals.inputCost ?? 0),
      0,
    );
    const reward = groupPriced.reduce(
      (sum, record) => sum + (getRitualRewardValue(record, valuation) ?? 0),
      0,
    );
    const averageInput = groupPriced.length ? input / groupPriced.length : 0;
    const averageReward = groupPriced.length ? reward / groupPriced.length : 0;
    return {
      key,
      ritual: group[0],
      uses: group.length,
      averageInput,
      averageReward,
      averageNet: averageReward - averageInput,
      averageRoi:
        groupPriced.length && averageInput > 0
          ? ((averageReward - averageInput) / averageInput) * 100
          : null,
    };
  });

  combinations.sort((a, b) => {
    if (a.uses !== b.uses) return b.uses - a.uses;
    return b.averageNet - a.averageNet;
  });

  return {
    completedCount: completed.length,
    pricedCount: priced.length,
    totalInputCost,
    averageInputCost: priced.length ? totalInputCost / priced.length : 0,
    totalRewardValue,
    netReturn: totalRewardValue - totalInputCost,
    averageRoi: rois.length
      ? rois.reduce((sum, roi) => sum + roi, 0) / rois.length
      : null,
    profitableRate: priced.length ? (profitable / priced.length) * 100 : null,
    topRewards: Array.from(rewards.values())
      .sort((a, b) => b.quantity - a.quantity || b.totalValue - a.totalValue)
      .slice(0, 8),
    combinations,
  };
}

export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "Ready";
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function loadRitualCombinationIntoStorage(
  ritual: RitualRecord,
  storage: Pick<Storage, "setItem">,
): Array<string | null> {
  const ids = ritual.sacrifices.flatMap((item) =>
    item.itemId
      ? Array.from({ length: item.quantity }, () => item.itemId!)
      : [],
  );
  const slots = Array.from(
    { length: SELECTED_ITEM_SLOT_COUNT },
    (_, index) => ids[index] ?? null,
  );
  storage.setItem(GAME_MODE_STORAGE_KEY, ritual.mode);
  storage.setItem(SELECTED_ITEM_IDS_STORAGE_KEY, JSON.stringify(slots));
  return slots;
}
