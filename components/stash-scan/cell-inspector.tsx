/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Scissors, Search, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import type { DisplayCell } from "@/lib/stash-scan/owned-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { CellPreview } from "./screenshot-overlay";

interface CellInspectorProps {
  url: string;
  imageWidth: number;
  imageHeight: number;
  cell: DisplayCell;
  assignedItemId: string | null;
  itemsById: Map<string, SimplifiedItem>;
  items: SimplifiedItem[];
  /** Absent when the cell is already one slot, or is itself a split slot. */
  onSplit?: () => void;
  splitting?: boolean;
  /** Present on a slot of a split cell: puts the cell back together. */
  onUndoSplit?: () => void;
  onAssign: (itemId: string | null) => void;
  onClose: () => void;
}

const SEARCH_LIMIT = 30;

export function CellInspector({
  url,
  imageWidth,
  imageHeight,
  cell,
  assignedItemId,
  itemsById,
  items,
  onSplit,
  splitting = false,
  onUndoSplit,
  onAssign,
  onClose,
}: CellInspectorProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");

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

  const candidates = cell.matches
    .map((match) => ({ match, item: itemsById.get(match.itemId) }))
    .filter((entry, index, all) => all.findIndex((e) => e.match.itemId === entry.match.itemId) === index);

  const slots = cell.slotsWide * cell.slotsHigh;

  const option = (item: SimplifiedItem | undefined, itemId: string, detail?: string) => {
    const selected = assignedItemId === itemId;
    return (
      <button
        key={itemId}
        type="button"
        onClick={() => onAssign(itemId)}
        className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors ${
          selected
            ? "border-emerald-400/40 bg-emerald-400/[0.08]"
            : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
        }`}
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
            {detail ? ` · ${detail}` : ""}
          </div>
        </div>
        {selected && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}
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
          size={Math.min(160, 64 * cell.slotsWide)}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-100">{t("What is this item?")}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {t("Pick the right item if the scan got it wrong, or mark the cell as not an item.")}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("Close")} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {onSplit && slots > 1 && (
        <Button
          variant="outline"
          onClick={onSplit}
          disabled={splitting}
          className="w-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
        >
          {splitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Scissors className="mr-2 h-4 w-4" />
          )}
          {slots === 2
            ? t("This is two items, not one")
            : t("This is {count} separate items", { count: slots })}
        </Button>
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

      {candidates.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("Closest matches")}
          </div>
          {candidates.map(({ match, item }) =>
            option(item, match.itemId, `${Math.round(match.score * 100)}%`),
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search all items")}
            className="border-white/10 bg-black/30 pl-8 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        {searchResults.map((item) => option(item, item.id))}
      </div>

      <Button
        variant="outline"
        onClick={() => onAssign(null)}
        className="w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
      >
        {t("Not an item / ignore this cell")}
      </Button>
    </div>
  );
}
