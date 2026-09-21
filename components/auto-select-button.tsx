// AutoSelectButton.tsx
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Dices, Package, RefreshCw, Store } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

export type AutoSelectSource = "market" | "stash";

interface AutoSelectButtonProps {
  isCalculating: boolean;
  hasAutoSelected: boolean;
  handleAutoPick: () => void;
  source?: AutoSelectSource;
  onSourceChange?: (source: AutoSelectSource) => void;
  stashAvailable?: boolean;
}

function AutoSelectButtonImpl({
  isCalculating,
  hasAutoSelected,
  handleAutoPick,
  source = "market",
  onSourceChange,
  stashAvailable = false,
}: AutoSelectButtonProps) {
  const { t } = useLanguage();

  const heroButton = isCalculating ? (
    <Button
      id="auto-select"
      disabled
      className="w-full h-12 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-slate-300 cursor-wait text-base"
    >
      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
      <span className="font-semibold">{t("Calculating...")}</span>
    </Button>
  ) : (
    <Button
      id="auto-select"
      type="button"
      onClick={() => {
        // Blur any focused element (e.g., inputs/tooltips) to ensure
        // portal-based UI (Radix Tooltip/Popover) closes before rerender.
        const ae = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
        if (ae && typeof ae.blur === 'function') ae.blur();
        handleAutoPick();
      }}
      disabled={isCalculating}
      className="relative w-full h-12 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-400 hover:text-emerald-300 transition-all duration-200 font-semibold text-base shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
    >
      {hasAutoSelected ? (
        <>
          <RefreshCw className="mr-2 h-5 w-5" />
          {source === "stash" ? t("Re-roll from Stash") : t("Re-roll Selection")}
        </>
      ) : (
        <>
          <Dices className="mr-2 h-5 w-5" />
          {source === "stash"
            ? t("Auto Select from Stash")
            : t("Auto Select Items")}
        </>
      )}
    </Button>
  );

  if (!(stashAvailable && onSourceChange)) {
    return (
      <div className="flex justify-center items-center w-full">
        {heroButton}
      </div>
    );
  }

  const options: Array<{
    value: AutoSelectSource;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      value: "market",
      label: t("Market"),
      icon: <Store className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      value: "stash",
      label: t("My stash"),
      icon: <Package className="h-3.5 w-3.5" aria-hidden />,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2 w-full">
      <div className="flex-1">{heroButton}</div>
      <div
        role="radiogroup"
        aria-label={t("Auto select source")}
        className="flex h-12 shrink-0 items-center rounded-2xl border border-slate-600/40 bg-slate-800/40 p-1"
      >
        {options.map((option) => {
          const active = source === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSourceChange(option.value)}
              className={cn(
                "flex h-full items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "border border-transparent text-slate-400 hover:text-slate-200",
              )}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const AutoSelectButton = memo(AutoSelectButtonImpl);
