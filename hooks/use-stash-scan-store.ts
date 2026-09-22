"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { QueuedImage } from "@/components/stash-scan/upload-zone";
import type { CellAssignments, CellKey } from "@/lib/stash-scan/owned-items";
import type { ScanCell, ScanImageResult } from "@/lib/stash-scan/types";

export interface ScanSession {
  /**
   * Scanned images; `file` is present for user uploads but not the demo, and
   * `upload` is what was sent to the API so re-matching uses the same pixels.
   */
  images: Array<Pick<QueuedImage, "id" | "url"> & Partial<QueuedImage> & { upload?: Blob }>;
  results: ScanImageResult[];
}

export interface StashScanStore {
  queued: QueuedImage[];
  setQueued: Dispatch<SetStateAction<QueuedImage[]>>;
  session: ScanSession | null;
  setSession: Dispatch<SetStateAction<ScanSession | null>>;
  assignments: CellAssignments;
  setAssignments: Dispatch<SetStateAction<CellAssignments>>;
  inclusion: Record<string, boolean>;
  setInclusion: Dispatch<SetStateAction<Record<string, boolean>>>;
  /** Cells the user has confirmed or corrected in the review flow. */
  reviewed: ReadonlySet<CellKey>;
  markReviewed: (key: CellKey) => void;
  unmarkReviewed: (keys: CellKey[]) => void;
  /** Cells split into their separate slots, re-matched by the server. */
  splits: Record<CellKey, ScanCell[]>;
  setSplits: Dispatch<SetStateAction<Record<CellKey, ScanCell[]>>>;
  /** Object URLs live as long as the store. */
  trackUrl: (url: string) => void;
  /** Clears the session and revokes tracked URLs. */
  reset: () => void;
}

/**
 * Holds the scan session outside the dialog so reopening the modal keeps the
 * screenshots, recognised items and the user's corrections.
 */
export function useStashScanStore(): StashScanStore {
  const [queued, setQueued] = useState<QueuedImage[]>([]);
  const [session, setSession] = useState<ScanSession | null>(null);
  const [assignments, setAssignments] = useState<CellAssignments>({});
  const [inclusion, setInclusion] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState<ReadonlySet<CellKey>>(new Set());
  const markReviewed = useCallback((key: CellKey) => {
    setReviewed((current) => new Set(current).add(key));
  }, []);
  const unmarkReviewed = useCallback((keys: CellKey[]) => {
    setReviewed((current) => {
      const next = new Set(current);
      keys.forEach((key) => next.delete(key));
      return next;
    });
  }, []);
  const [splits, setSplits] = useState<Record<CellKey, ScanCell[]>>({});

  const urls = useRef(new Set<string>());
  const trackUrl = useCallback((url: string) => {
    urls.current.add(url);
  }, []);
  useEffect(() => {
    const tracked = urls.current;
    return () => tracked.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const reset = useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    setQueued([]);
    setSession(null);
    setAssignments({});
    setInclusion({});
    setReviewed(new Set());
    setSplits({});
  }, []);

  return {
    queued,
    setQueued,
    session,
    setSession,
    assignments,
    setAssignments,
    inclusion,
    setInclusion,
    reviewed,
    markReviewed,
    unmarkReviewed,
    splits,
    setSplits,
    trackUrl,
    reset,
  };
}

const StashScanStoreContext = createContext<StashScanStore | null>(null);

/**
 * Holds one scan session above the page tree so leaving /scan and coming
 * back (or reopening it from the stash strip) keeps the screenshots,
 * recognised items and corrections instead of starting a new scan.
 */
export function StashScanStoreProvider({ children }: { children: ReactNode }) {
  const store = useStashScanStore();
  return createElement(StashScanStoreContext.Provider, { value: store }, children);
}

export function useSharedStashScanStore(): StashScanStore {
  const store = useContext(StashScanStoreContext);
  if (!store) {
    throw new Error(
      "useSharedStashScanStore must be used inside StashScanStoreProvider",
    );
  }
  return store;
}
