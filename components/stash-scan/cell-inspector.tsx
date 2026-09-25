/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Scissors, Search, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import {
  cellNeedsReview,
  splitOptions,
  type DisplayCell,
  type SplitDirection,
} from "@/lib/stash-scan/owned-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { CellPreview } from "./screenshot-overlay";

interface CellInspectorProps {
  url: string;
  imageWidth: number;
  imageHeight: number;
  cell: DisplayCell;
  assignedItemId: string | null;
  reviewed?: boolean;
  similarReviewCellCount?: number;
  itemsById: Map<string, SimplifiedItem>;
  items: SimplifiedItem[];
  /** Absent when the cell is already one slot, or is itself a split slot. */
  onSplit?: (direction: SplitDirection, count: number) => void;
  splitting?: boolean;
  /** Present on a slot of a split cell: puts the cell back together. */
  onUndoSplit?: () => void;
  onAssign: (itemId: string | null, applyToSimilar?: boolean) => void;
  onClose: () => void;
  /** Rendered inside the review panel: keep the preview row, drop the X. */
  hideHeader?: boolean;
}

const SEARCH_LIMIT = 30;

export function CellInspector({
  url,
  imageWidth,
  imageHeight,
  cell,
  assignedItemId,
  reviewed = false,
  similarReviewCellCount = 0,
  itemsById,
  items,
  onSplit,
  splitting = false,
  onUndoSplit,
  onAssign,
  onClose,
  hideHeader = false,
}: CellInspectorProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.shortName.toLowerCase().includes(needle),
      )
      .slice(0, SEARCH_LIMIT);
  }, [items, query]);

  const candidates = useMemo(
    () =>
      cell.matches
        .map((match) => ({ match, item: itemsById.get(match.itemId) }))
        .filter(
          (entry, index, all) =>
            all.findIndex((e) => e.match.itemId === entry.match.itemId) === index,
        ),
    [cell, itemsById],
  );

  const needle = query.trim().toLowerCase();
  const isSearching = needle.length >= 2;

  const additionalResults = useMemo(() => {
    const candidateIds = new Set(candidates.map(({ match }) => match.itemId));
    return searchResults.filter((item) => !candidateIds.has(item.id));
  }, [candidates, searchResults]);

  // When searching, matching scan suggestions stay on top so the user does
  // not have to scroll past irrelevant candidates to reach the search list.
  const visibleCandidates = useMemo(() => {
    if (!isSearching) return candidates;
    return candidates.filter(
      ({ item, match }) =>
        item?.name.toLowerCase().includes(needle) ||
        item?.shortName.toLowerCase().includes(needle) ||
        match.itemId.toLowerCase().includes(needle),
    );
  }, [candidates, isSearching, needle]);

  // One ordered option list: visible suggestions first, then search results.
  const options = useMemo(
    () => [
      ...visibleCandidates.map(({ match }) => match.itemId),
      ...additionalResults.map((item) => item.id),
    ],
    [visibleCandidates, additionalResults],
  );

  const [highlighted, setHighlighted] = useState(() =>
    candidates.length ? 0 : -1,
  );

  // Focus the search box so the user can type immediately.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // New search results jump the highlight to the first one; keep it in range
  // when the option list shrinks.
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    if (!query.trim()) {
      setHighlighted(candidates.length > 0 ? 0 : -1);
    } else if (visibleCandidates.length > 0) {
      setHighlighted(0);
    } else {
      setHighlighted(additionalResults.length > 0 ? 0 : -1);
    }
  }
  if (highlighted >= options.length) setHighlighted(options.length - 1);

  const suggestedUnreviewed =
    !reviewed && cellNeedsReview(cell, assignedItemId);
  const highlightedItemId = options[highlighted];
  const highlightedItem = highlightedItemId
    ? itemsById.get(highlightedItemId)
    : undefined;

  const splitChoices = onSplit ? splitOptions(cell) : [];
  const rowOptions = splitChoices.filter((o) => o.direction === "rows");
  const columnOptions = splitChoices.filter((o) => o.direction === "columns");
  const slotOption = splitChoices.find((o) => o.direction === "slots");

  const scrollToHighlighted = (index: number) => {
    const itemId = options[index];
    if (itemId === undefined) return;
    document
      .getElementById(`cell-option-${index}`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const moveHighlight = (delta: number) => {
    setHighlighted((current) => {
      const next = Math.min(Math.max(current + delta, 0), options.length - 1);
      scrollToHighlighted(next);
      return next;
    });
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const itemId = options[highlighted];
      if (itemId !== undefined) onAssign(itemId, applyToSimilar);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  const option = (
    item: SimplifiedItem | undefined,
    itemId: string,
    index: number,
    score?: number,
  ) => {
    const selected = assignedItemId === itemId;
    const isHighlighted = index === highlighted;
    const suggested = selected && suggestedUnreviewed;
    return (
      <button
        key={itemId}
        id={`cell-option-${index}`}
        type="button"
        role="option"
        aria-selected={isHighlighted}
        onClick={() => onAssign(itemId, applyToSimilar)}
        onMouseEnter={() => setHighlighted(index)}
        className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors ${
          selected
            ? suggested
              ? "border-yellow-300/40 bg-yellow-300/[0.07]"
              : "border-emerald-400/40 bg-emerald-400/[0.08]"
            : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
        } ${isHighlighted ? "ring-1 ring-cyan-300/60 bg-white/[0.06]" : ""}`}
      >
        {item?.iconLink ? (
          <img src={item.iconLink} alt="" className="h-9 w-9 shrink-0 rounded bg-black/40 object-contain" />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded bg-black/40" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-slate-100">{item?.name ?? itemId}</div>
          <div className="text-xs text-slate-500">
            {item ? `₽${item.basePrice.toLocaleString()} ${t("base value")}` : t("Not in this game mode's data")}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {score !== undefined && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              suggested ? "bg-yellow-300/10 text-yellow-200" : "bg-white/5 text-slate-300"
            }`}>
              {t("Match score {score}%", { score: Math.round(score * 100) })}
            </span>
          )}
          {selected && (
            <span className={`text-[10px] font-medium ${suggested ? "text-yellow-200" : "text-emerald-300"}`}>
              {suggested ? t("Suggested match") : t("Current match")}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#11161d]/95 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <CellPreview
          url={url}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          cell={cell}
          size={Math.min(160, Math.max(112, 64 * cell.slotsWide))}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-100">{t("What is this item?")}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {t("Compare the screenshot with the suggestions. Choose the right item or mark this cell as not an item.")}
          </p>
        </div>
        {!hideHeader && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("Close")} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          role="combobox"
          aria-expanded={options.length > 0}
          aria-label={t("Search all items")}
          aria-activedescendant={
            highlighted >= 0 && options[highlighted] !== undefined
              ? `cell-option-${highlighted}`
              : undefined
          }
          placeholder={t("Search all items · ↑↓ to move · Enter to confirm")}
          className="border-white/10 bg-black/30 pl-8 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      {onSplit && splitChoices.length > 0 && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            {splitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : (
              <Scissors className="h-3.5 w-3.5 text-slate-400" />
            )}
            {t("Holds more than one item? Split it into:")}
          </div>
          {[
            { label: t("stacked vertically"), list: rowOptions },
            { label: t("side by side"), list: columnOptions },
          ].map(({ label, list }) =>
            list.length === 0 ? null : (
              <div key={label} className="flex flex-wrap items-center gap-1.5">
                <span className="w-28 shrink-0 text-[11px] text-slate-500">{label}</span>
                {list.map((choice) => (
                  <Button
                    key={`${choice.direction}-${choice.count}`}
                    size="sm"
                    variant="outline"
                    disabled={splitting}
                    onClick={() => onSplit(choice.direction, choice.count)}
                    className="h-7 border-white/10 bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    {t("{count} items", { count: choice.count })}
                  </Button>
                ))}
              </div>
            ),
          )}
          {slotOption && (
            <Button
              size="sm"
              variant="outline"
              disabled={splitting}
              onClick={() => onSplit(slotOption.direction, slotOption.count)}
              className="h-7 w-full border-white/10 bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
            >
              {t("every slot ({count} items)", { count: slotOption.count })}
            </Button>
          )}
        </div>
      )}

      {onUndoSplit && (
        <Button
          variant="outline"
          onClick={onUndoSplit}
          className="w-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          <Undo2 className="mr-2 h-4 w-4" />
          {t("Undo the split, this is one item")}
        </Button>
      )}

      {similarReviewCellCount > 0 && (
        <button
          type="button"
          role="checkbox"
          aria-checked={applyToSimilar}
          aria-label={t("Also apply this choice to {count} similar cells", {
            count: similarReviewCellCount,
          })}
          onClick={() => setApplyToSimilar((current) => !current)}
          className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
            applyToSimilar
              ? "border-cyan-300/40 bg-cyan-300/[0.08]"
              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
              applyToSimilar
                ? "border-cyan-300 bg-cyan-300 text-slate-950"
                : "border-slate-500 bg-black/30 text-transparent"
            }`}
          >
            {applyToSimilar && <Check className="h-3 w-3" />}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-medium text-slate-200">
              {t("Also apply this choice to {count} similar cells", {
                count: similarReviewCellCount,
              })}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
              {t("Only cells with the same top scan match that still need review are included.")}
            </span>
          </span>
        </button>
      )}

      {visibleCandidates.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {isSearching ? t("Matching suggestions") : t("Closest matches")}
          </div>
          <div role="listbox" aria-label={t("Closest matches")}>
            {visibleCandidates.map(({ match, item }, index) =>
              option(item, match.itemId, index, match.score),
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {(isSearching || additionalResults.length > 0) && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("Search results")}
          </div>
        )}
        <div role="listbox" aria-label={t("Search results")}>
          {additionalResults.map((item, index) =>
            option(item, item.id, visibleCandidates.length + index),
          )}
          {isSearching && visibleCandidates.length === 0 && additionalResults.length === 0 && (
            <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-center text-xs text-slate-500">
              {t("No items match “{query}”. Try a shorter name.", { query: query.trim() })}
            </p>
          )}
        </div>
      </div>

      {highlightedItemId && (
        <Button
          onClick={() => onAssign(highlightedItemId, applyToSimilar)}
          className="w-full bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <Check className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">
            {t("Confirm {item}", { item: highlightedItem?.name ?? highlightedItemId })}
          </span>
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => onAssign(null, applyToSimilar)}
        className="w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
      >
        {t("Not an item / ignore this cell")}
      </Button>
    </div>
  );
}
