/* eslint-disable @next/next/no-img-element */
"use client";

import { AlertTriangle, ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { MAX_SACRIFICE_SLOTS } from "@/lib/sacrifice-slots";
import type { SacrificePlan as Plan } from "@/lib/stash-scan/optimize";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

interface SacrificePlanProps {
  plan: Plan | null;
  threshold: number;
  slots: number;
  itemsById: Map<string, SimplifiedItem>;
  /** Items whose recognition was not confident enough to trust blindly. */
  needsReview: ReadonlySet<string>;
  remainingReviewCount: number;
  hasItems: boolean;
  /** Best reachable total with the included items, for the failure message. */
  bestReachable: number;
  /** Final CTA label once review is done (defaults to Load into calculator). */
  commitLabel?: string;
  onLoadIntoCalculator: () => void;
  onReviewNeeded: () => void;
  onLowerThreshold?: () => void;
  onAddSlot?: () => void;
}

const rub = (value: number) => `₽${Math.round(value).toLocaleString()}`;

export function SacrificePlan({
  plan,
  threshold,
  slots,
  itemsById,
  needsReview,
  remainingReviewCount,
  hasItems,
  bestReachable,
  commitLabel,
  onLoadIntoCalculator,
  onReviewNeeded,
  onLowerThreshold,
  onAddSlot,
}: SacrificePlanProps) {
  const { t } = useLanguage();

  if (!hasItems) {
    return (
      <p className="text-sm text-slate-400">
        {t("No usable items yet. Include some items or identify the unrecognised ones.")}
      </p>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-amber-200">
          {t("These items cannot reach {threshold} with {slots} slots.", {
            threshold: rub(threshold),
            slots,
          })}
        </p>
        <p className="text-xs text-slate-400">
          {t("The best you can do is {total}. Add screenshots with more valuable items, allow excluded ones, or lower the threshold.", {
            total: rub(bestReachable),
          })}
        </p>
        {(onLowerThreshold || onAddSlot) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {onLowerThreshold && bestReachable > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onLowerThreshold}
                className="border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Minus className="mr-1.5 h-3.5 w-3.5" />
                {t("Use {total} threshold", { total: rub(bestReachable) })}
              </Button>
            )}
            {onAddSlot && slots < MAX_SACRIFICE_SLOTS && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAddSlot}
                className="border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("Try {count} slots", { count: slots + 1 })}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  const overshoot = plan.totalBaseValue - threshold;
  const unverified = plan.picks.filter((pick) => needsReview.has(pick.key)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        {plan.itemCount === 1
          ? t("Sacrifice this item")
          : t("Sacrifice these {count} items", { count: plan.itemCount })}
      </div>

      <ul className="space-y-1.5">
        {plan.picks.map((pick) => {
          const item = itemsById.get(pick.key);
          return (
            <li
              key={pick.key}
              className="flex items-center gap-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-2.5 py-2"
            >
              {item?.iconLink ? (
                <img src={item.iconLink} alt="" className="h-9 w-9 shrink-0 rounded bg-black/40 object-contain" />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded bg-black/40" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{item?.name ?? pick.key}</span>
              {needsReview.has(pick.key) && (
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0 text-yellow-300"
                  aria-label={t("Check this match")}
                />
              )}
              <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-200">×{pick.count}</span>
            </li>
          );
        })}
      </ul>

      {unverified > 0 && (
        <p className="flex gap-2 rounded-lg border border-orange-300/20 bg-orange-300/[0.05] px-2.5 py-2 text-xs leading-relaxed text-orange-100/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" />
          {t("Review the marked items against your screenshot before loading this plan.")}
        </p>
      )}
      {unverified === 0 && remainingReviewCount > 0 && (
        <p className="text-xs leading-relaxed text-slate-400">
          {t("Review the remaining stash matches before saving this scan to the calculator.")}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2.5 text-center">
          <dd className="text-xl font-bold tabular-nums text-emerald-400">{rub(plan.totalBaseValue)}</dd>
          <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">{t("Total Base Value")}</dt>
        </div>
        <div className="rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2.5 text-center">
          <dd className="text-xl font-bold tabular-nums text-cyan-400">{rub(plan.totalCost)}</dd>
          <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">{t("Value given up")}</dt>
        </div>
      </dl>
      <p className="text-xs text-slate-500">
        {t("{over} over the {threshold} threshold, using {used} of {slots} slots.", {
          over: rub(overshoot),
          threshold: rub(threshold),
          used: plan.itemCount,
          slots,
        })}
      </p>

      <Button
        onClick={remainingReviewCount > 0 ? onReviewNeeded : onLoadIntoCalculator}
        className="w-full bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
      >
        {remainingReviewCount > 0
          ? remainingReviewCount === 1
            ? t("Review 1 match")
            : t("Review {count} matches", { count: remainingReviewCount })
          : (commitLabel ?? t("Load into calculator"))}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
