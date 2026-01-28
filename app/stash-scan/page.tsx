"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useItemsData } from "@/hooks/use-items-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ModeThreshold } from "@/components/mode-threshold";
import {
  buildInventoryCounts,
  matchOcrTokensToItems,
  pickOptimalCombo,
} from "@/lib/stash-scan";
import {
  AlertTriangle,
  ChevronDown,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  Search,
  Settings2,
  Shuffle,
  Trash2,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { quickScan } from "@/lib/ocr-utils";
import { createOcrMatcher as createItemMatcher } from "@/lib/stash-scan";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { SimplifiedItem } from "@/types/SimplifiedItem";

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

// Cool shuffle button with loading animation
function ShuffleButton({
  isShuffling,
  onClick,
}: {
  isShuffling: boolean;
  onClick: () => void;
}) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isShuffling) {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    return () => clearInterval(interval);
  }, [isShuffling]);

  return (
    <button
      onClick={onClick}
      disabled={isShuffling}
      className={`
        group relative h-8 px-4 rounded-full overflow-hidden text-xs font-medium
        bg-gradient-to-r from-violet-600 to-indigo-600
        hover:from-violet-500 hover:to-indigo-500
        disabled:opacity-70 disabled:cursor-not-allowed
        transition-all duration-300 ease-out
        shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50
        hover:scale-105 active:scale-95
        text-white
        border border-white/10
      `}
    >
      {/* Shimmer effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out]" />

      {/* Content */}
      <span className="relative flex items-center gap-2">
        <Shuffle
          className={`h-3.5 w-3.5 transition-all duration-500 ${isShuffling ? "animate-spin" : "group-hover:rotate-180"}`}
        />
        <span>{isShuffling ? `Shuffling${dots}` : "Shuffle"}</span>
      </span>
    </button>
  );
}

