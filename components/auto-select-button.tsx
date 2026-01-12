// AutoSelectButton.tsx
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Dices, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface AutoSelectButtonProps {
  isCalculating: boolean;
  hasAutoSelected: boolean;
  handleAutoPick: () => void;
}

function AutoSelectButtonImpl({
  isCalculating,
  hasAutoSelected,
  handleAutoPick,
}: AutoSelectButtonProps) {
  const { t } = useLanguage();

  if (isCalculating) {
    return (
      <div className="flex justify-center items-center w-full">
        <Button
          id="auto-select"
          disabled
          className="w-full h-12 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-slate-300 cursor-wait text-base"
        >
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          <span className="font-semibold">{t("Calculating...")}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full">
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
            {t("Re-roll Selection")}
          </>
        ) : (
          <>
            <Dices className="mr-2 h-5 w-5" />
            {t("Auto Select Items")}
          </>
        )}
      </Button>
    </div>
  );
}

export const AutoSelectButton = memo(AutoSelectButtonImpl);
