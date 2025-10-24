"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ThresholdProgressProps {
  total: number; // current base value total
  threshold?: number; // target threshold (default 400k)
  className?: string;
}

function formatRubles(n: number): string {
  return `₽${Math.max(0, Math.floor(n)).toLocaleString()}`;
}

export function ThresholdProgress({ total, threshold = 400_000, className }: ThresholdProgressProps) {
  const max = threshold; // use threshold as max

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

        {/* Current Position Marker - Super Small */}
        {total > 0 && (
          <div
            className="absolute -top-6 -translate-x-1/2 transition-[left] duration-500 ease-out"
            style={{ left: `${pct}%` }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-semibold text-emerald-400 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-900/80 border border-emerald-500/30">
                {formatRubles(total)}
              </span>
              <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-l-transparent border-r-transparent border-t-emerald-500/50" />
            </div>
          </div>
        )}

        {/* Key Milestone Markers - Dynamic based on threshold */}
        {(() => {
          const markers = [];
          // Always show 350k if threshold is 400k
          if (threshold === 400_000) {
            markers.push({ value: 350_000, label: "350k" });
          }
          // Always show the threshold itself
          markers.push({ value: threshold, label: threshold === 400_000 ? "400k" : threshold === 350_000 ? "350k" : `${(threshold / 1000).toFixed(0)}k` });
          return markers;
        })().map((t) => {
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
        {threshold === 400_000 && (
          <span className={cn(total >= 350_001 && "text-slate-300 font-medium")}>
            350k
          </span>
        )}
        <span className={cn(total >= threshold && "text-slate-300 font-medium")}>
          {threshold === 400_000 ? "400k" : threshold === 350_000 ? "350k" : `${(threshold / 1000).toFixed(0)}k`}
        </span>
      </div>
    </div>
  );
}

export default ThresholdProgress;
