"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export const SEEN_UPDATES_STORAGE_KEY = "cultist_seen_updates";

/** Ids from `ids` that are not in the stored JSON list of seen ids. */
export function getUnseenIds(
  ids: readonly string[],
  stored: string | null,
): Set<string> {
  let seen: unknown = [];
  try {
    seen = JSON.parse(stored ?? "[]");
  } catch {
    /* Invalid storage counts as nothing seen. */
  }
  const seenIds = new Set(Array.isArray(seen) ? seen : []);
  return new Set(ids.filter((id) => !seenIds.has(id)));
}

// Read once per page load: items stay "new" for the rest of the visit even
// after markSeen stores them, and only count as seen on the next visit.
// dismiss() is the exception: it clears them for this visit too.
let visitSnapshot: string | undefined;
const listeners = new Set<() => void>();
function getSnapshot() {
  if (visitSnapshot === undefined) {
    try {
      visitSnapshot = localStorage.getItem(SEEN_UPDATES_STORAGE_KEY) ?? "[]";
    } catch {
      visitSnapshot = "[]";
    }
  }
  return visitSnapshot;
}
const getServerSnapshot = () => null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function storeSeen(ids: readonly string[]) {
  const value = JSON.stringify(ids);
  try {
    localStorage.setItem(SEEN_UPDATES_STORAGE_KEY, value);
  } catch {
    /* Storage can be unavailable (private mode); updates just stay new. */
  }
  return value;
}

/**
 * Tracks which update ids this browser has already seen. `ready` is false
 * during server rendering and hydration, before storage can be read.
 */
export function useSeenUpdates(ids: readonly string[]) {
  const stored = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const ready = stored !== null;
  const unseenIds = useMemo(
    () => (ready ? getUnseenIds(ids, stored) : new Set<string>()),
    [ids, ready, stored],
  );

  // Stores only ids that still exist, so retired updates do not pile up.
  const markSeen = useCallback(() => {
    storeSeen(ids);
  }, [ids]);

  // Marks the updates seen and stops showing them as new right away.
  const dismiss = useCallback(() => {
    visitSnapshot = storeSeen(ids);
    listeners.forEach((listener) => listener());
  }, [ids]);

  return { ready, unseenIds, markSeen, dismiss };
}
