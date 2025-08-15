// AutoSelectButton.tsx
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Dices, RefreshCw } from "lucide-react";

interface AutoSelectButtonProps {
  isCalculating: boolean;
  hasAutoSelected: boolean;
  handleAutoPick: () => void;
}

const baseClasses =
  "relative overflow-hidden w-full md:max-w-[320px] lg:max-w-[360px] h-11 px-5 rounded-full border border-slate-600/30 backdrop-blur-sm text-slate-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30";

function AutoSelectButtonImpl({
  isCalculating,
  hasAutoSelected,
  handleAutoPick,
}: AutoSelectButtonProps) {
  if (isCalculating) {
    return (
      <div className="flex justify-center items-center w-full">
        <Button
          id="auto-select"
          disabled
          className={`${baseClasses} bg-gradient-to-r from-slate-700/90 via-slate-800/90 to-slate-700/90 cursor-wait`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] bg-[length:200%_100%] animate-[shimmer_2.2s_linear_infinite]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-6 rounded-full bg-slate-500/20 blur-2xl animate-pulse"
          />
          <span className="relative z-10 inline-flex items-center">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            <span className="font-medium">Calculating</span>
            <span className="ml-1 flex gap-1">
              <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full">
          {/* Use Shadcn Button for consistency with theme */}
          <Button
            id="auto-select"
            type="button"
            onClick={handleAutoPick}
            disabled={isCalculating}
            className={`${baseClasses} bg-gradient-to-r from-slate-700/90 to-slate-700/80 hover:from-slate-700 hover:to-slate-800`}
          >
            {hasAutoSelected ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-roll
              </>
            ) : (
              <>
                <Dices className="mr-2 h-4 w-4" />
                Select Optimal
              </>
            )}
          </Button>
    </div>
  );
}

export const AutoSelectButton = memo(AutoSelectButtonImpl);