// Helper function to check if an item is in the excluded list
function isItemExcluded(item: SimplifiedItem | null | undefined): boolean {
  if (!item) return false;
  // Check against name and shortName (case-insensitive)
  const namesToCheck = [
    item.name,
    item.shortName,
    item.englishName,
    item.englishShortName,
  ].filter(Boolean);
  return namesToCheck.some((name) =>
    DEFAULT_EXCLUDED_ITEMS.has(name as string),
  );
}

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageSize, setImageSize] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    renderedWidth: number;
    renderedHeight: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Auto-scan when file is uploaded and items are ready
  useEffect(() => {
    if (file && items && ocrStatus === "idle") {
      runQuickScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, items]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile?.type.startsWith("image/")) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const runQuickScan = async () => {
    if (!file || !items) return;

    setOcrStatus("running");
    setOcrProgress(0);
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

    const tokens = lines.map((l) => l.text);
    const matchResult = matchOcrTokensToItems(tokens, items);
    setMatchedResult(matchResult);

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
  };

  const scaledLines = useMemo(() => {
    if (!imageSize || !previewImageRef.current) return [];

    const scaleX = imageSize.renderedWidth / imageSize.naturalWidth;
    const scaleY = imageSize.renderedHeight / imageSize.naturalHeight;

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

    // Pass shuffleSeed to get different combo variations
    return pickOptimalCombo(inventory, threshold, maxItems, shuffleSeed);
  }, [matchedResult, items, manualCounts, threshold, maxItems, shuffleSeed]);

  // Clear shuffling state when combo updates
  useEffect(() => {
    if (isShuffling) {
      const timer = setTimeout(() => setIsShuffling(false), 150);
      return () => clearTimeout(timer);
    }
  }, [combo, isShuffling]);

  const selectedLine = ocrLines.find((line) => line.id === selectedLineId);
  const [selectedOverride, setSelectedOverride] = useState<string>("");
  const [itemSearchQuery, setItemSearchQuery] = useState<string>("");
  const [showItemSearch, setShowItemSearch] = useState(false);

  const handleAddItem = (itemId: string) => {
    if (!itemId) return;

    setMatchedResult((prev) => {
      if (!prev) {
        const newMatched = new Map<string, number>();
        newMatched.set(itemId, 1);
        return { matched: newMatched, unmatched: [] };
      }
      const newMatched = new Map(prev.matched);
      newMatched.set(itemId, (newMatched.get(itemId) ?? 0) + 1);
      return { ...prev, matched: newMatched };
    });

    setItemSearchQuery("");
    setShowItemSearch(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setMatchedResult((prev) => {
      if (!prev) return prev;
      const newMatched = new Map(prev.matched);
      newMatched.delete(itemId);
      return { ...prev, matched: newMatched };
    });
    setManualCounts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleIncrementItem = (itemId: string) => {
    const item = matchedItems.find((m) => m.item?.id === itemId);
    if (!item?.item) return;
    const currentCount = manualCounts[itemId] ?? item.count;
    setManualCounts((prev) => ({ ...prev, [itemId]: currentCount + 1 }));
  };

  const handleDecrementItem = (itemId: string) => {
    const item = matchedItems.find((m) => m.item?.id === itemId);
    if (!item?.item) return;
    const currentCount = manualCounts[itemId] ?? item.count;
    if (currentCount <= 1) {
      handleRemoveItem(itemId);
    } else {
      setManualCounts((prev) => ({ ...prev, [itemId]: currentCount - 1 }));
    }
  };

  const filteredSearchItems = useMemo(() => {
    if (!items || !itemSearchQuery.trim()) return [];
    const query = itemSearchQuery.toLowerCase();
    return items
      .filter(
        (item) =>
          item &&
          item.basePrice != null &&
          (item.shortName?.toLowerCase().includes(query) ||
            item.name?.toLowerCase().includes(query)),
      )
      .slice(0, 8);
  }, [items, itemSearchQuery]);

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
      const newUnmatched = prev.unmatched.filter((t) => t !== entry.token);
      return { matched: newMatched, unmatched: newUnmatched };
    });

    setUnmatchedEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const matchedCount = matchedResult?.matched.size ?? 0;
  const totalValue = combo?.total ?? 0;
  const meetsThreshold = totalValue >= threshold;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1f23,_#0b0e0f_45%)] text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header - Minimal */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-100">Stash Scan</h1>
          <p className="text-sm text-slate-400">
            Upload a screenshot → Get optimal ritual combo
          </p>
        </div>

        {/* Mode/Threshold Controls - Compact pill */}
        <div className="flex justify-center">
          <ModeThreshold
            isPVE={isPVE}
            onModeToggle={(val) => setIsPVE(val)}
            threshold={threshold}
            onThresholdChange={setThreshold}
          />
        </div>

        {/* Hero Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${
            isDragging
              ? "border-emerald-400 bg-emerald-500/10"
              : file
                ? "border-slate-700 bg-slate-900/50"
                : "border-slate-700 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50 cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          {!file ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-slate-800/60 p-4 mb-4">
                <ImagePlus className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-300 font-medium mb-1">
                Drop stash screenshot here
              </p>
              <p className="text-xs text-slate-500">or click to browse</p>
            </div>
          ) : (
            <div className="p-3">
              {/* Image Preview with Overlays */}
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={previewImageRef}
                  src={previewUrl!}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLineId(line.id);
                        }}
                        className={`absolute rounded bg-transparent ${getConfidenceClass(
                          confidence,
                        )} ${selectedLineId === line.id ? "ring-2 ring-blue-400/80" : ""}`}
                        style={{ left, top, width, height }}
                        title={`${line.text} -> ${line.match?.label ?? "Unmatched"}`}
                      />
                    ),
                  )}
              </div>

              {/* Scan Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex flex-wrap gap-2">
                  {ocrStatus === "running" ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileChange(null);
                      }}
                      size="sm"
                      className="bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30"
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      onClick={runQuickScan}
                      disabled={isLoading}
                      size="sm"
                      className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30"
                    >
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                      Scan Again
                    </Button>
                  )}
                </div>
                {ocrStatus === "running" && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Scanning... {ocrProgress}%</span>
                  </div>
                )}
                {ocrStatus !== "running" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileChange(null);
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Result Card - Only shows after scan */}
        {ocrStatus === "done" &&
          combo &&
          (() => {
            // Group duplicate items
            const groupedItems = combo.items.reduce(
              (acc, item) => {
                if (!item) return acc;
                const existing = acc.find((g) => g.item.id === item.id);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ item, count: 1 });
                }
                return acc;
              },
              [] as {
                item: NonNullable<(typeof combo.items)[0]>;
                count: number;
              }[],
            );

            // Calculate estimated cost (sum of lastLowPrice for all items)
            const estCost = combo.items.reduce((sum, item) => {
              if (!item) return sum;
              return sum + (item.lastLowPrice ?? item.basePrice ?? 0);
            }, 0);

            return (
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  meetsThreshold
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-amber-500/30 bg-amber-500/10"
                }`}
              >
                {/* Header with value comparison */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">
                        Base Value
                      </div>
                      <span
                        className={`text-3xl font-bold ${meetsThreshold ? "text-emerald-300" : "text-amber-300"}`}
                      >
                        ₽{totalValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-2xl text-slate-600">/</div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        Threshold
                        <button
                          onClick={() => setAdvancedOpen(true)}
                          className="inline-flex items-center justify-center w-4 h-4 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
                          title="Edit threshold setting"
                        >
                          <Settings2 className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-2xl font-semibold text-slate-400">
                        ₽{threshold.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {matchedCount} in inventory
                    </span>
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                        meetsThreshold
                          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                      }`}
                    >
                      {meetsThreshold ? "✓ Threshold met" : "Below threshold"}
                    </span>
                  </div>
                </div>

                {groupedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          Optimal Combo · {combo.items.length} items
                          <button
                            onClick={() => setAdvancedOpen(true)}
                            className="inline-flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
                            title="Edit max items setting (current: {maxItems})"
                          >
                            <Settings2 className="h-3 w-3" />
                          </button>
                        </div>
                        {(() => {
                          const excludedCount =
                            combo.items.filter(isItemExcluded).length;
                          if (excludedCount === 0) return null;
                          return (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              title={`${excludedCount} excluded item${excludedCount > 1 ? "s" : ""} in combo`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {excludedCount} excluded
                            </span>
                          );
                        })()}
                      </div>
                      <ShuffleButton
                        isShuffling={isShuffling}
                        onClick={() => {
                          flushSync(() => setIsShuffling(true));
                          setTimeout(() => setShuffleSeed((s) => s + 1), 50);
                        }}
                      />
                    </div>
                    <div
                      className={`grid gap-1.5 ${isShuffling ? "opacity-50" : "opacity-100"} transition-opacity duration-300`}
                    >
                      {groupedItems.map(({ item, count }, index) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2 ${isShuffling ? "animate-pulse" : ""}`}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center gap-2.5">
                            {item.iconLink && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <div className="relative w-7 h-7 overflow-visible">
                                <img
                                  src={item.iconLink}
                                  alt=""
                                  className="w-7 h-7 rounded object-contain bg-slate-950 transition-all duration-300 ease-out hover:scale-[2.5] hover:z-50 hover:relative hover:rounded-lg hover:shadow-2xl cursor-zoom-in"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-slate-200">
                                {item.shortName}
                                {count > 1 && (
                                  <span className="text-emerald-400/80 ml-1.5 font-medium">
                                    ×{count}
                                  </span>
                                )}
                              </span>
                              {isItemExcluded(item) && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  title="This item is excluded from the Cultist Circle"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Excluded
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <span className="text-slate-300">
                              ₽
                              {((item.basePrice ?? 0) * count).toLocaleString()}
                            </span>
                            {item.lastLowPrice && (
                              <span className="text-slate-500 ml-2">
                                (~₽
                                {(
                                  (item.lastLowPrice ?? 0) * count
                                ).toLocaleString()}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/30 text-sm">
                      <span className="text-slate-400">Est. Flea Cost</span>
                      <span className="text-slate-300 font-medium">
                        ~₽{estCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* Error State */}
        {ocrStatus === "error" && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
            <p className="text-sm text-rose-200">
              OCR failed. Try a clearer screenshot.
            </p>
          </div>
        )}

        {hasError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
            <p className="text-sm text-rose-200">
              Failed to load items. Try refreshing.
            </p>
          </div>
        )}

        {/* Advanced Section - Collapsible */}
        {ocrStatus === "done" && (
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300 hover:bg-slate-900/70 transition-colors">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-400" />
                  <span>Advanced Options</span>
                  {unmatchedEntries.length > 0 && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                      {unmatchedEntries.length} unmatched
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              {/* Max Items */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Max items</span>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={maxItems}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isFinite(next))
                        setMaxItems(Math.min(5, Math.max(1, next)));
                    }}
                    className="w-20 h-8 bg-slate-950 border-slate-700 text-slate-200 text-center"
                  />
                </div>
              </div>

              {/* Selected Label Override */}
              {selectedLine && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">
                    Selected Label
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-400">OCR: </span>
                    <span className="text-slate-200">{selectedLine.text}</span>
                    <span className="text-slate-500 mx-2">→</span>
                    <span className="text-slate-200">
                      {selectedLine.match?.label ?? "Unmatched"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedOverride}
                      onChange={(e) => setSelectedOverride(e.target.value)}
                      className="flex-1 h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
                    >
                      <option value="">Assign item...</option>
                      {itemOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={applySelectedOverride}
                      disabled={!selectedOverride}
                      className="bg-blue-500/20 text-blue-200 border border-blue-500/30 hover:bg-blue-500/30"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              {/* Unmatched Labels */}
              {unmatchedEntries.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">
                    Unmatched Labels
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {unmatchedEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-slate-400 min-w-[80px] truncate">
                          {entry.token}
                        </span>
                        <select
                          value={entry.assignedItemId}
                          onChange={(e) =>
                            setUnmatchedEntries((prev) =>
                              prev.map((item) =>
                                item.id === entry.id
                                  ? { ...item, assignedItemId: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="flex-1 h-7 rounded border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
                        >
                          <option value="">Match...</option>
                          {itemOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleAssignUnmatched(entry.id)}
                          disabled={!entry.assignedItemId}
                          className="h-7 px-2 bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                        >
                          <Wand2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw OCR Debug */}
              {ocrText && (
                <details className="text-xs text-slate-400">
                  <summary className="cursor-pointer hover:text-slate-300">
                    Raw OCR output
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-950/60 p-3 text-[11px]">
                    {ocrText}
                  </pre>
                </details>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Inventory Section - Always visible when items exist */}
        {(matchedItems.length > 0 || ocrStatus === "done") && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Upload className="h-4 w-4 text-slate-400" />
                <span>Inventory ({matchedItems.length} items)</span>
              </div>
              {matchedItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMatchedResult(null);
                    setManualCounts({});
                  }}
                  className="h-7 text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Search to Add Item */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setShowItemSearch(true);
                  }}
                  onFocus={() => setShowItemSearch(true)}
                  placeholder="Search items to add..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-700 bg-slate-950 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
                {itemSearchQuery && (
                  <button
                    onClick={() => {
                      setItemSearchQuery("");
                      setShowItemSearch(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showItemSearch && filteredSearchItems.length > 0 && (
                <div className="absolute z-20 w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 shadow-xl max-h-64 overflow-y-auto">
                  {filteredSearchItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 transition-colors text-left"
                    >
                      {item.iconLink && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.iconLink}
                          alt=""
                          className="w-8 h-8 rounded object-contain bg-slate-950"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 truncate">
                          {item.shortName}
                        </div>
                        <div className="text-xs text-slate-500">
                          ₽{(item.basePrice ?? 0).toLocaleString()}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Item Grid - 2 columns */}
            {matchedItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedItems.map(({ item, count }) =>
                  item ? (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2"
                    >
                      {/* Item Icon */}
                      {item.iconLink && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <div className="relative w-10 h-10 overflow-visible flex-shrink-0">
                          <img
                            src={item.iconLink}
                            alt=""
                            className="w-10 h-10 rounded object-contain bg-slate-900 transition-all duration-300 ease-out hover:scale-[2] hover:z-50 hover:relative hover:rounded-lg hover:shadow-2xl cursor-zoom-in"
                          />
                        </div>
                      )}

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm text-slate-200 truncate">
                            {item.shortName}
                          </div>
                          {isItemExcluded(item) && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              title="This item is excluded from the Cultist Circle"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Excluded
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          ₽{(item.basePrice ?? 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Count Controls */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleDecrementItem(item.id)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm text-slate-200 font-medium">
                          {manualCounts[item.id] ?? count}
                        </span>
                        <button
                          onClick={() => handleIncrementItem(item.id)}
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="w-7 h-7 rounded bg-rose-500/20 hover:bg-rose-500/30 flex items-center justify-center text-rose-300 transition-colors ml-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            )}

            {matchedItems.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-4">
                No items found. Search above to add items manually.
              </p>
            )}
          </div>
        )}

        {/* Footer hint */}
        <p className="text-center text-xs text-slate-500">
          Best results: 1920×1080, UI scale 100%, stash fully visible
        </p>
      </div>
    </div>
  );
}
