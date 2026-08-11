import type { GameMode } from "@/lib/game-mode";

export const RITUAL_TRACKER_SCHEMA_VERSION = 1 as const;

export type RitualStatus = "active" | "completed" | "cancelled";
export type RewardValuation = "flea" | "trader";
export type RitualInputPriceSource =
  "lastLowPrice" | "avg24hPrice" | "trader" | "manual";

export interface TrackedItemSnapshot {
  key: string;
  itemId: string | null;
  name: string;
  shortName: string;
  iconLink?: string;
  quantity: number;
  basePrice: number | null;
  lastLowPrice: number | null;
  avg24hPrice: number | null;
  traderSellPrice: number | null;
  inputPrice: number | null;
  isManual: boolean;
}

export interface RitualTotals {
  baseValue: number;
  inputCost: number | null;
  rewardFleaValue: number | null;
  rewardTraderValue: number | null;
}

export interface RitualRecord {
  schemaVersion: typeof RITUAL_TRACKER_SCHEMA_VERSION;
  id: string;
  mode: GameMode;
  status: RitualStatus;
  startedAt: number;
  endsAt: number;
  durationMinutes: number;
  completedAt: number | null;
  cancelledAt: number | null;
  notificationSentAt: number | null;
  sacredBonus: number;
  inputPriceSource: RitualInputPriceSource;
  sacrifices: TrackedItemSnapshot[];
  rewards: TrackedItemSnapshot[];
  totals: RitualTotals;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface TrackerBackup {
  format: "cultist-circle-ritual-tracker";
  version: typeof RITUAL_TRACKER_SCHEMA_VERSION;
  exportedAt: string;
  rituals: RitualRecord[];
}
