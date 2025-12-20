"use client";

import Image from "next/image";
import { ChevronDown, Flame, Plus, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

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
];

interface ComboRowProps {
  combo: SacrificeCombo;
  onUseThis?: (combo: SacrificeCombo) => void;
  estimatedCost?: number;
}

export function ComboRow({ combo, onUseThis, estimatedCost }: ComboRowProps) {
  const isHighValue =
    combo.resultText.includes("400K") || combo.resultText.includes("6h");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.005,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
      }}
      className="relative z-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl bg-white/[0.03] dark:bg-slate-800/20 border border-white/5 dark:border-slate-700/30 p-4 transition-all duration-300 backdrop-blur-md hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] group"
    >
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {combo.ingredients.map((ingredient, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && (
              <div className="flex items-center justify-center w-6 opacity-40 group-hover:opacity-60 transition-opacity">
                {combo.separator === "➡️" ? (
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 bg-slate-900/40 rounded-lg px-3 py-2 ring-1 ring-white/5 cursor-help transition-all hover:ring-indigo-500/20 hover:bg-slate-900/60 relative overflow-hidden group/item">
                    {/* Background glow effect */}
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/item:opacity-100 transition-opacity" />

                    <div className="relative z-10 flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white/5 blur-sm rounded-md" />
                        <Image
                          src={ingredient.imageUrl}
                          alt={ingredient.name}
                          width={48}
                          height={48}
                          className="rounded-md relative z-10 transform transition-transform group-hover/item:scale-110"
                        />
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <span className="text-sm font-bold text-slate-100 leading-none mb-1">
                          {ingredient.count}×
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[140px] group-hover/item:text-slate-300 transition-colors">
                          {ingredient.shortName || ingredient.name}
                        </span>
                      </div>

                      {ingredient.vendor && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 ml-1 group/vendor">
                          <div className="relative">
                            <Image
                              src={ingredient.vendor.imageUrl}
                              alt={ingredient.vendor.name}
                              width={18}
                              height={18}
                              className="rounded-full opacity-60 grayscale-[0.5] transition-all duration-300 group-hover/item:opacity-100 group-hover/item:grayscale-0 group-hover/item:scale-110"
                            />
                            <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-[2px] opacity-0 group-hover/item:opacity-100" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 group-hover/item:text-indigo-400 transition-colors">
                            {ingredient.vendor.level}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200 p-3 shadow-2xl rounded-xl max-w-[260px] z-50">
                  <p className="font-bold text-sm mb-1 text-slate-100 leading-snug">
                    {ingredient.name}
                  </p>
                  {ingredient.vendor && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-white/5">
                      <span className="opacity-60">Buy from:</span>
                      <span className="text-indigo-300 font-semibold">
                        {ingredient.vendor.name}{" "}
                        <span className="text-indigo-300/60 font-medium">
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

      <div className="flex items-center gap-4 justify-end sm:justify-start mt-2 sm:mt-0 pl-1">
        <div className="flex flex-col items-end sm:items-start gap-1">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`text-[12px] font-bold px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg ${
              isHighValue
                ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 ring-1 ring-amber-500/30"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              {isHighValue && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                />
              )}
              {combo.resultText}
            </span>
          </motion.div>

          {estimatedCost !== undefined && (
            <div className="flex items-baseline gap-1.5 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] uppercase tracking-tighter text-slate-500 font-bold whitespace-nowrap">
                Est. Cost:
              </span>
              <span className="text-[11px] font-black text-cyan-400/90 tabular-nums whitespace-nowrap">
                ₽{estimatedCost.toLocaleString()}
              </span>
            </div>
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
                  className="h-8 px-4 text-[11px] font-semibold tracking-wide rounded-full border border-white/10 bg-transparent text-slate-200 hover:border-indigo-300/60 hover:text-white hover:bg-white/5 transition duration-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  Use
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900/95 backdrop-blur-md border-white/10 text-slate-200 text-xs">
                <p>Auto-populate items for this combo</p>
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
  const featuredCombo = HOT_SACRIFICES[0];
  const remainingCombos = HOT_SACRIFICES.slice(1);

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
