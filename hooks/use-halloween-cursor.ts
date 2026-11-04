"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isHalloweenSeason } from "@/lib/halloween";

const STORAGE_KEY = "halloween-cursor-enabled";
const CHANGE_EVENT = "halloween-cursor-change";

// Fallback for when localStorage is blocked.
let memoryValue = true;

function readEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? memoryValue : stored !== "false";
  } catch {
    return memoryValue;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const noopSubscribe = () => () => {};

/**
 * Shared on/off setting for the Halloween cursor (on by default).
 * `inSeason` is false during server render so the toggle never mismatches.
 */
export function useHalloweenCursor() {
  const inSeason = useSyncExternalStore(noopSubscribe, isHalloweenSeason, () => false);
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => false);

  const setEnabled = useCallback((next: boolean) => {
    memoryValue = next;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Storage blocked: memoryValue keeps it for this page load.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { inSeason, enabled: inSeason && enabled, setEnabled };
}
