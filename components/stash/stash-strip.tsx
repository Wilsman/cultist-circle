/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  Package,
  ScanSearch,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { GAME_MODE_LABELS, type GameMode } from "@/lib/game-mode";
import {
  totalStashItems,
  type StashInventory,
} from "@/lib/stash-inventory";
import { stageScanFiles } from "@/lib/stash-scan/pending-files";
import { SCAN_LIMITS } from "@/lib/stash-scan/types";
import { cn } from "@/lib/utils";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

interface StashStripProps {
  inventory: StashInventory | null;
  itemsById: Map<string, SimplifiedItem>;
  gameMode: GameMode;
  threshold: number;
  /** Best total base value reachable from the stash (0 without inventory). */
  bestReachable: number;
  /** Whether the stash can reach the threshold with current pins/slots. */
  canReach: boolean;
  onClear: () => void;
  onToggleKeep: (itemId: string) => void;
}

const rub = (value: number) => `₽${Math.round(value).toLocaleString()}`;

function acceptedImageFiles(files: Iterable<File>): File[] {
  return [...files].filter((file) =>
    (SCAN_LIMITS.acceptedTypes as readonly string[]).includes(file.type),
  );
}

function relativeScanAge(scannedAt: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - scannedAt) / 60000));
  if (minutes < 1) return t("scanned just now");
  if (minutes < 60) return t("scanned {n} min ago", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("scanned {n} h ago", { n: hours });
  return t("scanned {n} d ago", { n: Math.floor(hours / 24) });
}

export function StashStrip({
  inventory,
  itemsById,
  gameMode,
  threshold,
  bestReachable,
  canReach,
  onClear,
  onToggleKeep,
}: StashStripProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const goScan = useCallback(
    (files?: File[]) => {
      if (files?.length) stageScanFiles(files);
      router.push("/scan");
    },
    [router],
  );

  const filesFromDataTransfer = useCallback(
    (dataTransfer: DataTransfer | null): File[] =>
      dataTransfer ? acceptedImageFiles([...dataTransfer.files]) : [],
    [],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = acceptedImageFiles(
        [...(event.clipboardData?.items ?? [])]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file)),
      );
      if (files.length) goScan(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [goScan]);

  const dropProps = {
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      const files = filesFromDataTransfer(event.dataTransfer);
      if (files.length) goScan(files);
    },
  };

  if (!inventory) {
    return (
      <div
        {...dropProps}
        className={cn(
          "flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-2 transition-colors hover:border-white/25",
          dragOver && "border-cyan-300/50 bg-cyan-300/[0.06]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <ScanSearch className="h-5 w-5 shrink-0 text-cyan-300/80" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200">
              {t("Scan your stash")}
            </p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {t(
                "Drop or paste a screenshot to find the cheapest combo from items you already own",
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goScan()}
          className="shrink-0 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          {t("Scan stash")}
        </Button>
      </div>
    );
  }

  const entries = Object.entries(inventory.items).sort((a, b) => {
    const itemA = itemsById.get(a[0]);
    const itemB = itemsById.get(b[0]);
    return (itemB?.basePrice ?? 0) - (itemA?.basePrice ?? 0);
  });

  return (
    <div
      {...dropProps}
      className={cn(
        "rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04]",
        dragOver && "border-cyan-300/50 bg-cyan-300/[0.08]",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Package className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">
              {t("My stash")}
            </span>
            <span className="truncate text-[11px] text-slate-500">
              {t("{count} items · {screenshots} screenshots · {mode}", {
                count: totalStashItems(inventory),
                screenshots: inventory.screenshots,
                mode: GAME_MODE_LABELS[inventory.gameMode || gameMode],
              })}
            </span>
          </div>
          <p className="text-[10px] text-slate-600">
            {relativeScanAge(inventory.scannedAt, t)}
          </p>
        </div>
        <span
          title={
            canReach
              ? undefined
              : t(
                  "Your stash can't reach the threshold with the current slots. Untick kept items or rescan.",
                )
          }
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            canReach
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-500/10 text-amber-200",
          )}
        >
          {canReach
            ? t("Can reach {threshold}", { threshold: rub(threshold) })
            : t("Best from stash {total}", { total: rub(bestReachable) })}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-label={expanded ? t("Hide stash items") : t("Show stash items")}
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goScan()}
          className="shrink-0 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
          <span className="hidden sm:inline">{t("Manage")}</span>
        </Button>
        <button
          type="button"
          onClick={onClear}
          aria-label={t("Clear stash")}
          title={t("Clear stash")}
          className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 border-t border-cyan-300/10 px-3 py-2.5">
              {entries.map(([itemId, entry]) => {
                const item = itemsById.get(itemId);
                const label = item
                  ? item.shortName || item.name
                  : `${itemId.slice(0, 10)}…`;
                return (
                  <button
                    key={itemId}
                    type="button"
                    onClick={() => onToggleKeep(itemId)}
                    aria-pressed={!!entry.keep}
                    title={
                      entry.keep
                        ? t("Kept — click to allow sacrificing")
                        : entry.needsReview
                          ? t("Match not confident")
                          : item?.name ?? itemId
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-left transition-colors hover:border-cyan-300/30",
                      entry.keep && "opacity-50",
                    )}
                  >
                    {item?.iconLink ? (
                      <img
                        src={item.iconLink}
                        alt=""
                        aria-hidden
                        className="h-5 w-5 shrink-0 object-contain"
                      />
                    ) : (
                      <Package className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
                    )}
                    <span
                      className={cn(
                        "max-w-28 truncate text-[11px] font-semibold text-slate-200",
                        entry.keep && "line-through",
                      )}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] tabular-nums text-cyan-300/90">
                      ×{entry.count}
                    </span>
                    {item && (
                      <span className="text-[9px] tabular-nums text-slate-600">
                        ₽{item.basePrice.toLocaleString()}
                      </span>
                    )}
                    {entry.needsReview && (
                      <AlertTriangle
                        className="h-3 w-3 shrink-0 text-yellow-300"
                        aria-label={t("Match not confident")}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
