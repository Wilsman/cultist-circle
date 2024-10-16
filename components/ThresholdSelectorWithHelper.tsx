import React from "react";
import ThresholdSelector from "@/components/ui/threshold-selector";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface ThresholdSelectorWithHelperProps {
  threshold: number;
  onThresholdChange: (newValue: number) => void;
  onHelperOpen: () => void;
}

export function ThresholdSelectorWithHelper({
  threshold,
  onThresholdChange,
  onHelperOpen,
}: ThresholdSelectorWithHelperProps) {
  return (
    <div className="flex items-center justify-center mb-4 w-full">
      <ThresholdSelector value={threshold} onChange={onThresholdChange} />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="ml-2 cursor-pointer" onClick={onHelperOpen}>
              <HelpCircle
                id="threshold-helper"
                className="h-8 w-8 hover:text-green-300 text-yellow-500 animate-pulse-color"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>Get help choosing the right threshold</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
