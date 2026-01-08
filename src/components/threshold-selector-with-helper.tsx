import React from "react";
import ThresholdSelector from "@/components/ui/threshold-selector";

interface ThresholdSelectorWithHelperProps {
  threshold: number;
  onThresholdChange: (newValue: number) => void;
  onHelperOpen: () => void;
}

export function ThresholdSelectorWithHelper({
  threshold,
  onThresholdChange,
}: ThresholdSelectorWithHelperProps) {
  return (
    <div className="flex items-center justify-center w-full">
      <ThresholdSelector value={threshold} onChange={onThresholdChange} />
    </div>
  );
}
