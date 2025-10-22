"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ThresholdProgressProps {
  total: number; // current base value total
  className?: string;
}

function formatRubles(n: number): string {
  return `₽${Math.max(0, Math.floor(n)).toLocaleString()}`;
}

export function ThresholdProgress({ total, className }: ThresholdProgressProps) {
  const max = 400_000; // cap visualization at 400k

  // Simple linear percentage calculation so the bar matches the label positions
  const pct = Math.min((total / max) * 100, 100);

  return (
    <div
      className={cn("w-full select-none", className)}
      aria-label="Base value progress towards ritual thresholds"
    >
      {/* Progress Bar - Clean & Minimal */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.floor(Math.min(total, max))}
        aria-valuetext={`${formatRubles(total)} of ${formatRubles(max)}`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/30"
      >
        {/* Fill - Smooth gradient */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />

        {/* Key Milestone Markers - Only show important ones */}
        {[
          { value: 350_000, label: "350k" },
          { value: 400_000, label: "400k" },
        ].map((t) => {
          const left = `${(t.value / max) * 100}%`;
          const hit = total >= t.value;
          return (
            <div
              key={t.value}
              className="absolute top-0 h-full -translate-x-px"
              style={{ left }}
            >
              <div
                className={cn(
                  "h-full w-0.5 rounded-full transition-colors duration-300",
                  hit ? "bg-emerald-300/60" : "bg-slate-600/40"
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Milestone Labels - Minimal */}
      <div className="relative mt-2 flex justify-between text-[10px] text-slate-400">
        <span>0</span>
        <span className={cn(total >= 350_001 && "text-slate-300 font-medium")}>
          350k
        </span>
        <span className={cn(total >= 400_000 && "text-slate-300 font-medium")}>
          400k
        </span>
      </div>
    </div>
  );
}

export default ThresholdProgress;
