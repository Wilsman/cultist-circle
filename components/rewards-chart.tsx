"use client";

import { Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

interface RewardTier {
  threshold: string;
  thresholdValue: number;
  timer: string;
  color: string;
  rewards?: string;
}

const REWARD_TIERS: RewardTier[] = [
  {
    threshold: "0 - 10,000",
    thresholdValue: 0,
    timer: "2 hours",
    color: "#b43d22", // Reddish
  },
  {
    threshold: "10,001 - 25,000",
    thresholdValue: 10001,
    timer: "3 hours",
    color: "#832e14", // Dark Red/Orange
  },
  {
    threshold: "25,001 - 50,000",
    thresholdValue: 25001,
    timer: "4 hours",
    color: "#834d20", // Brownish
  },
  {
    threshold: "50,001 - 100,000",
    thresholdValue: 50001,
    timer: "5 hours",
    color: "#d4a946", // Yellow/Gold
  },
  {
    threshold: "100,001 - 200,000",
    thresholdValue: 100001,
    timer: "8 hours",
    color: "#35579f", // Blue
  },
  {
    threshold: "200,001 - 350,000",
    thresholdValue: 200001,
    timer: "12 hours",
    color: "#4e7080", // Cyan/Grey
  },
  {
    threshold: ">= 350,001",
    thresholdValue: 350001,
    timer: "14 hours",
    color: "#3b8364", // Green
  },
  {
    threshold: ">= 400,000 25% chance of Quest/Hideout items",
    thresholdValue: 400000,
    timer: "6 hours or 14 hours",
    color: "#4ade80", // Bright Green (matches image better)
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
  const { t } = useLanguage();

  // Find current tier
  const getCurrentTierIndex = () => {
    for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
      if (currentTotal >= REWARD_TIERS[i].thresholdValue) {
        return i;
      }
    }
    return 0;
  };

  const currentTierIndex = getCurrentTierIndex();

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 space-y-1">
          {REWARD_TIERS.map((tier, index) => {
            const isCurrentTier = index === currentTierIndex;
            const isLastTier = index === REWARD_TIERS.length - 1;

            return (
              <div
                key={index}
                className={cn(
                  "grid grid-cols-[1fr_auto] gap-8 px-3 py-1.5 rounded-lg transition-all",
                  isCurrentTier && "bg-white/5 ring-1 ring-white/10"
                )}
              >
                {/* Threshold */}
                <div className="flex items-center">
                  <span className={cn(
                    "text-sm font-medium",
                    isCurrentTier ? "text-white" : "text-white/60"
                  )}>
                    {tier.threshold}
                  </span>
                </div>

                {/* Timer */}
                <div className="flex items-center text-right">
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: isLastTier && index === REWARD_TIERS.length - 1 ? undefined : tier.color
                    }}
                  >
                    {isLastTier ? (
                      <span>
                        <span style={{ color: "#4ade80" }}>6 hours</span>
                        <span className="text-white mx-1.5">{t("or")}</span>
                        <span style={{ color: "#3b8364" }}>14 hours</span>
                      </span>
                    ) : (
                      tier.timer
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Note */}
        <div className="px-6 py-3 bg-white/[0.02] border-t border-white/5">
          <p className="text-[11px] text-white/40 leading-relaxed text-center italic">
            {t("* Higher thresholds increase the quality and rarity of returned items.")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RewardsChart;
