"use client";

import { Check, LogOut, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import type {
  CellAssignments,
  CellKey,
  DisplayCell,
  SplitDirection,
} from "@/lib/stash-scan/owned-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { ScanSession } from "@/hooks/use-stash-scan-store";
import { CellInspector } from "./cell-inspector";

interface ReviewPanelProps {
  session: ScanSession;
  /** All display cells (split cells expanded). */
  cells: DisplayCell[];
  itemsById: Map<string, SimplifiedItem>;
  items: SimplifiedItem[];
  assignments: CellAssignments;
  similarReviewCellCount: number;
  splitting: boolean;
  onSplit?: (cell: DisplayCell, direction: SplitDirection, count: number) => void;
  onUndoSplit?: (parentKey: CellKey) => void;
  /** Currently open cell (review or direct click). */
  activeCell: CellKey | null;
  reviewing: boolean;
  /** Cells still needing attention. */
  remaining: number;
  /** Cells flagged when the review started. */
  total: number;
  onStart: () => void;
  onAssign: (itemId: string | null, applyToSimilar?: boolean) => void;
  /** Advance without marking the cell reviewed. */
  onSkip: () => void;
  /** Leave guided review without finishing. */
  onExit?: () => void;
  /** Mark every remaining cell reviewed without changing matches. */
  onSkipAll?: () => void;
  onClose: () => void;
  commitLabel: string;
  /** Small explainer under the commit button (save-all vs plan). */
  commitHint?: string;
  onCommit: () => void;
  canCommit: boolean;
}

/**
 * Guided "Review mappings" flow for manage mode: walks the flagged cells one
 * by one until every match is confirmed, then offers the commit button.
 */
export function ReviewPanel({
  session,
  cells,
  itemsById,
  items,
  assignments,
  similarReviewCellCount,
  splitting,
  onSplit,
  onUndoSplit,
  activeCell,
  reviewing,
  remaining,
  total,
  onStart,
  onAssign,
  onSkip,
  onExit,
  onSkipAll,
  onClose,
  commitLabel,
  commitHint,
  onCommit,
  canCommit,
}: ReviewPanelProps) {
  const { t } = useLanguage();
  const done = Math.max(0, total - remaining);
  const open = activeCell !== null;

  const activeCellData = activeCell
    ? cells.find((cell) => cell.key === activeCell)
    : undefined;
  const activeResult = activeCellData
    ? session.results[activeCellData.imageIndex]
    : undefined;
  const activeUrl = activeCellData
    ? session.images[activeCellData.imageIndex]?.url
    : undefined;
  const active =
    activeCellData && activeResult && activeUrl
      ? { cell: activeCellData, result: activeResult, url: activeUrl }
      : null;

  let pill: React.ReactNode;
  let subline: string;
  if (open && reviewing) {
    pill = (
      <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-xs font-medium tabular-nums text-cyan-300">
        {t("{done} of {total}", { done, total })}
      </span>
    );
    subline = t("{count} items need mapping", { count: remaining });
  } else if (open) {
    pill = (
      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-300">
        {t("Fixing 1 cell")}
      </span>
    );
    subline = t("{count} items need mapping", { count: remaining });
  } else if (remaining === 0) {
    pill = (
      <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
        <Check className="h-3 w-3" aria-hidden />
        {t("All checked")}
      </span>
    );
    subline = t("Every match has been confirmed.");
  } else {
    pill = (
      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-300">
        {t("{count} to check", { count: remaining })}
      </span>
    );
    subline = t("{count} items need mapping", { count: remaining });
  }

  return (
    <div
      id="stash-scan-review"
      className="space-y-3 rounded-2xl border border-white/10 bg-[#11161d]/95 p-3 sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-100">
            {t("Review mappings")}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{subline}</p>
        </div>
        {pill}
      </div>
      {open && reviewing && total > 0 && (
        <div
          className="h-1 overflow-hidden rounded bg-white/10"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className="h-full bg-cyan-300 transition-all"
            style={{ width: `${Math.min(100, (done / total) * 100)}%` }}
          />
        </div>
      )}

      {open && active && reviewing ? (
        <>
          <CellInspector
            key={activeCell}
            url={active.url}
            imageWidth={active.result.width}
            imageHeight={active.result.height}
            cell={active.cell}
            assignedItemId={assignments[activeCell] ?? null}
            similarReviewCellCount={similarReviewCellCount}
            itemsById={itemsById}
            items={items}
            onSplit={
              active.cell.key.includes("#") || !onSplit
                ? undefined
                : (direction, count) => onSplit(active.cell, direction, count)
            }
            splitting={splitting && activeCell === active.cell.key}
            onUndoSplit={
              active.cell.key.includes("#") && onUndoSplit
                ? () => onUndoSplit(active.cell.key.split("#")[0])
                : undefined
            }
            onAssign={onAssign}
            onClose={onClose}
            hideHeader
          />
          {reviewing && (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={onSkip}
                className="w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                {t("Skip this cell")}
              </Button>
              <div className="flex gap-2">
                {onExit && (
                  <Button
                    variant="ghost"
                    onClick={onExit}
                    className="flex-1 text-slate-400 hover:text-white"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("Exit review")}
                  </Button>
                )}
                {onSkipAll && remaining > 1 && (
                  <Button
                    variant="ghost"
                    onClick={onSkipAll}
                    className="flex-1 text-slate-400 hover:text-white"
                  >
                    {t("Mark all reviewed")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      ) : remaining === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            {t("You can still click any cell on the screenshot to change it.")}
          </p>
          <Button
            onClick={onCommit}
            disabled={!canCommit}
            className="w-full bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
          >
            {commitLabel}
          </Button>
          {commitHint && (
            <p className="text-xs leading-relaxed text-slate-500">{commitHint}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={onStart}
            className="w-full bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            {total > remaining ? t("Resume review") : t("Start review")}
          </Button>
          <p className="text-xs text-slate-500">
            {t(
              "Compare the screenshot and match score. Press Enter to confirm the highlighted item, or search for the right one.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
