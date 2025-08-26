"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Threshold {
  value: number;
  label: string;
}

interface ThresholdProgressProps {
  total: number; // current base value total
  className?: string;
}

const thresholds: Threshold[] = [
  { value: 10_000, label: "2h" },
  { value: 25_000, label: "3h" },
  { value: 50_000, label: "4h" },
  { value: 100_000, label: "5h" },
  { value: 200_000, label: "8h" },
  { value: 350_000, label: "14h" },
  { value: 400_000, label: "6/14h" }, // special 6h chance at/above 400k
];

function formatRubles(n: number): string {
  return `₽${Math.max(0, Math.floor(n)).toLocaleString()}`;
}

export function ThresholdProgress({ total, className }: ThresholdProgressProps) {
  const max = 400_000; // cap visualization at 400k per onboarding table
  const pct = Math.max(0, Math.min(100, (total / max) * 100));

  return (
    <div
      className={cn(
        "w-full select-none pb-2",
        className
      )}
      aria-label="Base value progress towards ritual thresholds"
    >
      <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{formatRubles(0)}</span>
        <span>{formatRubles(max)}</span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.floor(Math.min(total, max))}
        aria-valuetext={`${formatRubles(total)} of ${formatRubles(max)}`}
        className="relative h-3.5 w-full overflow-hidden rounded-full border border-slate-600/40 bg-slate-800/50 backdrop-blur"
      >
        {/* Fill */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400/80 via-amber-500/80 to-yellow-400/80 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />

        {/* Markers */}
        {thresholds.map((t) => {
          const left = `${(t.value / max) * 100}%`;
          const hit = total >= t.value;
          return (
            <div
              key={t.value}
              className="absolute top-0 h-full"
              style={{ left }}
            >
              {/* Tick */}
              <div
                className={cn(
                  "absolute -translate-x-1/2 h-3.5 w-[2px]",
                  hit ? "bg-amber-300/90" : "bg-slate-500/60"
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Labels row */}
      <div className="relative mt-1">
        {thresholds.map((t) => {
          const left = `${(t.value / 400_000) * 100}%`;
          const hit = total >= t.value;
          return (
            <div
              key={`label-${t.value}`}
              className="absolute -translate-x-1/2 text-[11px] whitespace-nowrap"
              style={{ left }}
            >
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5",
                  hit
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                    : "border-slate-600/40 bg-slate-800/60 text-slate-300"
                )}
                title={`${t.label} @ ${formatRubles(t.value)}`}
              >
                {t.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer removed: total is shown above in the main totals block */}
    </div>
  );
}

export default ThresholdProgress;
