/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronDown, Flame, Plus, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

export interface Ingredient {
  name: string;
  shortName?: string;
  count: number;
  imageUrl: string;
  vendor?: {
    name: string;
    level: string;
    imageUrl: string;
  };
}

export interface SacrificeCombo {
  id: string;
  ingredients: Ingredient[];
  resultText: string;
  highlight?: boolean;
  separator?: string; // For custom separators like "➡️"
  availabilityNote?: string;
}

export const HOT_SACRIFICES: SacrificeCombo[] = [
  {
    id: "5x-mp5",
    ingredients: [
      {
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) Default",
        shortName: "MP5",
        count: 5,
        imageUrl:
          "https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
    highlight: true,
  },
  {
    id: "4x-mp5-diary",
    ingredients: [
      {
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) Default",
        shortName: "MP5",
        count: 4,
        imageUrl:
          "https://assets.tarkov.dev/59411aa786f7747aeb37f9a5-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
      {
        name: "Diary",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/590c645c86f77412b01304d9-icon.webp",
      },
    ],
    resultText: "400K+ (6h & 14h)",
  },
  {
    id: "2x-mp5sd-diary",
    ingredients: [
      {
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst) SD",
        shortName: "MP5 SD",
        count: 2,
        imageUrl:
          "https://assets.tarkov.dev/59411abb86f77478f702b5d2-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL2",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
      {
        name: "Diary",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/590c645c86f77412b01304d9-icon.webp",
      },
    ],
    resultText: "400K+ (6h & 14h)",
  },
  {
    id: "3x-stm-saiga",
    ingredients: [
      {
        name: "Soyuz-TM STM-9 Gen.2 9x19 carbine Default",
        shortName: "STM-9",
        count: 3,
        imageUrl:
          "https://assets.tarkov.dev/60479c3f420fac5ebc199f86-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL2",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
      {
        name: "Saiga-9 9x19 carbine Default",
        shortName: "Saiga-9",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/5a13df5286f774032f5454a0-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
    ],
    resultText: "350K+ (14h)",
  },
  {
    id: "4x-stm-saiga",
    ingredients: [
      {
        name: "Soyuz-TM STM-9 Gen.2 9x19 carbine Default",
        shortName: "STM-9",
        count: 4,
        imageUrl:
          "https://assets.tarkov.dev/60479c3f420fac5ebc199f86-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL2",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
      {
        name: "Saiga-9 9x19 carbine Default",
        shortName: "Saiga-9",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/5a13df5286f774032f5454a0-icon.webp",
        vendor: {
          name: "Skier",
          level: "LL1",
          imageUrl: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
  },
  {
    id: "labs-g28",
    ingredients: [
      {
        name: "Labs Access",
        shortName: "Labs Card",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/5c94bbff86f7747ee735c08f-icon.webp",
      },
      {
        name: "HK G28 7.62x51 marksman rifle Patrol",
        shortName: "G28",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/6193e5f3aa34a3034236bdb3-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL3",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
    separator: "➡️",
  },
  {
    id: "sas-thor",
    ingredients: [
      {
        name: "SAS drive",
        shortName: "SAS",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/590c37d286f77443be3d7827-icon.webp",
      },
      {
        name: "NFM THOR Integrated Carrier body armor",
        shortName: "THOR IC",
        count: 1,
        imageUrl:
          "https://assets.tarkov.dev/60a283193cb70855c43a381d-icon.webp",
        vendor: {
          name: "Peacekeeper",
          level: "LL4",
          imageUrl: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
        },
      },
    ],
    resultText: "400K+ (6h & 14h)",
    separator: "➡️",
    availabilityNote:
      "PVP no longer works after the THOR IC base value change. PVE still works.",
  },
];

interface ComboRowProps {
  combo: SacrificeCombo;
  onUseThis?: (combo: SacrificeCombo) => void;
  estimatedCost?: number;
}

export function ComboRow({ combo, onUseThis, estimatedCost }: ComboRowProps) {
  const { t } = useLanguage();
  const isHighValue =
    combo.resultText.includes("400K") || combo.resultText.includes("6h");
  const hasAvailabilityNote = Boolean(combo.availabilityNote);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative z-20 flex flex-col gap-3 rounded-lg border border-slate-700/60 bg-slate-900/55 p-3 transition-colors duration-200 hover:border-slate-500/80 hover:bg-slate-900/75 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {combo.ingredients.map((ingredient, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && (
              <div className="flex w-5 items-center justify-center text-slate-500">
                {combo.separator === "➡️" ? (
                  <ArrowRight className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group/item flex min-w-0 cursor-help items-center gap-2 rounded-md border border-slate-700/70 bg-slate-950/35 px-2 py-1.5 transition-colors hover:border-slate-500/80 hover:bg-slate-950/60">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="relative shrink-0">
                        <img
                          src={ingredient.imageUrl}
                          alt={ingredient.name}
                          width={34}
                          height={34}
                          className="relative z-10 h-8 w-8 rounded object-contain"
                        />
                        <span className="absolute -right-1 -top-1 rounded border border-slate-600 bg-slate-900 px-1 text-[9px] font-black leading-4 text-slate-200 shadow-sm z-10">
                          {ingredient.count}x
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-col justify-center">
                        <span className="max-w-[118px] truncate text-[11px] font-semibold leading-4 text-slate-200 transition-colors group-hover/item:text-slate-50">
                          {ingredient.shortName || ingredient.name}
                        </span>
                        {ingredient.vendor && (
                          <span className="text-[10px] font-medium text-slate-500">
                            {ingredient.vendor.name} {ingredient.vendor.level}
                          </span>
                        )}
                      </div>

                      {ingredient.vendor && (
                        <img
                          src={ingredient.vendor.imageUrl}
                          alt=""
                          width={18}
                          height={18}
                          className="hidden rounded-full opacity-60 sm:block"
                        />
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="z-50 max-w-[260px] rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-slate-200 shadow-2xl backdrop-blur-xl">
                  <p className="font-bold text-sm mb-1 text-slate-100 leading-snug">
                    {ingredient.name}
                  </p>
                  {ingredient.vendor && (
                    <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-800 pt-1.5 text-xs text-slate-400">
                      <span className="opacity-60">{t("Buy from:")}</span>
                      <span className="font-semibold text-slate-200">
                        {ingredient.vendor.name}{" "}
                        <span className="font-medium text-slate-400">
                          ({ingredient.vendor.level})
                        </span>
                      </span>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3 md:justify-start md:border-l md:border-t-0 md:pl-3 md:pt-0">
        <div className="flex flex-col items-start gap-1 md:items-end">
          <div
            className={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${
              isHighValue
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/25 bg-amber-400/10 text-amber-200"
            }`}
          >
            {combo.resultText}
          </div>

          {estimatedCost !== undefined && (
            <div className="flex items-baseline gap-1.5 px-0.5">
              <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-wide text-slate-500">
                {t("Est. Cost:")}
              </span>
              <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-cyan-200">
                ₽{estimatedCost.toLocaleString()}
              </span>
            </div>
          )}

          {hasAvailabilityNote && (
            <p className="max-w-[260px] text-left text-[10px] font-medium leading-snug text-amber-200/90 md:text-right">
              {combo.availabilityNote}
            </p>
          )}
        </div>

        {onUseThis && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUseThis(combo)}
                  className="h-8 rounded-md border border-slate-700 bg-slate-950/30 px-3 text-[11px] font-semibold tracking-wide text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  {t("Use")}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="border-slate-700 bg-slate-950/95 text-xs text-slate-200 backdrop-blur-md">
                <p>{t("Auto-populate items for this combo")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </motion.div>
  );
}

interface HotSacrificesPanelProps {
  onUseThis?: (combo: SacrificeCombo) => void;
  sacrificeCosts?: Record<string, number>;
}

export function HotSacrificesPanel({
  onUseThis,
  sacrificeCosts = {},
}: HotSacrificesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort sacrifices by estimated cost (lowest to highest)
  const sortedSacrifices = useMemo(() => {
    return [...HOT_SACRIFICES].sort((a, b) => {
      const costA = sacrificeCosts[a.id] ?? 0;
      const costB = sacrificeCosts[b.id] ?? 0;
      // Sort by cost ascending (lowest first)
      if (costA === 0 && costB === 0) return 0;
      if (costA === 0) return 1;
      if (costB === 0) return -1;
      return costA - costB;
    });
  }, [sacrificeCosts]);

  const featuredCombo = sortedSacrifices[0];
  const remainingCombos = sortedSacrifices.slice(1);

  return (
    <div className="w-full max-w-3xl mx-auto mb-4" data-hot-sacrifices>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 text-slate-200 shadow-2xl backdrop-blur-xl overflow-hidden relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />

        {/* Header */}
        <div className="relative px-5 py-4 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                    filter: ["blur(8px)", "blur(12px)", "blur(8px)"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-indigo-500/20 rounded-lg"
                />
                <div className="relative p-2 rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/30">
                  <motion.div
                    animate={{
                      rotate: [-5, 5, -5],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Flame className="w-4 h-4 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                  </motion.div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-50 tracking-tight">
                  Hot Sacrifices
                </span>
                <span className="text-[10px] font-bold text-indigo-400/80 tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-indigo-500 animate-ping" />
                  Live Testing Recipes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Featured Combo */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-lg opacity-30" />
            <ComboRow
              combo={featuredCombo}
              onUseThis={onUseThis}
              estimatedCost={sacrificeCosts[featuredCombo.id]}
            />
          </div>

          <div className="w-full">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between w-full py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors group select-none"
            >
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-widest transition-colors">
                  More Recipes
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-[10px] font-black border border-white/5 text-indigo-300">
                  {remainingCombos.length}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[9px] font-black border border-amber-500/30 text-amber-400 animate-pulse">
                  1 NEW
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 group-hover:text-indigo-400 transition-all">
                <span>{isOpen ? "Collapse" : "Explore"}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ease-out ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3 pb-2 px-1">
                    {remainingCombos.map((combo) => (
                      <ComboRow
                        key={combo.id}
                        combo={combo}
                        onUseThis={onUseThis}
                        estimatedCost={sacrificeCosts[combo.id]}
                      />
                    ))}

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 pt-4 border-t border-white/5 text-center"
                    >
                      <p className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-2">
                        <span className="w-1.5 h-[1px] bg-white/10" />
                        Community vetted multipliers & values
                        <span className="w-1.5 h-[1px] bg-white/10" />
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
