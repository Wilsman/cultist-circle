"use client";

import { useSyncExternalStore } from "react";

const KEY = "sacrificeBonusSettings";
const EVENT = "sacrifice-bonus-changed";
const DEFAULT = { itemId: "none", hideoutLevel: 1 };
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(EVENT, notify);
  };
}
function getSnapshot() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
const getServerSnapshot = () => null;

export function useSacrificeBonus() {
  const stored = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  let settings = DEFAULT;
  try {
    const parsed = stored ? JSON.parse(stored) : null;
    if (
      parsed &&
      ["none", "sacred-amulet"].includes(parsed.itemId) &&
      Number.isInteger(parsed.hideoutLevel) &&
      parsed.hideoutLevel >= 1 &&
      parsed.hideoutLevel <= 51
    ) {
      settings = parsed;
    }
  } catch {
    /* Invalid storage uses the default. */
  }
  const update = (next: typeof DEFAULT) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  };
  return {
    ...settings,
    setItemId: (itemId: string) => update({ ...settings, itemId }),
    setHideoutLevel: (hideoutLevel: number) =>
      update({ ...settings, hideoutLevel }),
  };
}
