"use client";

import { useCallback } from "react";
import { ModeToggle } from "@/components/ModeToggle";
import ThresholdSelector from "@/components/ui/threshold-selector";

interface ModeThresholdProps {
  isPVE: boolean;
  onModeToggle: (isPVE: boolean) => void;
  threshold: number;
  onThresholdChange: (newValue: number) => void;
  className?: string;
}

export function ModeThreshold({
  isPVE,
  onModeToggle,
  threshold,
  onThresholdChange,
  className,
}: ModeThresholdProps) {
  const handleToggle = useCallback(
    (nextIsPVE: boolean) => {
      onModeToggle(nextIsPVE);
    },
    [onModeToggle]
  );

  return (
    <div className={`flex items-stretch ${className ?? ""}`}>
      <div className="flex items-center gap-1 sm:gap-2 rounded-full bg-slate-700/50 border border-slate-600/30 backdrop-blur-sm px-1.5 py-0.5">
        <ModeToggle isPVE={isPVE} onToggle={handleToggle} embedded />
        <div className="w-px h-6 bg-white/10 mx-0.5 sm:mx-1.5" />
        <ThresholdSelector
          value={threshold}
          onChange={onThresholdChange}
          embedded
        />
      </div>
    </div>
  );
}
