"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useItemsData } from "@/hooks/use-items-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ThresholdSelector from "@/components/ui/threshold-selector";
import { TextSwitch } from "@/components/ui/text-switch";
import {
  buildInventoryCounts,
  matchOcrTokensToItems,
  pickOptimalCombo,
} from "@/lib/stash-scan";
import { Loader2, ScanText, Trash2, Wand2, Zap } from "lucide-react";
import { autoTuneOcr, quickScan } from "@/lib/ocr-utils";
import { createOcrMatcher as createItemMatcher } from "@/lib/stash-scan";

type UnmatchedEntry = {
  id: string;
  token: string;
  assignedItemId: string;
};

type OcrLineMatch = {
  id: string;
  text: string;
  normalized: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  match?: {
    itemId?: string;
    label: string;
    score: number;
    method: "exact" | "fuzzy" | "none";
  };
};

const MAX_OVERLAY_LINES = 120;

export default function StashScanPage() {
  const [isPVE, setIsPVE] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("isPVE") === "true";
  });
  const { data: items, isLoading, hasError } = useItemsData(isPVE);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrPreset, setOcrPreset] = useState<string>("");
  const [autoTuning, setAutoTuning] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrLines, setOcrLines] = useState<OcrLineMatch[]>([]);
  const [matchedResult, setMatchedResult] = useState<ReturnType<
    typeof matchOcrTokensToItems
  > | null>(null);
  const [unmatchedEntries, setUnmatchedEntries] = useState<UnmatchedEntry[]>(
    [],
  );
  const [manualCounts, setManualCounts] = useState<Record<string, number>>({});
  const [threshold, setThreshold] = useState<number>(400000);
  const [maxItems, setMaxItems] = useState<number>(5);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [overlayReady, setOverlayReady] = useState<boolean>(false);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    renderedWidth: number;
    renderedHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  const handleFileChange = (newFile: File | null) => {
    setFile(newFile);
    setOcrStatus("idle");
    setOcrText("");
    setOcrLines([]);
    setMatchedResult(null);
    setUnmatchedEntries([]);
    setManualCounts({});
    setSelectedLineId(null);
  };

  // Create a matcher function that counts how many tokens match items
  const countMatches = (tokens: string[]): number => {
    if (!items) return 0;
    const matcher = createItemMatcher(items);
    let count = 0;
    for (const token of tokens) {
      const result = matcher(token);
      if (
        result.method === "exact" ||
        (result.method === "fuzzy" && result.score <= 0.22)
      ) {
        count++;
      }
    }
    return count;
  };

  // Quick scan with default settings
  const runQuickScan = async () => {
    if (!file || !items) return;

    setOcrStatus("running");
    setOcrProgress(0);
    setOcrPreset("Quick Scan");
    setAutoTuning(false);
    setOcrLines([]);
    setMatchedResult(null);
    setUnmatchedEntries([]);

    try {
      const imageUrl = URL.createObjectURL(file);
      const result = await quickScan(imageUrl, setOcrProgress);
      URL.revokeObjectURL(imageUrl);

      processOcrResult(result.words, result.text);
      setOcrStatus("done");
    } catch (error) {
      setOcrStatus("error");
      console.error("OCR failed:", error);
    }
  };

  // Auto-tune scan that tries multiple presets
  const runAutoTuneScan = async () => {
    if (!file || !items) return;

    setOcrStatus("running");
    setOcrProgress(0);
    setAutoTuning(true);
    setOcrLines([]);
    setMatchedResult(null);
    setUnmatchedEntries([]);

    try {
      const imageUrl = URL.createObjectURL(file);

      const result = await autoTuneOcr(
        imageUrl,
        countMatches,
        (preset, total, progress) => {
          setOcrPreset(`Trying preset ${preset}/${total}`);
          setOcrProgress(progress);
        },
      );

      URL.revokeObjectURL(imageUrl);

      setOcrPreset(`Best: ${result.matchedCount} items matched`);
      processOcrResult(result.words, result.text);
      setOcrStatus("done");
      setAutoTuning(false);
    } catch (error) {
      setOcrStatus("error");
      setAutoTuning(false);
      console.error("OCR failed:", error);
    }
  };

  // Process OCR result into lines and matches
  const processOcrResult = (
    words: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>,
    rawText: string,
  ) => {
    if (!items) return;

    setOcrText(rawText);

    const lines: OcrLineMatch[] = words
      .filter((w) => w.text && w.text.trim().length >= 2)
      .slice(0, MAX_OVERLAY_LINES)
      .map((w, idx: number) => ({
        id: `ocr-${idx}`,
        text: w.text,
        normalized: w.text.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        bbox: w.bbox,
      }));

    // Match tokens to items
    const tokens = lines.map((l) => l.text);
    const matchResult = matchOcrTokensToItems(tokens, items);
    setMatchedResult(matchResult);

    // Update lines with match info using the matcher
    const matcher = createItemMatcher(items);
    const updatedLines = lines.map((line) => {
      const result = matcher(line.text);
      if (result.item && (result.method === "exact" || result.score <= 0.22)) {
        return {
          ...line,
          match: {
            itemId: result.item.id,
            label: result.item.shortName ?? "Unknown",
            score: 1 - result.score,
            method: result.method,
          },
        };
      }
      return line;
    });

    setOcrLines(updatedLines);

    // Create unmatched entries (filter out very short tokens)
    const unmatchedTokens = matchResult.unmatched
      .filter((token) => token.length >= 3)
      .map((token, idx) => ({
        id: `unmatched-${idx}`,
        token,
        assignedItemId: "",
      }));
    setUnmatchedEntries(unmatchedTokens);
  };

  const handleImageLoaded = () => {
    if (!previewImageRef.current) return;

    const img = previewImageRef.current;
    setImageSize({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: img.width,
      renderedHeight: img.height,
    });
    setOverlayReady(true);
  };

  const ocrStatusLabel = {
    idle: "Ready",
    running: "Scanning",
    done: "Complete",
    error: "Failed",
  }[ocrStatus];

  const showHighlights = ocrLines.length > 0;

  const scaledLines = useMemo(() => {
    if (!imageSize || !previewImageRef.current) return [];

    const scaleX = imageSize.renderedWidth / imageSize.naturalWidth;
    const scaleY = imageSize.renderedHeight / imageSize.naturalHeight;

    // Only include lines that have valid bounding boxes (not null/placeholder)
    return ocrLines
      .filter(
        (line) =>
          line.bbox &&
          line.bbox.x0 !== undefined &&
          line.bbox.x1 > line.bbox.x0,
      )
      .slice(0, MAX_OVERLAY_LINES)
      .map((line) => ({
        line,
        left: line.bbox.x0 * scaleX,
        top: line.bbox.y0 * scaleY,
        width: (line.bbox.x1 - line.bbox.x0) * scaleX,
        height: (line.bbox.y1 - line.bbox.y0) * scaleY,
        confidence: line.match?.score ?? 0,
      }));
  }, [imageSize, ocrLines]);

  const getConfidenceClass = (confidence: number) => {
    // Outline-only styling (no fill)
    if (confidence >= 0.8) return "border-2 border-emerald-400";
    if (confidence >= 0.6) return "border-2 border-amber-400";
    if (confidence >= 0.4) return "border-2 border-rose-400";
    return "border-2 border-slate-400";
  };

  const combo = useMemo(() => {
    if (!matchedResult || !items) return null;

    const inventory = buildInventoryCounts(
      items,
      matchedResult.matched,
      manualCounts,
    );

    return pickOptimalCombo(inventory, threshold, maxItems);
  }, [matchedResult, items, manualCounts, threshold, maxItems]);

  const selectedLine = ocrLines.find((line) => line.id === selectedLineId);
  const [selectedOverride, setSelectedOverride] = useState<string>("");
  const [manualAddItem, setManualAddItem] = useState<string>("");

  // Function to manually add an item to inventory
  const handleManualAddItem = () => {
    if (!manualAddItem) return;

    setMatchedResult((prev) => {
      if (!prev) {
        const newMatched = new Map<string, number>();
        newMatched.set(manualAddItem, 1);
        return { matched: newMatched, unmatched: [] };
      }
      const newMatched = new Map(prev.matched);
      newMatched.set(manualAddItem, (newMatched.get(manualAddItem) ?? 0) + 1);
      return { ...prev, matched: newMatched };
    });

    setManualAddItem("");
  };

  const itemOptions = useMemo(() => {
    if (!items) return [];
    return items
      .filter((item) => item && item.basePrice != null)
      .map((item) => ({
        id: item.id,
        label: `${item.shortName ?? "Unknown"} (₽${(item.basePrice ?? 0).toLocaleString()})`,
      }));
  }, [items]);

  const applySelectedOverride = () => {
    if (!selectedOverride || !selectedLine) return;

    // Update the line match
    setOcrLines((prev) =>
      prev.map((line) =>
        line.id === selectedLineId
          ? {
              ...line,
              match: {
                itemId: selectedOverride,
                label:
                  items?.find((item) => item.id === selectedOverride)
                    ?.shortName ?? "Unknown",
                score: 1,
                method: "exact" as const,
              },
            }
          : line,
      ),
    );

    // Also update matchedResult to include this item
    setMatchedResult((prev) => {
      if (!prev) {
        const newMatched = new Map<string, number>();
        newMatched.set(selectedOverride, 1);
        return { matched: newMatched, unmatched: [] };
      }
      const newMatched = new Map(prev.matched);
      newMatched.set(
        selectedOverride,
        (newMatched.get(selectedOverride) ?? 0) + 1,
      );
      return { ...prev, matched: newMatched };
    });

    setSelectedOverride("");
    setSelectedLineId(null);
  };

  const handleManualCountChange = (itemId: string, value: string) => {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return;

    setManualCounts((prev) => ({
      ...prev,
      [itemId]: count,
    }));
  };

  const matchedItems = useMemo(() => {
    if (!matchedResult || !items) return [];

    const itemCounts = new Map<string, number>();

    matchedResult.matched.forEach((count, itemId) => {
      const current = itemCounts.get(itemId) ?? 0;
      itemCounts.set(itemId, current + count);
    });

    return Array.from(itemCounts.entries()).map(([itemId, count]) => {
      const item = items.find((i) => i.id === itemId);
      return { item, count };
    });
  }, [matchedResult, items]);

  const handleAssignUnmatched = (entryId: string) => {
    const entry = unmatchedEntries.find((e) => e.id === entryId);
    if (!entry || !entry.assignedItemId) return;

    // Add to matchedResult so it shows in combo calculation
    setMatchedResult((prev) => {
      if (!prev) {
        const newMatched = new Map<string, number>();
        newMatched.set(entry.assignedItemId, 1);
        return { matched: newMatched, unmatched: [] };
      }
      const newMatched = new Map(prev.matched);
      newMatched.set(
        entry.assignedItemId,
        (newMatched.get(entry.assignedItemId) ?? 0) + 1,
      );
      // Remove from unmatched list in result
      const newUnmatched = prev.unmatched.filter((t) => t !== entry.token);
      return { matched: newMatched, unmatched: newUnmatched };
    });

    // Remove from unmatched entries UI
    setUnmatchedEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1f23,_#0b0e0f_45%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-amber-300/80">
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1">
                Items OCR
              </span>
              <span className="text-slate-500">Stash capture pipeline</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-100">
              Stash Screenshot Scan
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Upload a stash screenshot, extract item labels, and assemble the
              best combo to hit your ritual threshold. OCR is best-effort - you
              can correct mismatches below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <div className="text-xs text-slate-400">Mode</div>
            <TextSwitch
              checked={isPVE}
              onCheckedChange={(value) => setIsPVE(Boolean(value))}
              labelLeft="PVP"
              labelRight="PVE"
              rootClassName="h-9 w-24"
              thumbClassName="h-7 w-10"
            />
            <div className="hidden h-9 w-px bg-slate-700/60 sm:block" />
            <ThresholdSelector value={threshold} onChange={setThreshold} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.65fr]">
          <Card className="bg-slate-900/70 border-slate-800/80 shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
            <CardHeader className="space-y-3 border-b border-slate-800/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Stash OCR Console</CardTitle>
                  <p className="text-xs text-slate-400">
                    Best results: 1920x1080, UI scale 100%, stash fully visible.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span
                    className={`rounded-full border px-2.5 py-1 uppercase tracking-[0.2em] ${
                      ocrStatus === "running"
                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                        : ocrStatus === "error"
                          ? "border-rose-400/50 bg-rose-500/10 text-rose-200"
                          : "border-slate-600/60 bg-slate-900/70 text-slate-400"
                    }`}
                  >
                    {ocrStatusLabel}
                  </span>
                  {unmatchedEntries.length > 0 && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                      {unmatchedEntries.length} unmatched
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleFileChange(event.target.files?.[0] ?? null)
                  }
                  className="bg-slate-950 border-slate-800 text-slate-200"
                />
                <Button
                  onClick={runQuickScan}
                  disabled={!file || isLoading || ocrStatus === "running"}
                  className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30"
                >
                  {ocrStatus === "running" && !autoTuning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning {ocrProgress}%
                    </>
                  ) : (
                    <>
                      <ScanText className="mr-2 h-4 w-4" />
                      Quick Scan
                    </>
                  )}
                </Button>
                <Button
                  onClick={runAutoTuneScan}
                  disabled={!file || isLoading || ocrStatus === "running"}
                  className="bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30"
                >
                  {ocrStatus === "running" && autoTuning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {ocrPreset || `${ocrProgress}%`}
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Auto-Tune
                    </>
                  )}
                </Button>
                {file && (
                  <Button
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200"
                    onClick={() => handleFileChange(null)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
              {!overlayReady && showHighlights && ocrStatus === "done" && (
                <div className="text-xs text-slate-500">
                  Rendering overlays...
                </div>
              )}
              {hasError && (
                <p className="text-sm text-rose-400">
                  Failed to load item list. Try refreshing.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {previewUrl ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
                  <div className="relative overflow-hidden rounded-xl border border-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={previewImageRef}
                      src={previewUrl}
                      alt="Stash preview"
                      className="w-full rounded-xl"
                      onLoad={handleImageLoaded}
                    />
                    {imageSize &&
                      scaledLines.map(
                        ({ line, left, top, width, height, confidence }) => (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => setSelectedLineId(line.id)}
                            className={`absolute rounded bg-transparent ${getConfidenceClass(
                              confidence,
                            )} ${selectedLineId === line.id ? "ring-2 ring-blue-400/80" : ""}`}
                            style={{
                              left,
                              top,
                              width,
                              height,
                            }}
                            title={`${line.text} -> ${line.match?.label ?? "Unmatched"}`}
                          >
                            {selectedLineId === line.id && (
                              <span className="absolute left-0 top-0 translate-y-[-100%] rounded bg-slate-950/80 px-1 py-0.5 text-[10px] text-slate-100">
                                {line.match?.label ?? "Unmatched"}{" "}
                                {confidence > 0
                                  ? `${Math.round(confidence * 100)}%`
                                  : ""}
                              </span>
                            )}
                          </button>
                        ),
                      )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Overlay boxes: {scaledLines.length}</span>
                    <span>Hover + click to validate</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/40 p-8 text-center text-sm text-slate-500">
                  Drop a stash screenshot to preview the OCR overlay.
                </div>
              )}

              {ocrStatus === "error" && (
                <p className="text-sm text-rose-400">
                  OCR failed. Try a clearer screenshot or re-run the scan.
                </p>
              )}

              {ocrText && (
                <details className="text-xs text-slate-400">
                  <summary className="cursor-pointer">
                    Raw OCR output (debug)
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-950/60 p-3 text-[11px] leading-relaxed">
                    {ocrText}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-slate-900/70 border-slate-800/80">
              <CardHeader className="space-y-2 border-b border-slate-800/60">
                <CardTitle className="text-lg">Tracker Console</CardTitle>
                <p className="text-xs text-slate-400">
                  Prioritize the cleanest combo and audit OCR selections.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Max items</span>
                    <span className="text-slate-500">1-5</span>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={maxItems}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isFinite(next)) return;
                      setMaxItems(Math.min(5, Math.max(1, next)));
                    }}
                    className="w-24 bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>

                {combo && combo.items.length > 0 ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-100">Total base value</span>
                      <span className="font-semibold text-emerald-300">
                        ₽{(combo.total ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {combo.items.map((item, index) => {
                        if (!item) return null;
                        return (
                          <div
                            key={`${item.id}-${index}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="text-slate-100">
                              {item.shortName ?? "Unknown"}
                            </span>
                            <span className="text-slate-400">
                              ₽{(item.basePrice ?? 0).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Scan a stash to see suggested items.
                  </p>
                )}

                <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-3">
                  <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">
                    Highlighted label
                  </div>
                  {selectedLine ? (
                    <div className="space-y-3 text-xs text-slate-400">
                      <div>
                        OCR token:{" "}
                        <span className="text-slate-200 font-semibold">
                          {selectedLine.text}
                        </span>
                      </div>
                      <div>
                        Match:{" "}
                        <span className="text-slate-200 font-semibold">
                          {selectedLine.match?.label ?? "Unmatched"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          value={selectedOverride}
                          onChange={(event) =>
                            setSelectedOverride(event.target.value)
                          }
                          className="h-9 rounded-md border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                        >
                          <option value="">Assign item...</option>
                          {itemOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={applySelectedOverride}
                          disabled={!selectedOverride}
                          className="bg-blue-500/20 text-blue-200 border border-blue-500/30 hover:bg-blue-500/30"
                        >
                          Add +1
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Click a highlighted label to inspect or correct it.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-slate-900/70 border-slate-800/80">
          <CardHeader className="space-y-2 border-b border-slate-800/60">
            <CardTitle className="text-lg">Inventory Tracker</CardTitle>
            <p className="text-xs text-slate-400">
              Adjust counts or add unmatched labels to improve accuracy.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Manual item addition */}
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 space-y-3">
              <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">
                Add item manually
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={manualAddItem}
                  onChange={(e) => setManualAddItem(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                >
                  <option value="">Select item to add...</option>
                  {itemOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleManualAddItem}
                  disabled={!manualAddItem}
                  className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30"
                >
                  Add Item
                </Button>
              </div>
            </div>

            {matchedItems.length === 0 ? (
              <p className="text-xs text-slate-500">
                No matched items yet. Run a scan or add items manually.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {matchedItems.map(({ item, count }) => {
                  if (!item) return null;
                  const displayCount = manualCounts[item.id] ?? count;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="text-sm text-slate-200">
                          {item.shortName}
                        </div>
                        <div className="text-xs text-slate-500">
                          ₽{(item.basePrice ?? 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          value={displayCount}
                          onChange={(event) =>
                            handleManualCountChange(item.id, event.target.value)
                          }
                          className="w-20 bg-slate-950 border-slate-800 text-slate-200"
                        />
                        <span className="text-xs text-slate-500">detected</span>
                      </div>
                    </div>
                  );
                })}
                <div className="lg:col-span-2">
                  <Button
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-200"
                    onClick={() => setManualCounts({})}
                  >
                    Reset manual counts
                  </Button>
                </div>
              </div>
            )}

            {unmatchedEntries.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  Unmatched labels
                </h3>
                {unmatchedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="text-xs text-slate-400">{entry.token}</div>
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <select
                        value={entry.assignedItemId}
                        onChange={(event) =>
                          setUnmatchedEntries((prev) =>
                            prev.map((item) =>
                              item.id === entry.id
                                ? {
                                    ...item,
                                    assignedItemId: event.target.value,
                                  }
                                : item,
                            ),
                          )
                        }
                        className="h-9 rounded-md border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                      >
                        <option value="">Match item…</option>
                        {itemOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleAssignUnmatched(entry.id)}
                        disabled={!entry.assignedItemId}
                        className="bg-blue-500/20 text-blue-200 border border-blue-500/30 hover:bg-blue-500/30"
                      >
                        <Wand2 className="mr-2 h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
