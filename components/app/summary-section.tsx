"use client";

import { BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RewardsChart } from "@/components/rewards-chart";
import { useLanguage } from "@/contexts/language-context";

interface SummarySectionProps {
    /** Whether data is loading */
    loading: boolean;
    /** Total base value of selected items */
    total: number;
    /** Total flea market cost */
    totalFleaCost: number;
    /** Threshold value for sacrifice */
    threshold: number;
    /** Whether threshold is met */
    isThresholdMet: boolean;
    /**
     * Set when the slots exactly match a community-verified hot sacrifice;
     * `total` then shows its tested value instead of the item-data sum.
     */
    verifiedCombo?: {
        label: string;
        resultText: string;
        calculatedTotal: number;
    } | null;
}

/**
 * Summary section showing base value, buy cost, progress bar, and rewards chart.
 * Extracted from app.tsx for better organization.
 */
export function SummarySection({
    loading,
    total,
    totalFleaCost,
    threshold,
    isThresholdMet,
    verifiedCombo,
}: SummarySectionProps) {
    const { t } = useLanguage();

    if (loading) {
        return (
            <div id="sacrifice-value" className="space-y-3">
                <Skeleton className="h-32 w-full bg-slate-700/20 rounded-xl" />
            </div>
        );
    }

    return (
        <div id="sacrifice-value" className="space-y-3">
            {/* Summary Stats - 2-column main layout */}
            <div className="space-y-2 px-1">
                {verifiedCombo && (
                    <div
                        role="status"
                        data-verified-combo
                        className="flex items-start gap-2.5 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-2.5 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                    >
                        <BadgeCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                        <div className="min-w-0 text-xs leading-5">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                                {t("Community-verified combo")}
                            </div>
                            <div className="font-semibold text-slate-100">
                                {verifiedCombo.label}
                                <span className="text-emerald-300"> · {verifiedCombo.resultText}</span>
                            </div>
                            {Math.floor(verifiedCombo.calculatedTotal) < Math.floor(total) && (
                                <div className="text-slate-400">
                                    {t("Base value uses the tested result. Item data adds up to {value}.", {
                                        value: `₽${Math.floor(verifiedCombo.calculatedTotal).toLocaleString()}`,
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main row: Base Value + Buy Cost */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Base Value */}
                    <div
                        className={`bg-slate-800/50 rounded-lg px-4 py-3 text-center border ${
                            verifiedCombo
                                ? "border-emerald-400/50 ring-1 ring-emerald-400/20"
                                : "border-slate-700/30"
                        }`}
                    >
                        <div className="flex items-center justify-center gap-1.5 text-2xl font-bold sm:text-3xl lg:text-2xl text-emerald-400 tabular-nums">
                            {verifiedCombo && (
                                <BadgeCheck
                                    aria-label={t("Community-verified combo")}
                                    className="h-5 w-5 shrink-0 text-emerald-300"
                                />
                            )}
                            ₽{Math.floor(total).toLocaleString()}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                            {verifiedCombo ? t("Verified Base Value") : t("Total Base Value")}
                        </div>
                    </div>

                    {/* Buy Cost */}
                    <div className="bg-slate-800/50 rounded-lg px-4 py-3 text-center border border-slate-700/30">
                        <div className="text-2xl font-bold sm:text-3xl lg:text-2xl text-cyan-400 tabular-nums">
                            ₽{Math.floor(totalFleaCost || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                            {t("Buy Cost")}
                        </div>
                    </div>
                </div>

                {/* Needed bar - only show if threshold not met */}
                {!isThresholdMet && (
                    <div className="flex items-center gap-2 bg-amber-900/20 rounded-md px-3 py-1.5 border border-amber-600/30">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                                style={{
                                    width: `${Math.min(100, (total / threshold) * 100)}%`,
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-amber-400 font-bold tabular-nums">
                                ₽{Math.floor(threshold - total).toLocaleString()}
                            </span>
                            <span className="text-amber-500/70 text-xs">{t("needed")}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Rewards Chart */}
            <RewardsChart currentTotal={Math.floor(total)} />
        </div>
    );
}
