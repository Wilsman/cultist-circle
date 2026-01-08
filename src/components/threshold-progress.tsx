
import React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ThresholdProgressProps {
  total: number; // current base value total
  threshold?: number; // target threshold (default 400k)
  className?: string;
}

function formatK(n: number): string {
  return `${Math.round(n / 1000)}k`;
}

export function ThresholdProgress({
  total,
  threshold = 400_000,
  className,
}: ThresholdProgressProps) {
  // Constants for Cultist Circle
  const THRESHOLD_14H = 350_000;
  const THRESHOLD_6H = 400_000;

  const THRESHOLDS = [
    { value: 10_000, label: "10k", time: "2h" },
    { value: 25_000, label: "25k", time: "3h" },
    { value: 50_000, label: "50k", time: "4h" },
    { value: 100_000, label: "100k", time: "5h" },
    { value: 200_000, label: "200k", time: "8h" },
  ];

  // Determine the scale of the bar
  const max = threshold;

  // Calculate percentage filled
  const percentage = Math.min(Math.max((total / max) * 100, 0), 100);

  // Markers to show
  const showIntermediate = max >= THRESHOLD_6H && THRESHOLD_14H < max;
  const intermediatePct = showIntermediate ? (THRESHOLD_14H / max) * 100 : 0;

  return (
    <TooltipProvider>
      <div className={cn("w-full pt-4 pb-2", className)}>
        <div className="relative h-3 w-full">
          {/* Track Background */}
          <div className="absolute inset-0 rounded-full bg-slate-800/50 ring-1 ring-white/5 overflow-hidden">
            {/* Minor Threshold Markers */}
            {THRESHOLDS.filter((t) => t.value < max).map((t) => {
              const pct = (t.value / max) * 100;
              // Only show if not too close to start or end or main intermediate
              if (
                pct < 2 ||
                pct > 98 ||
                (showIntermediate && Math.abs(pct - intermediatePct) < 2)
              )
                return null;

              return (
                <div
                  key={t.value}
                  className="absolute top-0 bottom-0 w-px bg-slate-800/40"
                  style={{ left: `${pct}%` }}
                />
              );
            })}

            {/* Main Intermediate (350k) Grid Line */}
            {showIntermediate && (
              <div
                className="absolute top-0 bottom-0 w-px bg-slate-700/50"
                style={{ left: `${intermediatePct}%` }}
              />
            )}
          </div>

          {/* Progress Fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-emerald-600 to-emerald-400"
            style={{ width: `${percentage}%` }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />

            {/* End Glow */}
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-300/50 blur-[2px]" />
          </div>

          {/* Markers Layer (On top of fill) */}
          {/* Minor Threshold Markers (Dots) */}
          {THRESHOLDS.filter((t) => t.value < max).map((t) => {
            const pct = (t.value / max) * 100;
            // Only show if not too close to start or end or main intermediate
            if (
              pct < 2 ||
              pct > 98 ||
              (showIntermediate && Math.abs(pct - intermediatePct) < 2)
            )
              return null;

            return (
              <Tooltip key={`dot-${t.value}`}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rounded-full ring-1 ring-slate-900 transition-colors duration-300 z-20 hover:scale-125 cursor-help",
                      total >= t.value ? "bg-emerald-300" : "bg-slate-700"
                    )}
                    style={{ left: `${pct}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="border-slate-800 bg-slate-900/95 px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-emerald-400 font-bold text-[10px]">
                      {t.label}
                    </div>
                    <div className="text-slate-300 text-[10px] font-medium">
                      {t.time} timer
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {showIntermediate && (
            <>
              {/* Marker Line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-slate-900/20 z-10"
                style={{ left: `${intermediatePct}%` }}
              />
              {/* Marker Dot */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full ring-1 ring-slate-900 transition-colors duration-300 z-20 hover:scale-125 cursor-help",
                      total >= THRESHOLD_14H ? "bg-emerald-200" : "bg-slate-600"
                    )}
                    style={{ left: `${intermediatePct}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="border-slate-800 bg-slate-900/95 px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-emerald-400 font-bold text-[10px]">
                      350k
                    </div>
                    <div className="text-slate-300 text-[10px] font-medium">
                      14h timer
                    </div>
                    <div className="text-slate-500 text-[9px] pt-0.5">
                      Guaranteed high value items
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Labels & Zones */}
        <div className="relative mt-2 h-8 text-[10px] font-medium text-slate-500 select-none">
          {/* Start Label */}
          <div className="absolute left-0 top-0 pl-1">0</div>

          {/* Minor Threshold Labels */}
          {THRESHOLDS.filter((t) => t.value < max).map((t) => {
            const pct = (t.value / max) * 100;
            // Only show if not too close to start or end or main intermediate
            if (
              pct < 4 ||
              pct > 96 ||
              (showIntermediate && Math.abs(pct - intermediatePct) < 4)
            )
              return null;

            return (
              <div
                key={`label-${t.value}`}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${pct}%` }}
              >
                <span
                  className={cn(
                    "transition-colors",
                    total >= t.value ? "text-emerald-400" : "text-slate-500"
                  )}
                >
                  {t.label}
                </span>
                <span className="text-[9px] text-slate-600 font-normal leading-none mt-0.5">
                  {t.time}
                </span>
              </div>
            );
          })}

          {/* Intermediate Label (350k) */}
          {showIntermediate && (
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${intermediatePct}%` }}
            >
              <span
                className={cn(
                  "transition-colors",
                  total >= THRESHOLD_14H ? "text-emerald-400" : "text-slate-500"
                )}
              >
                350k
              </span>
              <span className="text-[9px] text-slate-600 font-normal leading-none mt-0.5">
                14h
              </span>
            </div>
          )}

          {/* End Label (Target) */}
          <div className="absolute right-0 top-0 pr-1 flex flex-col items-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-end cursor-help hover:opacity-80 transition-opacity">
                  <span
                    className={cn(
                      "transition-colors",
                      total >= max ? "text-emerald-400" : "text-slate-500"
                    )}
                  >
                    {formatK(max)}
                  </span>
                  <span className="text-[9px] text-slate-600 font-normal leading-none mt-0.5">
                    {max === THRESHOLD_6H
                      ? "6h Chance"
                      : max === THRESHOLD_14H
                      ? "14h Reward"
                      : THRESHOLDS.find((t) => t.value === max)?.time ||
                        "Target"}
                  </span>
                </div>
              </TooltipTrigger>
              {max === THRESHOLD_6H ? (
                <TooltipContent
                  side="left"
                  className="border-slate-800 bg-slate-900/95 px-3 py-2"
                >
                  <div className="space-y-1.5">
                    <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider border-b border-white/5 pb-0.5 mb-1">
                      400k+ Rewards
                    </div>
                    <div className="grid grid-cols-[24px_1fr] gap-x-2 gap-y-1.5 text-[10px]">
                      <div className="text-emerald-400 font-bold pt-px text-right">
                        25%
                      </div>
                      <div className="text-slate-300 leading-tight">
                        <span className="font-semibold text-slate-200">
                          6h timer
                        </span>
                        <div className="text-slate-500 text-[9px]">
                          + Quest/Hideout items
                        </div>
                      </div>

                      <div className="text-emerald-400 font-bold pt-px text-right">
                        75%
                      </div>
                      <div className="text-slate-300 leading-tight">
                        <span className="font-semibold text-slate-200">
                          14h timer
                        </span>
                        <div className="text-slate-500 text-[9px]">
                          + High value item(s)
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              ) : (
                <TooltipContent side="left">
                  <div className="text-xs font-medium">
                    <div className="text-emerald-400 font-bold mb-0.5">
                      {formatK(max)}
                    </div>
                    <div className="text-slate-300">
                      {max === THRESHOLD_14H
                        ? "14h timer"
                        : `${
                            THRESHOLDS.find((t) => t.value === max)?.time || ""
                          } timer`}
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ThresholdProgress;
