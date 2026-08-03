"use client";

import { useCallback } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import ThresholdSelector from "@/components/ui/threshold-selector";
import type { GameMode } from "@/lib/game-mode";

interface ModeThresholdProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  threshold: number;
  onThresholdChange: (newValue: number) => void;
  className?: string;
}

export function ModeThreshold({
  mode,
  onModeChange,
  threshold,
  onThresholdChange,
  className,
}: ModeThresholdProps) {
  const handleModeChange = useCallback(
    (nextMode: GameMode) => {
      onModeChange(nextMode);
    },
    [onModeChange],
  );

  return (
    <div className={`flex items-center justify-center ${className ?? ""}`}>
      <div className="flex flex-col items-center gap-2 min-[600px]:flex-row min-[600px]:gap-0 min-[600px]:rounded-full min-[600px]:border min-[600px]:border-slate-600/30 min-[600px]:bg-slate-800/70 min-[600px]:p-1 min-[600px]:shadow-lg min-[600px]:shadow-black/15 min-[600px]:backdrop-blur-sm">
        <div className="rounded-full border border-slate-600/30 bg-slate-800/70 p-1 shadow-lg shadow-black/15 backdrop-blur-sm min-[600px]:border-0 min-[600px]:bg-transparent min-[600px]:p-0 min-[600px]:shadow-none">
          <ModeToggle mode={mode} onModeChange={handleModeChange} embedded />
        </div>
        <div className="mx-2 hidden h-6 w-px bg-white/10 min-[600px]:block" />
        <div className="rounded-full border border-slate-600/30 bg-slate-800/70 p-1 shadow-lg shadow-black/15 backdrop-blur-sm min-[600px]:border-0 min-[600px]:bg-transparent min-[600px]:p-0 min-[600px]:shadow-none">
          <ThresholdSelector
            value={threshold}
            onChange={onThresholdChange}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
