"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, ImagePlus, Loader2, Minus, Plus, RotateCcw, ScanSearch } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import ItemSocket from "@/components/item-socket";
import { ModeThreshold } from "@/components/mode-threshold";
import { Button } from "@/components/ui/button";
import { isItemNameExcluded } from "@/lib/excluded-item-names";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { useLanguage } from "@/contexts/language-context";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useLocalStorageNumber } from "@/hooks/use-local-storage-state";
import { useItemsData } from "@/hooks/use-items-data";
import {
  SELECTED_ITEM_IDS_STORAGE_KEY,
  SELECTED_ITEM_SLOT_COUNT,
} from "@/lib/persisted-selected-items";
import {
  DEFAULT_SACRIFICE_SLOTS,
  MAX_SACRIFICE_SLOTS,
  MIN_SACRIFICE_SLOTS,
  SACRIFICE_SLOT_COUNT_KEY,
} from "@/lib/sacrifice-slots";
import { planSacrifice } from "@/lib/stash-scan/optimize";
import {
  prepareScreenshot,
  ScreenshotTooLargeError,
} from "@/lib/stash-scan/prepare-screenshot";
import {
  cellNeedsReview,
  cellsWithSameReviewSuggestion,
  displayCells,
  groupOwnedItems,
  initialAssignments,
  splitCellRects,
  toOwnedItems,
  type CellAssignments,
  type CellKey,
  type DisplayCell,
  type PricingSettings,
  type SplitDirection,
} from "@/lib/stash-scan/owned-items";
import {
  SCAN_LIMITS,
  type DemoScanResponse,
  type ScanCell,
  type ScanErrorResponse,
  type ScanImageResult,
  type ScanResponse,
} from "@/lib/stash-scan/types";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import {
  buildInventoryFromGroups,
  type StashInventory,
} from "@/lib/stash-inventory";
import type { StashScanStore } from "@/hooks/use-stash-scan-store";
import { CellInspector } from "./cell-inspector";
import { DetectedItems } from "./detected-items";
import { ReviewPanel } from "./review-panel";
import { SacrificePlan } from "./sacrifice-plan";
import { OverlayLegend, ScreenshotOverlay } from "./screenshot-overlay";
import { UploadZone, type QueuedImage } from "./upload-zone";

interface ScanSession {
  /** `upload` is what was sent to the API, so re-matching uses the same pixels. */
  images: Array<{ id: string; url: string; upload?: Blob }>;
  results: ScanImageResult[];
}

type DemoStatus = "loading" | "missing" | "error" | "ready";

/** Uploads at the same time; each screenshot is its own request. */
const UPLOAD_CONCURRENCY = 2;

const NO_GRID_ERROR =
  "No inventory slots were found in this screenshot. Upload an uncropped, full-resolution screenshot of your stash or a container. If it already is one, restart your browser and try again.";

interface ScanOutcome {
  image: QueuedImage;
  result?: ScanImageResult;
  /** What was actually uploaded, reused when re-matching split cells. */
  upload?: Blob;
  error?: string;
}

/**
 * Prepares and scans screenshots one per request, so each upload stays under
 * the host's request body limit. Results keep the input order.
 */
async function scanEach(
  images: QueuedImage[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): Promise<ScanOutcome[]> {
  const outcomes: ScanOutcome[] = images.map((image) => ({ image }));
  let next = 0;
  const worker = async () => {
    while (next < images.length) {
      const outcome = outcomes[next++];
      try {
        const upload = await prepareScreenshot(outcome.image.file);
        outcome.upload = upload;
        const form = new FormData();
        form.append("images", upload, outcome.image.file.name);
        const response = await fetch("/api/stash-scan", { method: "POST", body: form });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as ScanErrorResponse | null;
          outcome.error =
            body?.error ??
            (response.status === 413
              ? t("The screenshot is too large to upload.")
              : t("The scan failed. Try again."));
          continue;
        }
        const { images: [result] } = (await response.json()) as ScanResponse;
        if (!result) outcome.error = t("The scan failed. Try again.");
        // No grid at all: a crop without inventory slots, a heavily resized
        // screenshot, or a browser that sent a broken image.
        else if (!result.cells.length) outcome.error = t(NO_GRID_ERROR);
        else outcome.result = result;
      } catch (error) {
        outcome.error =
          error instanceof ScreenshotTooLargeError
            ? t("The screenshot is too large to upload.")
            : error instanceof TypeError
              ? t("Could not reach the scanner. Check your connection and try again.")
              : t("The screenshot could not be read.");
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, images.length) }, worker));
  return outcomes;
}

