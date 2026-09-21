/* eslint-disable @next/next/no-img-element */
"use client";

import { useLanguage } from "@/contexts/language-context";
import {
  cellNeedsReview,
  type CellAssignments,
  type CellKey,
  type DisplayCell,
} from "@/lib/stash-scan/owned-items";
import type { ScanImageResult } from "@/lib/stash-scan/types";

interface ScreenshotOverlayProps {
  url: string;
  result: ScanImageResult;
  /** This screenshot's cells, split cells already expanded. */
  cells: DisplayCell[];
  assignments: CellAssignments;
  /** Cells chosen for the sacrifice. */
  plannedCells: ReadonlySet<CellKey>;
  /** Cells of the item hovered in the list. */
  highlightedCells: ReadonlySet<CellKey>;
  activeCell: CellKey | null;
  onSelectCell: (key: CellKey) => void;
  /** Make cells that still need a review pop and dim the rest. */
  emphasiseAttention?: boolean;
  /** Confirmed/corrected cells; they render as normal recognised cells. */
  reviewedCells?: ReadonlySet<CellKey>;
}

export function ScreenshotOverlay({
  url,
  result,
  cells: allCells,
  assignments,
  plannedCells,
  highlightedCells,
  activeCell,
  onSelectCell,
  emphasiseAttention = false,
  reviewedCells,
}: ScreenshotOverlayProps) {
  const { t } = useLanguage();

  const cells = allCells
    .filter((cell) => !cell.empty)
    .map((cell) => ({ cell, key: cell.key }));

  // Same rule as groupOwnedItems' needsReview: unassigned, or assigned to the
  // best match without high confidence.
  const needsAttention = (key: CellKey, cell: (typeof cells)[number]["cell"]) => {
    if (reviewedCells?.has(key)) return false;
    const assigned = assignments[key];
    if (!assigned) return true;
    return cellNeedsReview(cell, assigned);
  };
  const attentionCount = cells.filter(({ cell, key }) =>
    needsAttention(key, cell),
  ).length;
  const emphasise = emphasiseAttention && attentionCount > 0;

  // Draw the boxes that need attention last, so neighbours never cover them.
  const layer = (key: CellKey) =>
    activeCell === key ? 3 : !assignments[key] ? 2 : plannedCells.has(key) ? 1 : 0;
  cells.sort((a, b) => layer(a.key) - layer(b.key));

  return (
    <figure className="space-y-2">
      {emphasise && (
        <figcaption className="text-xs text-yellow-200/90">
          {t("{count} cells need a look — click one to fix it", {
            count: attentionCount,
          })}
        </figcaption>
      )}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <img src={url} alt={t("Scanned screenshot")} className="block h-auto w-full" />
        <svg
          viewBox={`0 0 ${result.width} ${result.height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {cells.map(({ cell, key }) => {
            const assigned = assignments[key];
            const planned = plannedCells.has(key);
            const highlighted = highlightedCells.has(key);
            const active = activeCell === key;
            const unrecognised = !assigned;
            const flagged = needsAttention(key, cell);
            const reviewed = reviewedCells?.has(key) ?? false;
            // Ignored cells (reviewed + unassigned) fade to neutral.
            const ignored = reviewed && unrecognised;
            const colour = active
              ? "#ffffff"
              : ignored
                ? "#64748b"
                : unrecognised
                  ? "#f87171"
                  : planned
                    ? "#fbbf24"
                    : reviewed || cell.confidence === "high"
                      ? "#34d399"
                      : "#facc15";
            const fill = ignored
              ? "transparent"
              : unrecognised
                ? "rgba(248, 113, 113, 0.3)"
                : emphasise && flagged
                  ? "rgba(250, 204, 21, 0.28)"
                  : planned
                    ? "rgba(251, 191, 36, 0.18)"
                    : highlighted || active
                      ? "rgba(255, 255, 255, 0.12)"
                      : "transparent";
            // Widths are screen pixels (non-scaling), so boxes stay visible
            // however far a large screenshot is shrunk to fit.
            const width =
              active || (emphasise && flagged)
                ? 3
                : ignored
                  ? 1
                  : unrecognised || planned
                    ? 2.5
                    : highlighted
                      ? 2
                      : emphasise
                        ? 1
                        : 1.5;
            return (
              <g
                key={key}
                role="button"
                tabIndex={0}
                aria-label={
                  ignored
                    ? t("Ignored cell")
                    : assigned
                      ? (cell.matches.find((m) => m.itemId === assigned)?.shortName ?? t("Item"))
                      : t("Unrecognised item")
                }
                onClick={() => onSelectCell(key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelectCell(key);
                }}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  x={cell.x + 1}
                  y={cell.y + 1}
                  width={cell.width - 2}
                  height={cell.height - 2}
                  fill={fill}
                  stroke={colour}
                  strokeOpacity={
                    emphasise && !flagged && !highlighted && !active
                      ? 0.25
                      : ignored
                        ? 0.5
                        : unrecognised || planned || highlighted || active
                          ? 1
                          : 0.7
                  }
                  strokeWidth={width}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={!(emphasise && flagged) && !reviewed && !unrecognised && !planned && cell.confidence !== "high" ? "5 3" : undefined}
                  className={
                    (unrecognised || (emphasise && flagged)) && !active && !reviewed
                      ? "animate-pulse"
                      : undefined
                  }
                />
              </g>
            );
          })}
        </svg>
      </div>
      {result.pitch === 0 && (
        <figcaption className="text-xs text-amber-300/90">
          {t("No inventory grid was found in this screenshot.")}
        </figcaption>
      )}
    </figure>
  );
}

/** Explains the box colours drawn over screenshots. */
export function OverlayLegend({ showPlanned = true }: { showPlanned?: boolean }) {
  const { t } = useLanguage();
  const entries = [
    ...(showPlanned
      ? [{ label: t("Chosen for the circle"), className: "border-amber-400 bg-amber-400/20" }]
      : []),
    { label: t("Recognised"), className: "border-emerald-400" },
    { label: t("Check the match"), className: "border-dashed border-yellow-400" },
    { label: t("Not recognised"), className: "border-red-400 bg-red-400/30" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
      {entries.map((entry) => (
        <li key={entry.label} className="flex items-center gap-1.5">
          <span aria-hidden className={`h-3 w-3 rounded-[3px] border-2 ${entry.className}`} />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

interface CellPreviewProps {
  url: string;
  imageWidth: number;
  imageHeight: number;
  cell: { x: number; y: number; width: number; height: number };
  size: number;
}

/** The cell's region of the screenshot, scaled to `size` px wide. */
export function CellPreview({ url, imageWidth, imageHeight, cell, size }: CellPreviewProps) {
  const scale = size / cell.width;
  return (
    <div
      aria-hidden
      className="shrink-0 rounded-md border border-white/10"
      style={{
        width: size,
        height: cell.height * scale,
        backgroundImage: `url(${url})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${imageWidth * scale}px ${imageHeight * scale}px`,
        backgroundPosition: `${-cell.x * scale}px ${-cell.y * scale}px`,
      }}
    />
  );
}
