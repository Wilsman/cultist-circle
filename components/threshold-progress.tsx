"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Threshold {
  value: number;
  label: string; // time label (e.g., "2h")
  result: string; // expected outcome description
}

interface ThresholdProgressProps {
  total: number; // current base value total
  className?: string;
}

const thresholds: Threshold[] = [
  { value: 10_000, label: "2h", result: "Normal value item" },
  { value: 25_000, label: "3h", result: "Normal value item" },
  { value: 50_000, label: "4h", result: "Normal value item" },
  { value: 100_000, label: "5h", result: "Normal value item" },
  { value: 200_000, label: "8h", result: "Normal value item" },
  { value: 350_000, label: "12h", result: "Normal value item" },
  { value: 350_001, label: "14h", result: "High value item" },
  {
    value: 400_000,
    label: "14h/6h",
    result: "High value item (14h) or 25% chance of Quest/Hideout items (6h)",
  }, // special 6h chance at/above 400k
];

function formatRubles(n: number): string {
  return `₽${Math.max(0, Math.floor(n)).toLocaleString()}`;
}

// Compact number formatting, e.g. 400000 -> "400k"
function formatCompact(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}m`;
  if (v >= 1_000) return `${Math.round(v / 100) / 10}k`.replace(".0k", "k");
  return `${v}`;
}

export function ThresholdProgress({ total, className }: ThresholdProgressProps) {
  const max = 400_000; // cap visualization at 400k per onboarding table

  // Map the total value onto an even-spaced scale segmented by thresholds.
  // This keeps marker spacing even while making the fill advance proportionally
  // within each segment based on actual values.
  function computeEvenPct(val: number): number {
    if (!thresholds.length) return 0;
    const n = thresholds.length;
    const segWidth = 100 / (n - 1);

    // Clamp to [first, last]
    if (val <= thresholds[0].value) return 0;
    if (val >= thresholds[n - 1].value) return 100;

    // Find segment index i such that thresholds[i].value <= val < thresholds[i+1].value
    let i = 0;
    for (let k = 0; k < n - 1; k++) {
      if (val >= thresholds[k].value && val < thresholds[k + 1].value) {
        i = k;
        break;
      }
    }

    const v0 = thresholds[i].value;
    const v1 = thresholds[i + 1].value;
    const t = v1 === v0 ? 0 : Math.max(0, Math.min(1, (val - v0) / (v1 - v0)));
    return i * segWidth + t * segWidth;
  }

  const pct = computeEvenPct(Math.min(total, max));

  return (
    <div
      className={cn(
        "w-full select-none pb-1 md:pb-2",
        className
      )}
      aria-label="Base value progress towards ritual thresholds"
    >
      {/* Numeric ticks above the bar (from thresholds list) */}
      <div className="relative mb-1 h-4">
        {thresholds.map((t, idx) => {
          const left = `${(idx / (thresholds.length - 1)) * 100}%`;
          const hit = total >= t.value;
          return (
            <div
              key={`top-${t.value}`}
              className="absolute bottom-0 -translate-x-1/2 text-[11px] leading-none text-center"
              style={{ left }}
              title={formatRubles(t.value)}
            >
              <span className={cn(hit ? "text-amber-300" : "text-slate-300")}>{formatCompact(t.value)}</span>
            </div>
          );
        })}
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.floor(Math.min(total, max))}
        aria-valuetext={`${formatRubles(total)} of ${formatRubles(max)}`}
        className="relative h-2.5 md:h-3.5 w-full overflow-hidden rounded-full border border-slate-600/40 bg-slate-800/50 backdrop-blur"
      >
        {/* Fill */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400/80 via-amber-500/80 to-yellow-400/80 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />

        {/* Markers */}
        {thresholds.map((t, idx) => {
          const left = `${(idx / (thresholds.length - 1)) * 100}%`;
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
                  "absolute -translate-x-1/2 h-2.5 md:h-3.5 w-[2px]",
                  hit ? "bg-amber-300/90" : "bg-slate-500/60"
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Time labels row (under bar) - hide on mobile to reduce height */}
      <div className="relative mt-1 hidden md:block">
        {thresholds.map((t, idx) => {
          const left = `${(idx / (thresholds.length - 1)) * 100}%`;
          const hit = total >= t.value;
          return (
            <div
              key={`label-${t.value}`}
              className="absolute -translate-x-1/2 text-center"
              style={{ left }}
            >
              <div className="text-[11px] whitespace-nowrap">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5",
                    hit
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                      : "border-slate-600/40 bg-slate-800/60 text-slate-300"
                  )}
                  title={`${t.label} @ ${formatRubles(t.value)} — ${t.result}`}
                >
                  {t.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer removed: total is shown above in the main totals block */}
    </div>
  );
}

export default ThresholdProgress;
