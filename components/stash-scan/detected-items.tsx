/* eslint-disable @next/next/no-img-element */
"use client";

import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/language-context";
import {
  sacrificeBaseValue,
  valueGivenUp,
  type OwnedGroup,
  type PricingSettings,
} from "@/lib/stash-scan/owned-items";

interface DetectedItemsProps {
  groups: OwnedGroup[];
  excluded: ReadonlySet<string>;
  plannedCounts: ReadonlyMap<string, number>;
  unrecognisedCount: number;
  pricing: PricingSettings;
  onToggle: (itemId: string, included: boolean) => void;
  onHover: (itemId: string | null) => void;
  onReview: (itemId: string) => void;
  onShowUnrecognised: () => void;
}

const rub = (value: number) => `₽${Math.round(value).toLocaleString()}`;

export function DetectedItems({
  groups,
  excluded,
  plannedCounts,
  unrecognisedCount,
  pricing,
  onToggle,
  onHover,
  onReview,
  onShowUnrecognised,
}: DetectedItemsProps) {
  const { t } = useLanguage();

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-slate-200">
          {t("Found {count} items", {
            count: groups.reduce((sum, group) => sum + group.cells.length, 0),
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

      <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {groups.map((group) => {
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
                aria-label={t("Allow sacrificing this item")}
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
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-yellow-300/25 bg-yellow-300/[0.06] px-2 py-1 text-[11px] text-yellow-200 hover:bg-yellow-300/10"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {t("Check")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