function readExcludedNames(): Set<string> {
  const names = new Set([...DEFAULT_EXCLUDED_ITEMS].map((name) => name.toLowerCase()));
  try {
    const saved = localStorage.getItem("excludedItems");
    if (saved) for (const name of JSON.parse(saved) as string[]) names.add(name.toLowerCase());
  } catch {
    // Fall back to the defaults.
  }
  return names;
}

interface StashScanProps {
  /** Show the bundled sample screenshot instead of the upload flow. */
  demo?: boolean;
  /** Files to queue for scanning on mount (e.g. from the stash strip). */
  initialFiles?: File[];
  /** Called with the reviewed stash to persist it for the calculator. */
  onCommitStash?: (inventory: StashInventory) => void;
  /** A stash is already saved; the commit button becomes "Update stash". */
  hasSavedInventory?: boolean;
  /** Lifted scan session; survives leaving /scan and coming back. */
  store?: StashScanStore;
}

export function StashScan({ demo = false, initialFiles, onCommitStash, hasSavedInventory = false, store }: StashScanProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const settings = useAppSettings();
  const { data: items } = useItemsData(settings.gameMode);

  const [localQueued, setLocalQueued] = useState<QueuedImage[]>([]);
  const [localSession, setLocalSession] = useState<ScanSession | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localAssignments, setLocalAssignments] = useState<CellAssignments>({});
  // The user's include/exclude choices; everything else follows the defaults.
  const [localInclusion, setLocalInclusion] = useState<Record<string, boolean>>({});
  // Cells the user split into their separate slots, re-matched by the server.
  const [localSplits, setLocalSplits] = useState<Record<CellKey, ScanCell[]>>({});
  const [splitting, setSplitting] = useState<CellKey | null>(null);
  const [excludedNames] = useState(readExcludedNames);
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("loading");
  const [demoRetry, setDemoRetry] = useState(0);

  // Lifted store when embedded in a session that outlives this component,
  // local state otherwise. Declared up front: effects below depend on these.
  const splits = store ? store.splits : localSplits;
  const setSplits = store ? store.setSplits : setLocalSplits;
  const queued = store ? store.queued : localQueued;
  const setQueued = store ? store.setQueued : setLocalQueued;
  const session = store ? store.session : localSession;
  const setSession = store ? store.setSession : setLocalSession;
  const assignments = store ? store.assignments : localAssignments;
  const setAssignments = store ? store.setAssignments : setLocalAssignments;
  const inclusion = store ? store.inclusion : localInclusion;
  const setInclusion = store ? store.setInclusion : setLocalInclusion;

  // Object URLs outlive their images unless revoked. With a lifted store they
  // live (and are revoked) with the store instead of this component.
  const urls = useRef(new Set<string>());
  const trackUrl = useCallback(
    (url: string) => {
      if (store) store.trackUrl(url);
      else urls.current.add(url);
    },
    [store],
  );

  useEffect(() => {
    if (!demo) return;
    let cancelled = false;
    // Scanned at build time by scripts/build-stash-scan-index.ts. In dev the
    // JSON may not exist yet, so fall back to a live scan of the demo image.
    // Never in production: every demo visit would become a paid scan request.
    const loadDemo = async () => {
      try {
        const response = await fetch("/scan-demo/demo.json", { cache: "no-cache" });
        if (response.ok) {
          const body = (await response.json()) as DemoScanResponse;
          if (cancelled) return;
          if (body.available) {
            setSession({ images: [{ id: "demo", url: body.imageUrl }], results: body.images });
            setAssignments(initialAssignments(displayCells(body.images, {})));
            setSplits({});
            setDemoStatus("ready");
            return;
          }
        } else if (response.status !== 404) {
          throw new Error(String(response.status));
        }
        if (cancelled) return;
        if (process.env.NODE_ENV !== "development") {
          setDemoStatus("missing");
          return;
        }
        // No pre-scanned JSON (common in dev): scan the bundled image live.
        const candidates = ["/scan-demo/demo.jpg", "/scan-demo/demo.png", "/scan-demo/demo.webp"];
        let file: File | null = null;
        let fileName = "demo.jpg";
        for (const src of candidates) {
          try {
            const imageResponse = await fetch(src, { cache: "no-cache" });
            if (!imageResponse.ok) continue;
            const blob = await imageResponse.blob();
            fileName = src.split("/").pop() ?? fileName;
            file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
            break;
          } catch {
            continue;
          }
        }
        if (!file) {
          if (!cancelled) setDemoStatus("missing");
          return;
        }
        const url = URL.createObjectURL(file);
        trackUrl(url);
        const outcomes = await scanEach([{ id: "demo-live", file, url }], t);
        if (cancelled) return;
        const first = outcomes[0]?.result;
        const upload = outcomes[0]?.upload;
        if (!first) {
          if (!cancelled) setDemoStatus("error");
          return;
        }
        setSession({ images: [{ id: "demo-live", url, upload }], results: [first] });
        setAssignments(initialAssignments(displayCells([first], {})));
        setSplits({});
        setDemoStatus("ready");
      } catch {
        if (!cancelled) setDemoStatus("error");
      }
    };
    void loadDemo();
    return () => {
      cancelled = true;
    };
  }, [demo, demoRetry, t, trackUrl, setSession, setAssignments, setSplits]);
  const [activeCell, setActiveCell] = useState<CellKey | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewTotal, setReviewTotal] = useState(0);
  // Cells the user has confirmed or corrected in the review flow.
  const [localReviewed, setLocalReviewed] = useState<ReadonlySet<CellKey>>(new Set());
  const markReviewed = useCallback(
    (key: CellKey) => {
      if (store) store.markReviewed(key);
      else setLocalReviewed((current) => new Set(current).add(key));
    },
    [store],
  );
  const unmarkReviewed = useCallback(
    (keys: CellKey[]) => {
      if (store) store.unmarkReviewed(keys);
      else
        setLocalReviewed((current) => {
          const next = new Set(current);
          keys.forEach((key) => next.delete(key));
          return next;
        });
    },
    [store],
  );
  const reviewed = store ? store.reviewed : localReviewed;
  // Opening a cell always brings its inspector into view; during review the
  // review panel is the target instead.
  useEffect(() => {
    if (!activeCell) return;
    document
      .getElementById(reviewing ? "stash-scan-review" : "stash-scan-inspector")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeCell, reviewing]);
  const openCellFromList = (key: CellKey) => {
    setActiveCell(key);
  };

  const [itemBonus, setItemBonus] = useState(0);
  // Shared with the calculator's slot count.
  const [slots, setSlots] = useLocalStorageNumber(
    SACRIFICE_SLOT_COUNT_KEY,
    DEFAULT_SACRIFICE_SLOTS,
    { min: MIN_SACRIFICE_SLOTS, max: MAX_SACRIFICE_SLOTS },
  );
  const changeSlots = (next: number) =>
    setSlots(Math.min(MAX_SACRIFICE_SLOTS, Math.max(MIN_SACRIFICE_SLOTS, next)));

  const itemsById = useMemo(
    () => new Map<string, SimplifiedItem>(items.map((item) => [item.id, item])),
    [items],
  );

  useEffect(() => {
    const tracked = urls.current;
    return () => tracked.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addImages = useCallback((files: File[]) => {
    setError(null);
    const supported = files.filter((file) =>
      (SCAN_LIMITS.acceptedTypes as readonly string[]).includes(file.type),
    );
    if (supported.length !== files.length) {
      sonnerToast.error(t("Unsupported screenshot format"), {
        description: t("Use PNG, JPEG or WebP screenshots."),
      });
    }
    const tooLarge = supported.filter((file) => file.size > SCAN_LIMITS.maxSourceBytes);
    if (tooLarge.length) {
      sonnerToast.error(t("Some screenshots are too large"), {
        description: t("Each image must be under {size} MB.", {
          size: Math.round(SCAN_LIMITS.maxSourceBytes / 1024 / 1024),
        }),
      });
    }
    const usable = supported.filter((file) => file.size <= SCAN_LIMITS.maxSourceBytes);
    if (!usable.length) return;
    setQueued((current) => {
      const room =
        SCAN_LIMITS.maxImages - (session?.images.length ?? 0) - current.length;
      if (room <= 0) {
        sonnerToast.error(t("Screenshot limit reached"), {
          description: t("Remove a screenshot or start a new scan."),
        });
        return current;
      }
      if (usable.length > room) {
        sonnerToast.warning(t("Some screenshots were not added"), {
          description: t("A scan holds up to {count} screenshots.", {
            count: SCAN_LIMITS.maxImages,
          }),
        });
      }
      const added = usable
        .slice(0, Math.max(0, room))
        .map((file) => {
          const url = URL.createObjectURL(file);
          trackUrl(url);
          return { id: `${file.name}-${file.size}-${url}`, file, url };
        });
      return [...current, ...added];
    });
  }, [t, session, trackUrl, setQueued]);

  const removeImage = useCallback((id: string) => {
    setQueued((current) => current.filter((image) => image.id !== id));
  }, [setQueued]);

  const initialFilesAdded = useRef(false);
  // Newly handed-over files scan themselves: appended to a live session, or
  // as a fresh scan when arriving with none.
  const autoScanRef = useRef(false);
  useEffect(() => {
    if (initialFilesAdded.current || !initialFiles?.length) return;
    initialFilesAdded.current = true;
    autoScanRef.current = true;
    addImages(initialFiles);
  }, [initialFiles, addImages]);

  const scan = useCallback(async () => {
    if (!queued.length) return;
    setScanning(true);
    setError(null);
    try {
      const outcomes = await scanEach(queued, t);
      const scanned = outcomes.filter((o) => o.result);
      const failed = outcomes.filter((o) => o.error);
      if (!scanned.length) {
        setError(failed[0]?.error ?? t("The scan failed. Try again."));
        return;
      }
      if (failed.length) {
        sonnerToast.error(
          t("{count} screenshots could not be scanned", { count: failed.length }),
          { description: failed.map((o) => `${o.image.file.name}: ${o.error}`).join("\n") },
        );
      }
      const results = scanned.map((o) => o.result!);
      const scannedImages = scanned.map((o) => ({ ...o.image, upload: o.upload }));
      // With an existing session the new screenshots append to it.
      const allResults = [...(session?.results ?? []), ...results];
      setSession((prev: ScanSession | null) =>
        prev
          ? { images: [...prev.images, ...scannedImages], results: [...prev.results, ...results] }
          : { images: scannedImages, results },
      );
      setAssignments((current) =>
        session
          ? {
              ...current,
              ...initialAssignments(
                displayCells(allResults, {}).filter(
                  (cell) => cell.imageIndex >= (session?.images.length ?? 0),
                ),
              ),
            }
          : initialAssignments(displayCells(results, {})),
      );
      if (!session) {
        setInclusion({});
        setActiveCell(null);
        setSplits({});
      }
      // New scan contents mean the review counters start over.
      setReviewTotal(0);
      setQueued([]);
    } finally {
      setScanning(false);
    }
  }, [queued, session, t, setSession, setAssignments, setInclusion, setQueued, setSplits]);

  // Handed-over files scan themselves once queued.
  useEffect(() => {
    if (autoScanRef.current && queued.length > 0 && !scanning) {
      autoScanRef.current = false;
      void scan();
    }
  }, [queued, scanning, scan]);

  const results = useMemo(() => session?.results ?? [], [session]);
  const cells = useMemo(() => displayCells(results, splits), [results, splits]);
  const cellsByKey = useMemo(
    () => new Map(cells.map((cell) => [cell.key, cell] as const)),
    [cells],
  );
  const groups = useMemo(() => {
    const grouped = groupOwnedItems(cells, assignments, itemsById);
    if (!reviewed.size) return grouped;
    // Confirming a match counts as reviewed, so the cell stops flagging.
    return grouped.map((group) => ({
      ...group,
      needsReview: group.cells.some((key) => {
        if (reviewed.has(key)) return false;
        const cell = cellsByKey.get(key);
        return cell ? cellNeedsReview(cell, assignments[key]) : false;
      }),
    }));
  }, [cells, assignments, itemsById, reviewed, cellsByKey]);

  // Items the calculator excludes start unticked here too.
  const excluded = useMemo(
    () =>
      new Set(
        groups
          .filter((group) =>
            group.itemId in inclusion
              ? !inclusion[group.itemId]
              : !!group.item && isItemNameExcluded(group.item, excludedNames),
          )
          .map((group) => group.itemId),
      ),
    [groups, inclusion, excludedNames],
  );

  const pricing: PricingSettings = {
    priceMode: settings.priceMode,
    fleaPriceType: settings.fleaPriceType,
    itemBonus,
  };
  const owned = useMemo(
    () => toOwnedItems(groups, excluded, pricing),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, excluded, settings.priceMode, settings.fleaPriceType, itemBonus],
  );
  const plan = useMemo(
    () => planSacrifice(owned, settings.threshold, slots),
    [owned, settings.threshold, slots],
  );
  const bestReachable = useMemo(() => {
    const units = owned
      .flatMap((o) => Array.from({ length: Math.min(o.count, slots) }, () => o.baseValue))
      .sort((a, b) => b - a);
    return units.slice(0, slots).reduce((sum, value) => sum + value, 0);
  }, [owned, slots]);

  const plannedCounts = useMemo(
    () => new Map((plan?.picks ?? []).map((pick) => [pick.key, pick.count] as const)),
    [plan],
  );
  const plannedCells = useMemo(() => {
    const cells = new Set<CellKey>();
    for (const group of groups) {
      const count = plannedCounts.get(group.itemId) ?? 0;
      group.cells.slice(0, count).forEach((key) => cells.add(key));
    }
    return cells;
  }, [groups, plannedCounts]);
  const highlightedCells = useMemo(
    () => new Set(groups.find((g) => g.itemId === hoveredItem)?.cells ?? []),
    [groups, hoveredItem],
  );
  const unrecognisedCount = useMemo(
    () =>
      cells.filter(
        (cell) => !cell.empty && !assignments[cell.key] && !reviewed.has(cell.key),
      ).length,
    [cells, assignments, reviewed],
  );

  // Cells needing attention, in scan order: unrecognised or a non-high
  // confidence best match (same rule as groupOwnedItems' needsReview).
  const attentionCells = useMemo(
    () =>
      cells
        .filter(
          (cell) =>
            !cell.empty &&
            !reviewed.has(cell.key) &&
            (!assignments[cell.key] || cellNeedsReview(cell, assignments[cell.key])),
        )
        .map((cell) => cell.key),
    [cells, assignments, reviewed],
  );
  const plannedAttentionCells = useMemo(
    () => attentionCells.filter((key) => plannedCells.has(key)),
    [attentionCells, plannedCells],
  );
  const planNeedsReview = useMemo(() => {
    const plannedAttention = new Set(plannedAttentionCells);
    return new Set(
      groups
        .filter((group) => group.cells.some((key) => plannedAttention.has(key)))
        .map((group) => group.itemId),
    );
  }, [groups, plannedAttentionCells]);
  const groupReviewCounts = useMemo(() => {
    const cellToGroup = new Map<CellKey, string>();
    for (const group of groups) for (const key of group.cells) cellToGroup.set(key, group.itemId);
    const counts = new Map<string, number>();
    for (const key of attentionCells) {
      const itemId = cellToGroup.get(key);
      if (itemId) counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    }
    return counts;
  }, [groups, attentionCells]);
  const similarReviewCellKeys = activeCell
    ? cellsWithSameReviewSuggestion(
        cellsByKey.get(activeCell),
        cells,
        new Set(attentionCells),
      )
    : [];

  // New flags widen the review's denominator.
  if (attentionCells.length > reviewTotal) setReviewTotal(attentionCells.length);

  const startReview = () => {
    if (!attentionCells.length) return;
    if (attentionCells.length > reviewTotal) setReviewTotal(attentionCells.length);
    setReviewing(true);
    setActiveCell(attentionCells[0]);
  };

  const reviewNeededMatches = () => {
    if (!attentionCells.length) return;
    if (attentionCells.length > reviewTotal) setReviewTotal(attentionCells.length);
    setReviewing(true);
    setActiveCell(plannedAttentionCells[0] ?? attentionCells[0]);
  };

  const skipCell = () => {
    if (!reviewing || !activeCell) return;
    const index = attentionCells.indexOf(activeCell);
    const rest = attentionCells.filter((key) => key !== activeCell);
    if (!rest.length) return;
    setActiveCell(rest[Math.max(index, 0) % rest.length]);
  };

  const handleAssign = (itemId: string | null, applyToSimilar = false) => {
    if (!activeCell) return;
    const targets = applyToSimilar
      ? [activeCell, ...similarReviewCellKeys]
      : [activeCell];
    const targetSet = new Set(targets);
    setAssignments((current) => {
      const next = { ...current };
      targets.forEach((key) => {
        next[key] = itemId;
      });
      return next;
    });
    targets.forEach(markReviewed);
    if (!reviewing) {
      setActiveCell(null);
      return;
    }
    // Advance to the next remaining flagged cell, wrapping once to the start.
    const index = attentionCells.indexOf(activeCell);
    const afterActive = [
      ...attentionCells.slice(index + 1),
      ...attentionCells.slice(0, Math.max(index, 0)),
    ];
    const next = afterActive.find((key) => !targetSet.has(key));
    if (!next) {
      setActiveCell(null);
      setReviewing(false);
      sonnerToast.success(t("All matches checked"));
      return;
    }
    setActiveCell(next);
  };

  const loadIntoCalculator = () => {
    if (onCommitStash && session) {
      onCommitStash(
        buildInventoryFromGroups(groups, excluded, settings.gameMode, session.images.length),
      );
    }
    if (plan) {
      const ids = plan.picks.flatMap((pick) => Array.from({ length: pick.count }, () => pick.key));
      const slotsToFill = Array.from({ length: SELECTED_ITEM_SLOT_COUNT }, (_, i) => ids[i] ?? null);
      localStorage.setItem(SELECTED_ITEM_IDS_STORAGE_KEY, JSON.stringify(slotsToFill));
    } else if (onCommitStash) {
      sonnerToast.warning(t("Stash saved, but it can't reach {threshold}", {
        threshold: `₽${settings.threshold.toLocaleString()}`,
      }), {
        description: t("Untick kept items in the stash panel, lower the threshold, or add more screenshots."),
      });
    } else {
      return;
    }
    router.push("/");
  };

  const reset = () => {    if (store) store.reset();
    else {
      setSession(null);
      setAssignments({});
      setInclusion({});
      setQueued([]);
      setSplits({});
    }
    unmarkReviewed([...reviewed]);
    setActiveCell(null);
    setError(null);
    setReviewing(false);
    setReviewTotal(0);
  };

  const active = activeCell ? cells.find((cell) => cell.key === activeCell) : undefined;

  // Extra screenshots for the live session, scanned and appended on select.
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  /** Puts a split cell back together and restores its original match. */
  const undoSplit = (parentKey: CellKey) => {
    const [imageIndex, cellIndex] = parentKey.split(":").map(Number);
    const original = session?.results[imageIndex]?.cells[cellIndex];
    setSplits((current) => {
      const next = { ...current };
      delete next[parentKey];
      return next;
    });
    setAssignments((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${parentKey}#`)) delete next[key];
      }
      const best = original?.matches[0];
      next[parentKey] =
        original && best && !original.empty && original.confidence !== "low"
          ? best.itemId
          : null;
      return next;
    });
    unmarkReviewed([
      parentKey,
      ...Object.keys(assignments).filter((key) => key.startsWith(`${parentKey}#`)),
    ]);
    setActiveCell(reviewing ? parentKey : null);
  };

  /**
   * Re-matches each slot of a cell that holds more than one item. The server
   * matches the given rectangles instead of detecting the grid again.
   */
  const splitCell = async (cell: DisplayCell, direction: SplitDirection, count: number) => {
    const image = session?.images[cell.imageIndex];
    const result = session?.results[cell.imageIndex];
    if (!image || !result) return;
    setSplitting(cell.key);
    try {
      const blob = image.upload ?? (await (await fetch(image.url)).blob());
      const rects = splitCellRects(cell, direction, count);
      const form = new FormData();
      form.append("images", blob, "screenshot");
      form.append("rects", JSON.stringify(rects));
      const response = await fetch("/api/stash-scan", { method: "POST", body: form });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ScanErrorResponse | null;
        sonnerToast.error(t("Could not split this cell"), {
          description: body?.error ?? t("The scan failed. Try again."),
        });
        return;
      }
      const { images: [matched] } = (await response.json()) as ScanResponse;
      if (!matched?.cells.length) return;
      setSplits((current) => ({ ...current, [cell.key]: matched.cells }));
      setAssignments((current) => {
        const next = { ...current };
        delete next[cell.key];
        matched.cells.forEach((part, slot) => {
          const best = part.matches[0];
          next[`${cell.key}#${slot}`] =
            best && !part.empty && part.confidence !== "low" ? best.itemId : null;
        });
        return next;
      });
      unmarkReviewed(
        matched.cells.map((_, slot) => `${cell.key}#${slot}` as CellKey),
      );
      if (reviewing) {
        // The review loop continues into the new slots.
        const first = matched.cells.findIndex((part) => !part.empty);
        setActiveCell(first >= 0 ? (`${cell.key}#${first}` as CellKey) : null);
      } else {
        setActiveCell(null);
      }
    } catch {
      sonnerToast.error(t("Could not split this cell"), {
        description: t("Could not reach the scanner. Check your connection and try again."),
      });
    } finally {
      setSplitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-my_bg_image bg-cover bg-fixed bg-no-repeat px-3 pb-20 pt-4 text-white sm:px-4 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl space-y-6 rounded-xl border border-gray-800 bg-gray-900/80 px-4 py-8 shadow-2xl backdrop-blur-md sm:px-6 lg:py-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {demo ? t("Stash Scan demo") : t("Stash Scan")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              {demo
                ? t("A real scan of a sample stash screenshot. 1 Change the threshold or slots, 2 click boxes to correct items, 3 untick items you want to keep.")
                : t("1 Upload stash screenshots, 2 review the matches, 3 save. The cheapest set that reaches your threshold is picked for the circle.")}
            </p>
            {!demo && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {t("Open a stash or container full-screen for the shot. Cropped or resized images often find no grid.")}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Stash Scan contributed by{" "}
              <a
                className="inline-flex items-center gap-1.5 align-middle text-cyan-300 underline hover:text-cyan-200"
                href="https://github.com/Oxylad"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Use GitHub's CDN directly instead of Vercel image optimization. */}
                <img
                  src="https://avatars.githubusercontent.com/u/76744208?s=64&v=4"
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 rounded-full border border-cyan-300/30 object-cover"
                />
                Oxylad
              </a>.
              {" "}Custom item matching inspired by <a className="text-cyan-300 underline hover:text-cyan-200" href="https://github.com/RatScanner/RatEye" target="_blank" rel="noopener noreferrer">RatScanner&apos;s RatEye</a>.
            </p>
          </div>
          {demo ? (
            <Button asChild className="bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300">
              <Link href="/scan">
                <ScanSearch className="mr-2 h-4 w-4" />
                {t("Scan your own screenshots")}
              </Link>
            </Button>
          ) : session ? (
            <div className="flex items-center gap-2">
              {scanning && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {t("Scanning...")}
                </span>
              )}
              <Button
                onClick={() => addMoreInputRef.current?.click()}
                disabled={scanning}
                className="bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                {t("Add screenshots")}
              </Button>
              <input
                ref={addMoreInputRef}
                type="file"
                accept={SCAN_LIMITS.acceptedTypes.join(",")}
                multiple
                hidden
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  event.target.value = "";
                  if (files.length) {
                    autoScanRef.current = true;
                    addImages(files);
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={reset}
                className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("New scan")}
              </Button>
            </div>
          ) : (
            <Button
              asChild
              variant="outline"
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <Link href="/scan/demo">
                <Eye className="mr-2 h-4 w-4" />
                {t("See a demo")}
              </Link>
            </Button>
          )}
        </header>

        <section
          aria-labelledby="stash-scan-trial-title"
          className="flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2.5 sm:px-4"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <div className="min-w-0">
            <p id="stash-scan-trial-title" className="text-sm font-semibold text-amber-200">
              {t("Limited trial")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-100/75 sm:text-sm">
              {t("We’re testing Stash Scan’s accuracy, reliability and server usage during this trial. Please double-check item matches before relying on the results.")}
            </p>
          </div>
        </section>

        <section className="flex flex-col items-center gap-3 rounded-3xl border border-white/8 bg-black/20 p-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <ModeThreshold
            mode={settings.gameMode}
            onModeChange={settings.setGameMode}
            threshold={settings.threshold}
            onThresholdChange={settings.setThreshold}
          />
          <ItemSocket onBonusChange={setItemBonus} />
          <div
            className="flex items-center gap-1 rounded-full border border-slate-600/30 bg-slate-800/70 p-1"
            role="group"
            aria-label={t("Sacrifice slots ({min} to {max})", { min: MIN_SACRIFICE_SLOTS, max: MAX_SACRIFICE_SLOTS })}
            title={t("Sacrifice slots you can fill ({min}-{max})", { min: MIN_SACRIFICE_SLOTS, max: MAX_SACRIFICE_SLOTS })}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-300"
              onClick={() => changeSlots(slots - 1)}
              disabled={slots <= MIN_SACRIFICE_SLOTS}
              aria-label={t("Fewer slots")}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-slate-300" aria-live="polite">
              {t("{count} slots", { count: slots })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-300"
              onClick={() => changeSlots(slots + 1)}
              disabled={slots >= MAX_SACRIFICE_SLOTS}
              aria-label={t("More slots")}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>

        {demo && demoStatus !== "ready" && (
          <section className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
            {demoStatus === "loading" ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <p className="text-sm text-slate-400">{t("Scanning the sample screenshot...")}</p>
              </>
            ) : demoStatus === "missing" ? (
              <>
                <p className="max-w-md text-sm text-slate-400">
                  {t("The demo screenshot is missing from this build. You can still scan your own screenshots.")}
                </p>
                <Button asChild variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white">
                  <Link href="/scan">{t("Scan your own screenshots")}</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="max-w-md text-sm text-slate-400">
                  {t("The demo could not be loaded. Try again in a moment.")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDemoStatus("loading");
                    setDemoRetry((current) => current + 1);
                  }}
                  className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("Try again")}
                </Button>
              </>
            )}
          </section>
        )}

        {!demo && !session && (
          <section className="space-y-4">
            <UploadZone images={queued} onAdd={addImages} onRemove={removeImage} disabled={scanning} />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {t("Screenshots are processed on the server to recognise items and are not stored. Values use your calculator price settings.")}
              </p>
              <Button
                onClick={scan}
                disabled={!queued.length || scanning}
                className="w-full bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300 sm:w-auto"
              >
                {scanning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScanSearch className="mr-2 h-4 w-4" />
                )}
                {scanning
                  ? t("Scanning...")
                  : queued.length === 1
                    ? t("Scan 1 screenshot")
                    : queued.length > 1
                      ? t("Scan {count} screenshots", { count: queued.length })
                      : t("Add screenshots to scan")}
              </Button>
            </div>
          </section>
        )}

        {session && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="order-2 min-w-0 space-y-4 lg:order-1">
              <OverlayLegend showIgnored />
              {session.results.map((result, imageIndex) => (
                <div key={session.images[imageIndex]?.id ?? imageIndex} className="space-y-3">
                  <ScreenshotOverlay
                    url={session.images[imageIndex].url}
                    result={result}
                    cells={cells.filter((cell) => cell.imageIndex === imageIndex)}
                    assignments={assignments}
                    plannedCells={plannedCells}
                    highlightedCells={highlightedCells}
                    activeCell={activeCell}
                    onSelectCell={setActiveCell}
                    emphasiseAttention={reviewing}
                    reviewedCells={reviewed}
                    itemsById={itemsById}
                  />
                  {!reviewing && active && active.imageIndex === imageIndex && (
                    <div id="stash-scan-inspector">
                      <CellInspector
                        key={activeCell}
                        url={session.images[imageIndex].url}
                        imageWidth={result.width}
                        imageHeight={result.height}
                        cell={active}
                        assignedItemId={assignments[active.key] ?? null}
                        reviewed={reviewed.has(active.key)}
                        itemsById={itemsById}
                        items={items}
                        onSplit={
                          active.key.includes("#")
                            ? undefined
                            : (direction, count) => void splitCell(active, direction, count)
                        }
                        splitting={splitting === active.key}
                        onUndoSplit={
                          active.key.includes("#")
                            ? () => undoSplit(active.key.split("#")[0])
                            : undefined
                        }
                        onAssign={handleAssign}
                        onClose={() => {
                          setActiveCell(null);
                          setReviewing(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}

              {(onCommitStash || demo) && (
                <ReviewPanel
                  session={session}
                  cells={cells}
                  itemsById={itemsById}
                  items={items}
                  assignments={assignments}
                  similarReviewCellCount={similarReviewCellKeys.length}
                  splitting={splitting !== null}
                  onSplit={(cell, direction, count) => void splitCell(cell, direction, count)}
                  onUndoSplit={undoSplit}
                  activeCell={activeCell}
                  reviewing={reviewing}
                  remaining={attentionCells.length}
                  total={reviewTotal}
                  onStart={startReview}
                  onAssign={handleAssign}
                  onSkip={skipCell}
                  onExit={() => {
                    setActiveCell(null);
                    setReviewing(false);
                  }}
                  onSkipAll={() => {
                    // Mark every flagged cell reviewed without changing matches.
                    attentionCells.forEach(markReviewed);
                    setActiveCell(null);
                    setReviewing(false);
                  }}
                  onClose={() => {
                    setActiveCell(null);
                    setReviewing(false);
                  }}
                  commitLabel={
                    demo
                      ? t("Scan your own screenshots")
                      : hasSavedInventory ? t("Update stash and load plan") : t("Save stash and load plan")
                  }
                  commitHint={
                    demo
                      ? undefined
                      : t("Saves all {items} items, then loads the {planned} cheapest into the calculator.", {
                          items: groups.reduce((sum, group) => sum + group.cells.length, 0),
                          planned: plan?.itemCount ?? 0,
                        })
                  }
                  onCommit={demo ? () => router.push("/scan") : loadIntoCalculator}
                  canCommit={groups.length > 0}
                />
              )}

              <DetectedItems
                groups={groups}
                excluded={excluded}
                plannedCounts={plannedCounts}
                unrecognisedCount={unrecognisedCount}
                pricing={pricing}
                reviewCounts={groupReviewCounts}
                onHover={setHoveredItem}
                onToggle={(itemId, included) =>
                  setInclusion((current) => ({ ...current, [itemId]: included }))
                }
                onReview={(itemId) => {
                  const group = groups.find((g) => g.itemId === itemId);
                  const target =
                    group?.cells.find((key) => attentionCells.includes(key)) ?? group?.cells[0];
                  if (target) openCellFromList(target);
                }}
                onShowUnrecognised={() => {
                  const cell = cells.find(
                    (c) => !c.empty && !assignments[c.key] && !reviewed.has(c.key),
                  );
                  if (cell) openCellFromList(cell.key);
                }}
              />
            </div>

            <aside className="order-1 min-w-0 lg:order-2">
              <div className="space-y-3 rounded-2xl border border-amber-300/15 bg-black/30 p-4 lg:sticky lg:top-20">
                <SacrificePlan
                  plan={plan}
                  threshold={settings.threshold}
                  slots={slots}
                  itemsById={itemsById}
                  needsReview={planNeedsReview}
                  remainingReviewCount={attentionCells.length}
                  hasItems={owned.length > 0}
                  bestReachable={bestReachable}
                  commitLabel={
                    demo
                      ? t("Load demo plan")
                      : hasSavedInventory
                        ? t("Update stash and load plan")
                        : t("Save stash and load plan")
                  }
                  onLoadIntoCalculator={loadIntoCalculator}
                  onReviewNeeded={reviewNeededMatches}
                  onLowerThreshold={() => settings.setThreshold(bestReachable)}
                  onAddSlot={() => changeSlots(slots + 1)}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
