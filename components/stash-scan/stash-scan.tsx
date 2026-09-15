"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Minus, Plus, RotateCcw, ScanSearch } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import ItemSocket from "@/components/item-socket";
import { ModeThreshold } from "@/components/mode-threshold";
import { Button } from "@/components/ui/button";
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
import { CellInspector } from "./cell-inspector";
import { DetectedItems } from "./detected-items";
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
        if (result) outcome.result = result;
        else outcome.error = t("The scan failed. Try again.");
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
}

export function StashScan({ demo = false }: StashScanProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const settings = useAppSettings();
  const { data: items } = useItemsData(settings.gameMode);

  const [queued, setQueued] = useState<QueuedImage[]>([]);
  const [session, setSession] = useState<ScanSession | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<CellAssignments>({});
  // The user's include/exclude choices; everything else follows the defaults.
  const [inclusion, setInclusion] = useState<Record<string, boolean>>({});
  // Cells the user split into their separate slots, re-matched by the server.
  const [splits, setSplits] = useState<Record<CellKey, ScanCell[]>>({});
  const [splitting, setSplitting] = useState<CellKey | null>(null);
  const [excludedNames] = useState(readExcludedNames);
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("loading");

  useEffect(() => {
    if (!demo) return;
    let cancelled = false;
    // Scanned at build time by scripts/build-stash-scan-index.ts.
    fetch("/scan-demo/demo.json", { cache: "no-cache" })
      .then(async (response) => {
        if (response.status === 404) {
          if (!cancelled) setDemoStatus("missing");
          return;
        }
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as DemoScanResponse;
        if (cancelled) return;
        if (!body.available) {
          setDemoStatus("missing");
          return;
        }
        setSession({ images: [{ id: "demo", url: body.imageUrl }], results: body.images });
        setAssignments(initialAssignments(displayCells(body.images, {})));
        setSplits({});
        setDemoStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setDemoStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [demo]);
  const [activeCell, setActiveCell] = useState<CellKey | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  // Set when a list action opens a cell, so its inspector scrolls into view.
  const scrollToInspector = useRef(false);
  useEffect(() => {
    if (!activeCell || !scrollToInspector.current) return;
    scrollToInspector.current = false;
    document
      .getElementById("stash-scan-inspector")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeCell]);
  const openCellFromList = (key: CellKey) => {
    scrollToInspector.current = true;
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

  // Object URLs outlive their images unless revoked.
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const tracked = urls.current;
    return () => tracked.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addImages = useCallback((files: File[]) => {
    setError(null);
    setQueued((current) => {
      const room = SCAN_LIMITS.maxImages - current.length;
      const tooLarge = files.filter((file) => file.size > SCAN_LIMITS.maxSourceBytes);
      if (tooLarge.length) {
        sonnerToast.error(t("Some screenshots are too large"), {
          description: t("Each image must be under {size} MB.", {
            size: Math.round(SCAN_LIMITS.maxSourceBytes / 1024 / 1024),
          }),
        });
      }
      const added = files
        .filter((file) => file.size <= SCAN_LIMITS.maxSourceBytes)
        .slice(0, Math.max(0, room))
        .map((file) => {
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          return { id: `${file.name}-${file.size}-${url}`, file, url };
        });
      return [...current, ...added];
    });
  }, [t]);

  const removeImage = useCallback((id: string) => {
    setQueued((current) => current.filter((image) => image.id !== id));
  }, []);

  const scan = async () => {
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
      setSession({
        images: scanned.map((o) => ({ ...o.image, upload: o.upload })),
        results,
      });
      setAssignments(initialAssignments(displayCells(results, {})));
      setInclusion({});
      setSplits({});
      setActiveCell(null);
      setQueued([]);
    } finally {
      setScanning(false);
    }
  };

  const results = useMemo(() => session?.results ?? [], [session]);
  const cells = useMemo(() => displayCells(results, splits), [results, splits]);
  const groups = useMemo(
    () => groupOwnedItems(cells, assignments, itemsById),
    [cells, assignments, itemsById],
  );

  // Items the calculator excludes start unticked here too.
  const excluded = useMemo(
    () =>
      new Set(
        groups
          .filter((group) =>
            group.itemId in inclusion
              ? !inclusion[group.itemId]
              : !!group.item && excludedNames.has(group.item.name.toLowerCase()),
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

  const needsReview = useMemo(
    () => new Set(groups.filter((g) => g.needsReview).map((g) => g.itemId)),
    [groups],
  );
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
    () => cells.filter((cell) => !cell.empty && !assignments[cell.key]).length,
    [cells, assignments],
  );

  const loadIntoCalculator = () => {
    if (!plan) return;
    const ids = plan.picks.flatMap((pick) => Array.from({ length: pick.count }, () => pick.key));
    const slotsToFill = Array.from({ length: SELECTED_ITEM_SLOT_COUNT }, (_, i) => ids[i] ?? null);
    localStorage.setItem(SELECTED_ITEM_IDS_STORAGE_KEY, JSON.stringify(slotsToFill));
    router.push("/");
  };

  const reset = () => {
    setSession(null);
    setAssignments({});
    setInclusion({});
    setSplits({});
    setActiveCell(null);
    setError(null);
  };

  const active = activeCell ? cells.find((cell) => cell.key === activeCell) : undefined;

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
    setActiveCell(null);
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
      setActiveCell(null);
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
                ? t("A real scan of a sample stash screenshot. Change the threshold or slots, click boxes to correct items, and untick items you want to keep.")
                : t("Upload screenshots of your stash or a scav case. The items are recognised, and the cheapest set that reaches your threshold is picked for the circle.")}
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
            <Button
              variant="outline"
              onClick={reset}
              className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("New scan")}
            </Button>
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

        <section className="flex flex-col items-center gap-3 rounded-3xl border border-white/8 bg-black/20 p-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <ModeThreshold
            mode={settings.gameMode}
            onModeChange={settings.setGameMode}
            threshold={settings.threshold}
            onThresholdChange={settings.setThreshold}
          />
          <ItemSocket onBonusChange={setItemBonus} />
          <div className="flex items-center gap-1 rounded-full border border-slate-600/30 bg-slate-800/70 p-1">
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
            <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-slate-300">
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
            ) : (
              <p className="max-w-md text-sm text-slate-400">
                {demoStatus === "missing"
                  ? t("The demo screenshot has not been added yet. You can still scan your own screenshots.")
                  : t("The demo could not be loaded. Try again in a moment.")}
              </p>
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
                  : t("Scan {count} screenshots", { count: queued.length })}
              </Button>
            </div>
          </section>
        )}

        {session && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="order-2 min-w-0 space-y-4 lg:order-1">
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
                  />
                  {active && active.imageIndex === imageIndex && (
                    <div id="stash-scan-inspector">
                      <CellInspector
                        key={activeCell}
                        url={session.images[imageIndex].url}
                        imageWidth={result.width}
                        imageHeight={result.height}
                        cell={active}
                        assignedItemId={assignments[active.key] ?? null}
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
                        onAssign={(itemId) => {
                          setAssignments((current) => ({ ...current, [active.key]: itemId }));
                          setActiveCell(null);
                        }}
                        onClose={() => setActiveCell(null)}
                      />
                    </div>
                  )}
                </div>
              ))}

              <OverlayLegend />

              <DetectedItems
                groups={groups}
                excluded={excluded}
                plannedCounts={plannedCounts}
                unrecognisedCount={unrecognisedCount}
                pricing={pricing}
                onHover={setHoveredItem}
                onToggle={(itemId, included) =>
                  setInclusion((current) => ({ ...current, [itemId]: included }))
                }
                onReview={(itemId) => {
                  const cell = groups.find((g) => g.itemId === itemId)?.cells[0];
                  if (cell) openCellFromList(cell);
                }}
                onShowUnrecognised={() => {
                  const cell = cells.find((c) => !c.empty && !assignments[c.key]);
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
                  needsReview={needsReview}
                  hasItems={owned.length > 0}
                  bestReachable={bestReachable}
                  onLoadIntoCalculator={loadIntoCalculator}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
