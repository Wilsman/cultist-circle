/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import {
  sacrificeBaseValue,
  valueGivenUp,
  type OwnedGroup,
  type PricingSettings,
} from "@/lib/stash-scan/owned-items";

const rub = (value: number) => `₽${Math.round(value).toLocaleString()}`;
type ItemFilter = "all" | "planned" | "review";
type ItemSort = "value" | "count" | "name";

interface DetectedItemsProps {
  groups: OwnedGroup[];
  excluded: ReadonlySet<string>;
  plannedCounts: ReadonlyMap<string, number>;
  unrecognisedCount: number;
  pricing: PricingSettings;
  /** Flagged cells per item, so Check can show how many need a look. */
  reviewCounts?: ReadonlyMap<string, number>;
  onToggle: (itemId: string, included: boolean) => void;
  onHover: (itemId: string | null) => void;
  onReview: (itemId: string) => void;
  onShowUnrecognised: () => void;
}

export function DetectedItems({
  groups,
  excluded,
  plannedCounts,
  unrecognisedCount,
  pricing,
  reviewCounts,
  onToggle,
  onHover,
  onReview,
  onShowUnrecognised,
}: DetectedItemsProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [sort, setSort] = useState<ItemSort>("value");
  const totalItems = groups.reduce((sum, group) => sum + group.cells.length, 0);
  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = groups.filter((group) => {
      if (filter === "planned" && !plannedCounts.get(group.itemId)) return false;
      if (filter === "review" && !group.needsReview) return false;
      if (!needle) return true;
      return [group.item?.name, group.item?.shortName, group.itemId]
        .some((name) => name?.toLowerCase().includes(needle));
    });
    const sorted = [...filtered];
    if (sort === "count") {
      sorted.sort((a, b) => b.cells.length - a.cells.length || (b.item?.basePrice ?? 0) - (a.item?.basePrice ?? 0));
    } else if (sort === "name") {
      sorted.sort((a, b) => (a.item?.name ?? a.itemId).localeCompare(b.item?.name ?? b.itemId));
    }
    return sorted;
  }, [groups, plannedCounts, query, filter, sort]);

  const filters: Array<{ value: ItemFilter; label: string }> = [
    { value: "all", label: t("All") },
    { value: "planned", label: t("In plan") },
    { value: "review", label: t("Needs review") },
  ];

  const sorts: Array<{ value: ItemSort; label: string }> = [
    { value: "value", label: t("Value") },
    { value: "count", label: t("Count") },
    { value: "name", label: t("Name") },
  ];

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-slate-200">
          {t("Found {items} items · {types} types", {
            items: totalItems,
            types: groups.length,
          })}
        </h2>
        {unrecognisedCount > 0 && (
          <button
            type="button"
            onClick={onShowUnrecognised}
            className="text-xs text-red-300 underline decoration-red-300/40 underline-offset-2 hover:text-red-200"
          >
            {t("{count} not recognised, show and identify", {
              count: unrecognisedCount,
            })}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search detected items")}
            aria-label={t("Search detected items")}
            className="h-9 border-white/10 bg-black/30 pl-8 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <div role="group" aria-label={t("Filter detected items")} className="flex flex-wrap gap-1">
            {filters.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                  filter === value
                    ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t("Sort detected items")} className="flex flex-wrap gap-1">
            {sorts.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={sort === value}
                title={t("Sort detected items")}
                onClick={() => setSort(value)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                  sort === value
                    ? "border-slate-300/40 bg-white/10 text-slate-100"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(query.trim() || filter !== "all") && (
        <p role="status" className="text-xs text-slate-500">
          {t("Showing {shown} of {total} item types", {
            shown: visibleGroups.length,
            total: groups.length,
          })}
        </p>
      )}

      {visibleGroups.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-5 text-center text-sm text-slate-400">
          {t("No items match these filters.")}
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {visibleGroups.map((group) => {
            const { item } = group;
            const sellValue = item ? valueGivenUp(item, pricing) : null;
            const included = !excluded.has(group.itemId);
            const planned = plannedCounts.get(group.itemId) ?? 0;
            return (
              <li
                key={group.itemId}
                onMouseEnter={() => onHover(group.itemId)}
                onMouseLeave={() => onHover(null)}
                className={`flex items-center gap-3 px-3 py-2 ${planned ? "bg-amber-400/[0.06]" : ""} ${included ? "" : "opacity-50"}`}
              >
                <Checkbox
                  checked={included}
                  disabled={!item}
                  onCheckedChange={(checked) => onToggle(group.itemId, checked === true)}
                  aria-label={t("Include this item in the sacrifice")}
                />
                {item?.iconLink ? (
                  <img src={item.iconLink} alt="" className="h-9 w-9 shrink-0 rounded bg-black/40 object-contain" />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded bg-black/40" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-slate-100">
                      {item?.name ?? t("Unknown item")}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">
                      ×{group.cells.length}
                    </span>
                    {planned > 0 && (
                      <span className="shrink-0 rounded-sm border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                        {t("Use {count}", { count: planned })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs tabular-nums text-slate-500">
                    {item
                      ? `${rub(sacrificeBaseValue(item, pricing.itemBonus))} ${t("base")} · ${sellValue !== null && Number.isFinite(sellValue) ? `${rub(sellValue)} ${t("value")}` : t("Price unavailable")}`
                      : t("Not in this game mode's data")}
                  </div>
                </div>
                {group.needsReview && (
                  <button
                    type="button"
                    onClick={() => onReview(group.itemId)}
                    title={t("Open the first cell that needs review for this item")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-orange-300/25 bg-orange-300/[0.06] px-2 py-1 text-[11px] text-orange-200 hover:bg-orange-300/10"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {(reviewCounts?.get(group.itemId) ?? 0) > 1
                      ? t("Check {count}", { count: reviewCounts?.get(group.itemId) ?? 0 })
                      : t("Check")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
