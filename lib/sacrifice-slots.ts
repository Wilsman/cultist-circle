export const MAX_SACRIFICE_SLOTS = 5;
export const MIN_SACRIFICE_SLOTS = 1;
export const DEFAULT_SACRIFICE_SLOTS = 5;
export const SACRIFICE_SLOT_COUNT_KEY = "sacrificeSlotCount";

export function clampSacrificeSlotCount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SACRIFICE_SLOTS;
  }
  return Math.min(
    MAX_SACRIFICE_SLOTS,
    Math.max(MIN_SACRIFICE_SLOTS, Math.floor(value)),
  );
}

export function parseSacrificeSlotCount(storedValue: string | null): number {
  if (!storedValue) {
    return DEFAULT_SACRIFICE_SLOTS;
  }
  const parsed = Number.parseInt(storedValue, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SACRIFICE_SLOTS;
  }
  return clampSacrificeSlotCount(parsed);
}
