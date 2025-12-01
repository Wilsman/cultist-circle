"use client";

import { Clock, Gift, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface RewardTier {
  threshold: string;
  thresholdValue: number;
  timer: string;
  timerHours: number;
  rewards: string;
  highlight?: "gold" | "purple";
}

const REWARD_TIERS: RewardTier[] = [
  {
    threshold: "<25,000",
    thresholdValue: 0,
    timer: "2h",
    timerHours: 2,
    rewards: "Basic items, low value returns",
  },
  {
    threshold: "25,000+",
    thresholdValue: 25000,
    timer: "3h",
    timerHours: 3,
    rewards: "Slightly better items",
  },
  {
    threshold: "100,000+",
    thresholdValue: 100000,
    timer: "5h",
    timerHours: 5,
    rewards: "Mid-tier items",
  },
  {
    threshold: "200,000+",
    thresholdValue: 200000,
    timer: "8h",
    timerHours: 8,
    rewards: "Better mid-tier items",
  },
  {
    threshold: "300,000+",
    thresholdValue: 300000,
    timer: "12h",
    timerHours: 12,
    rewards: "Normal high-value loot",
  },
  {
    threshold: "350,000+",
    thresholdValue: 350000,
    timer: "14h",
    timerHours: 14,
    rewards: "Guaranteed high-value items",
    highlight: "gold",
  },
  {
    threshold: "400,000+",
    thresholdValue: 400000,
    timer: "6h/14h",
    timerHours: 6,
    rewards: "25% Quest/Hideout items • 75% High-value items",
    highlight: "purple",
  },
];

interface RewardsChartProps {
  currentTotal?: number;
  className?: string;
}

export function RewardsChart({
  currentTotal = 0,
  className,
}: RewardsChartProps) {
  // Find current tier
  const getCurrentTierIndex = () => {
    if (currentTotal >= 400000) return 6; // 400k tier
    if (currentTotal >= 350000) return 5;
    if (currentTotal >= 300000) return 4;
    if (currentTotal >= 200000) return 3;
    if (currentTotal >= 100000) return 2;
    if (currentTotal >= 25000) return 1;
    return 0;
  };

  const currentTierIndex = getCurrentTierIndex();

  return (
    <div className={cn("w-full", className)}>
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-700/40 overflow-hidden">
        <div className="divide-y divide-slate-800/50">
          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_60px_1fr] gap-2 px-4 py-2 bg-slate-800/30 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Threshold
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Timer
            </div>
            <div className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              Rewards
            </div>
          </div>

          {/* Rows */}
          {REWARD_TIERS.map((tier, index) => {
            const isCurrentTier = index === currentTierIndex;
            const isPastTier =
              tier.thresholdValue < currentTotal && !isCurrentTier;

            return (
              <div
                key={`${tier.threshold}-${tier.timer}-${index}`}
                className={cn(
                  "grid grid-cols-[1fr_60px_1fr] gap-2 px-4 py-2.5 transition-colors",
                  isCurrentTier &&
                    "bg-emerald-500/10 border-l-2 border-emerald-400",
                  isPastTier && "opacity-50",
                  !isCurrentTier && !isPastTier && "hover:bg-slate-800/30"
                )}
              >
                {/* Threshold */}
                <div className="flex items-center">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      tier.highlight === "purple" && "text-purple-400",
                      tier.highlight === "gold" && "text-amber-400",
                      !tier.highlight && "text-slate-300"
                    )}
                  >
                    {tier.threshold}
                  </span>
                </div>

                {/* Timer */}
                <div className="flex items-center">
                  <span
                    className={cn(
                      "text-xs font-bold",
                      tier.highlight === "purple" && "text-purple-400",
                      tier.highlight === "gold" && "text-amber-400",
                      !tier.highlight && "text-slate-400"
                    )}
                  >
                    {tier.timer}
                  </span>
                </div>

                {/* Rewards */}
                <div className="flex items-center">
                  <span
                    className={cn(
                      "text-[11px] leading-tight",
                      tier.highlight === "purple" && "text-purple-300/90",
                      tier.highlight === "gold" && "text-amber-300/90",
                      !tier.highlight && "text-slate-400"
                    )}
                  >
                    {tier.rewards}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2 bg-slate-800/30 border-t border-slate-700/40">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <span className="text-purple-400 font-medium">💡 Tip:</span> At
            400k+, you have a 25% chance for the 6h timer which gives
            quest/hideout items you still need. The quest must be active to get
            specific items.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RewardsChart;
