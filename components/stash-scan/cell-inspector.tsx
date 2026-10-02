/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Scissors,
  Search,
  SkipForward,
  Undo2,
  X,
} from "lucide-react";
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
  onSkip?: () => void;
  /** Rendered inside the review panel: keep the preview row, drop the X. */
  hideHeader?: boolean;
}

const SEARCH_LIMIT = 30;
/** Suggestions this far below the best score fold behind "Show more". */
const WEAK_MATCH_GAP = 0.08;
/** Strong suggestions shown before "Show more". */
const CANDIDATE_LIMIT = 3;
/** Number keys that pick a listed option. */
const OPTION_KEYS = 5;

/** Typing targets keep their keys; shortcuts only use modifiers there. */
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Keyboard hint, shown only where there is likely a keyboard. */
function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      aria-hidden
      className={`hidden shrink-0 rounded border border-current/30 px-1 font-sans text-[10px] leading-4 opacity-70 sm:inline ${className ?? ""}`}
    >
      {children}
    </kbd>
  );
}

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
  onSkip,
  hideHeader = false,
}: CellInspectorProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
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
            all.findIndex((e) => e.match.itemId === entry.match.itemId) ===
            index,
        ),
    [cell, itemsById],
  );

  const needle = query.trim().toLowerCase();
  const isSearching = needle.length >= 2;

  const additionalResults = useMemo(() => {
    const candidateIds = new Set(candidates.map(({ match }) => match.itemId));
    return searchResults.filter((item) => !candidateIds.has(item.id));
  }, [candidates, searchResults]);

  // Weak suggestions (well below the best score) fold away until asked for;
  // the current match always stays visible.
  const strongCandidates = useMemo(() => {
    const best = candidates[0]?.match.score ?? 0;
    return candidates.filter(
      ({ match }, index) =>
        match.itemId === assignedItemId ||
        (index < CANDIDATE_LIMIT && best - match.score <= WEAK_MATCH_GAP),
    );
  }, [candidates, assignedItemId]);
  const hiddenCandidateCount = showAllCandidates
    ? 0
    : candidates.length - strongCandidates.length;

  // When searching, matching scan suggestions stay on top so the user does
  // not have to scroll past irrelevant candidates to reach the search list.
  const visibleCandidates = useMemo(() => {
    if (!isSearching)
      return showAllCandidates ? candidates : strongCandidates;
    return candidates.filter(
      ({ item, match }) =>
        item?.name.toLowerCase().includes(needle) ||
        item?.shortName.toLowerCase().includes(needle) ||
        match.itemId.toLowerCase().includes(needle),
    );
  }, [candidates, strongCandidates, showAllCandidates, isSearching, needle]);

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
    // Keep the on-screen keyboard closed until a touch user asks to search.
    if (window.matchMedia?.("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
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

  const confirmHighlighted = () => {
    const itemId = options[highlighted];
    if (itemId !== undefined) onAssign(itemId, applyToSimilar);
  };
  const toggleSimilar = () => {
    if (similarReviewCellCount > 0) setApplyToSimilar((current) => !current);
  };
  const pickOption = (index: number) => {
    if (index >= Math.min(OPTION_KEYS, options.length)) return;
    setHighlighted(index);
    scrollToHighlighted(index);
  };

  // Alt shortcuts work anywhere, including while typing a search; they match
  // the physical key so macOS Option combos still work. Outside text fields
  // the same keys work without Alt. Re-subscribes each render so the
  // handler always sees the current highlight.
  useEffect(() => {
    const current = { confirmHighlighted, toggleSimilar, pickOption, onSkip };
    const onKeyDown = (event: KeyboardEvent) => {
      if (splitting || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey) return;
      const digit = /^Digit([1-9])$/.exec(event.code)?.[1];
      if (event.altKey) {
        if (event.code === "KeyA") {
          event.preventDefault();
          current.toggleSimilar();
        } else if (digit) {
          event.preventDefault();
          current.pickOption(Number(digit) - 1);
        }
        return;
      }
      if (isTypingTarget(event.target)) return;
      // Dialogs and menus keep their own keys.
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[role=dialog], [role=menu]")
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.code === "KeyA" && !event.shiftKey) {
        event.preventDefault();
        current.toggleSimilar();
      } else if (event.code === "KeyS" && !event.shiftKey && current.onSkip) {
        event.preventDefault();
        current.onSkip();
      } else if (digit && !event.shiftKey) {
        event.preventDefault();
        current.pickOption(Number(digit) - 1);
      } else if (event.key === "Enter" && event.shiftKey) {
        if (current.onSkip) {
          event.preventDefault();
          current.onSkip();
        }
      } else if (
        event.key === "Enter" &&
        !(event.target instanceof HTMLButtonElement) &&
        !(event.target instanceof HTMLAnchorElement) &&
        !(event.target instanceof HTMLElement && event.target.closest("summary"))
      ) {
        event.preventDefault();
        current.confirmHighlighted();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (splitting || event.altKey) return;
    if (event.key === "Enter" && event.shiftKey && onSkip) {
      event.preventDefault();
      onSkip();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      confirmHighlighted();
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
    const shortcut = index < OPTION_KEYS ? index + 1 : null;
    return (
      <button
        key={itemId}
        id={`cell-option-${index}`}
        type="button"
        role="option"
        aria-selected={isHighlighted}
        disabled={splitting}
        onClick={() => onAssign(itemId, applyToSimilar)}
        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
          selected
            ? suggested
              ? "border-yellow-300/40 bg-yellow-300/[0.07]"
              : "border-emerald-400/40 bg-emerald-400/[0.08]"
            : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
        } ${isHighlighted ? "ring-1 ring-cyan-300/60 bg-white/[0.06]" : ""}`}
      >
        {item?.iconLink ? (
          <img
            src={item.iconLink}
            alt=""
            className="h-9 w-9 shrink-0 rounded bg-black/40 object-contain"
          />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded bg-black/40" />
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm leading-tight text-slate-100">
            {item?.name ?? itemId}
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 text-[10px] text-slate-400">
            <span>
              {item
                ? `₽${item.basePrice.toLocaleString()} ${t("base value")}`
                : t("Not in this game mode's data")}
            </span>
            {score !== undefined && (
              <span className="tabular-nums">
                {t("Match score {score}%", { score: Math.round(score * 100) })}
              </span>
            )}
          </div>
          {selected && (
            <span
              className={`text-[10px] font-medium ${suggested ? "text-yellow-200" : "text-emerald-300"}`}
            >
              {suggested ? t("Suggested match") : t("Current match")}
            </span>
          )}
        </div>
        {shortcut !== null && (
          <Kbd className="self-start text-slate-400">{shortcut}</Kbd>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <CellPreview
          url={url}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          cell={cell}
          size={Math.min(88, (112 * cell.width) / cell.height)}
          className="sm:hidden"
        />
        <CellPreview
          url={url}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          cell={cell}
          size={Math.min(160, (128 * cell.width) / cell.height)}
          className="hidden sm:block"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-100">
            {t("What is this item?")}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {t("Choose the correct item below.")}
          </p>
        </div>
        {!hideHeader && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("Close")}
            className="text-slate-400 hover:text-white"
          >
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
          placeholder={t("Search for the right item...")}
          className="border-white/10 bg-black/30 pl-8 text-slate-100 placeholder:text-slate-500"
        />
      </div>
      <p className="-mt-1 hidden text-[10px] text-slate-500 sm:block">
        {[
          t("↑↓ move"),
          t("Alt+1–5 pick"),
          t("Enter confirm"),
          onSkip && t("⇧Enter skip"),
          similarReviewCellCount > 0 && t("Alt+A similar"),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

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
              {t("Apply to {count} similar matches", {
                count: similarReviewCellCount,
              })}
            </span>
          </span>
          <Kbd className="ml-auto text-slate-400">Alt+A</Kbd>
        </button>
      )}

      <div
        className="max-h-44 space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-80"
        aria-label={t("Item matches")}
      >
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
            {!isSearching && hiddenCandidateCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllCandidates(true)}
                className="w-full rounded-lg py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                {t("Show {count} weaker matches", {
                  count: hiddenCandidateCount,
                })}
              </button>
            )}
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
            {isSearching &&
              visibleCandidates.length === 0 &&
              additionalResults.length === 0 && (
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-center text-xs text-slate-500">
                  {t("No items match “{query}”. Try a shorter name.", {
                    query: query.trim(),
                  })}
                </p>
              )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-14 z-10 flex gap-2 rounded-lg bg-[#11161d] py-2 sm:bottom-2">
        <Button
          disabled={!highlightedItemId || splitting}
          aria-label={
            highlightedItemId
              ? t("Confirm {item}", {
                  item: highlightedItem?.name ?? highlightedItemId,
                })
              : t("Choose an item")
          }
          onClick={() =>
            highlightedItemId && onAssign(highlightedItemId, applyToSimilar)
          }
          className="min-w-0 flex-1 bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <Check className="mr-2 h-4 w-4 shrink-0" />
          <span className="sm:hidden">
            {highlightedItemId ? t("Confirm match") : t("Choose an item")}
          </span>
          <span className="hidden truncate sm:inline">
            {highlightedItemId
              ? t("Confirm {item}", {
                  item: highlightedItem?.name ?? highlightedItemId,
                })
              : t("Choose an item")}
          </span>
          <Kbd className="ml-2">Enter</Kbd>
        </Button>
        {onSkip && (
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={splitting}
            aria-label={t("Skip this cell")}
            className="shrink-0 border-white/10 bg-white/5 text-slate-300"
          >
            <SkipForward className="mr-1.5 h-4 w-4" />
            {t("Skip")}
            <Kbd className="ml-2">⇧Enter</Kbd>
          </Button>
        )}
      </div>

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer py-1.5 hover:text-white">
          {t("Not an item, or multiple items?")}
        </summary>
        <div className="space-y-2 pt-2">
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
                  <div
                    key={label}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <span className="w-28 shrink-0 text-[11px] text-slate-500">
                      {label}
                    </span>
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
                  onClick={() =>
                    onSplit(slotOption.direction, slotOption.count)
                  }
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

          <Button
            variant="outline"
            disabled={splitting}
            onClick={() => onAssign(null, applyToSimilar)}
            className="w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            {t("Not an item / ignore this cell")}
          </Button>
        </div>
      </details>
    </div>
  );
}
