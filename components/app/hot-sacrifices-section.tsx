/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Flame } from "lucide-react";
import {
  HOT_SACRIFICES,
  SacrificeCombo,
  comboLabel,
  meetsThreshold,
  orderCombosForThreshold,
} from "@/components/hot-sacrifices-panel";
import { useLanguage } from "@/contexts/language-context";

const VISIBLE_COUNT = 4;

interface HotSacrificesSectionProps {
  /** Selected sacrifice threshold; combos below it are dimmed and listed last. */
  threshold: number;
  sacrificeCosts: Record<string, number>;
  /** Combo whose items currently fill the slots, if any. */
  loadedComboId?: string | null;
  onUse: (combo: SacrificeCombo) => void;
}

function ComboIcons({ combo }: { combo: SacrificeCombo }) {
  return (
    <span className="flex shrink-0 -space-x-2.5">
      {combo.ingredients.map((ingredient) => (
        <span
          key={ingredient.name}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-700/80 bg-slate-950/80"
        >
          <img
            src={ingredient.imageUrl}
            alt=""
            width={32}
            height={32}
            loading="lazy"
            className="h-8 w-8 object-contain"
          />
        </span>
      ))}
    </span>
  );
}

/** Where to buy each ingredient, for the row tooltip. */
function vendorSummary(combo: SacrificeCombo) {
  return combo.ingredients
    .map((ingredient) =>
      ingredient.vendor
        ? `${ingredient.name}: ${ingredient.vendor.name} ${ingredient.vendor.level}`
        : ingredient.name,
    )
    .join("\n");
}

/**
 * Community-tested combos, cheapest first among those that reach the current
 * threshold. Clicking a row fills the sacrifice slots.
 */
export function HotSacrificesSection({
  threshold,
  sacrificeCosts,
  loadedComboId,
  onUse,
}: HotSacrificesSectionProps) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const [showRetired, setShowRetired] = useState(false);

  const combos = useMemo(
    () => orderCombosForThreshold(HOT_SACRIFICES, sacrificeCosts, threshold),
    [sacrificeCosts, threshold],
  );
  const retired = HOT_SACRIFICES.filter((combo) => combo.disabled);
  const visible = showAll ? combos : combos.slice(0, VISIBLE_COUNT);
  const hiddenCount = combos.length - VISIBLE_COUNT;

  return (
    <section aria-labelledby="hot-sacrifices-heading" data-hot-sacrifices>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2
          id="hot-sacrifices-heading"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-100"
        >
          <Flame aria-hidden className="h-4 w-4 text-orange-300" />
          {t("Hot Sacrifices")}
        </h2>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {t("Cheapest first")}
        </span>
      </div>

      <ul className="space-y-1">
        {visible.map((combo) => {
          const label = comboLabel(combo);
          const cost = sacrificeCosts[combo.id];
          const isBelow = !meetsThreshold(combo, threshold);
          const isLoaded = combo.id === loadedComboId;
          return (
            <li key={combo.id}>
              <button
                type="button"
                onClick={() => onUse(combo)}
                title={vendorSummary(combo)}
                aria-label={t("Fill slots with {label}", { label })}
                className={`group flex w-full items-center gap-3 rounded-md border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
                  isLoaded
                    ? "border-emerald-400/30 bg-emerald-400/[0.06]"
                    : "border-transparent hover:border-slate-600/60 hover:bg-white/[0.04]"
                } ${isBelow && !isLoaded ? "opacity-55 hover:opacity-100" : ""}`}
              >
                <ComboIcons combo={combo} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold leading-5 text-slate-100">
                    {label}
                  </span>
                  <span className="block truncate text-[11px] leading-4">
                    {isLoaded ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                        <Check aria-hidden className="h-3 w-3" />
                        {t("In your slots")}
                      </span>
                    ) : (
                      <span
                        className={
                          isBelow ? "text-slate-500" : "text-emerald-300/90"
                        }
                      >
                        {combo.resultText}
                        {isBelow && ` · ${t("Below your threshold")}`}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-cyan-200">
                  {cost ? `₽${cost.toLocaleString()}` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
        {retired.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowRetired((prev) => !prev)}
            aria-expanded={showRetired}
            className="inline-flex items-center gap-1 rounded text-[10px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-300"
          >
            {t("Retired")} ({retired.length})
            <ChevronDown
              aria-hidden
              className={`h-3 w-3 transition-transform ${showRetired ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <span />
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            aria-expanded={showAll}
            className="rounded text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-100"
          >
            {showAll
              ? t("Show Less")
              : t("+ {count} more", { count: hiddenCount })}
          </button>
        )}
      </div>

      {showRetired && (
        <ul className="mt-1.5 space-y-1">
          {retired.map((combo) => (
            <li
              key={combo.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5"
            >
              <span className="opacity-40 grayscale">
                <ComboIcons combo={combo} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-5 text-slate-500 line-through">
                  {comboLabel(combo)}
                </span>
                <span className="block text-[11px] leading-4 text-red-300/80">
                  {t("No longer works")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
