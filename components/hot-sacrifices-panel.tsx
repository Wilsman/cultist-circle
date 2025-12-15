"use client";

import Image from "next/image";
import { ChevronDown, Flame } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst)",
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
        name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst)",
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
        name: "Soyuz-TM STM-9 Gen.2 9x19 carbine",
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
        name: "Saiga-9 9x19 carbine",
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
        name: "Soyuz-TM STM-9 Gen.2 9x19 carbine",
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
        name: "Saiga-9 9x19 carbine",
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
        name: "HK G28 Patrol",
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

export function ComboRow({ combo }: { combo: SacrificeCombo }) {
  return (
    <div className="relative z-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl bg-white/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 p-4 transition-all hover:bg-white/80 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600">
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {combo.ingredients.map((ingredient, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && (
              <span className="text-slate-400 dark:text-slate-600 font-medium px-0.5">
                {combo.separator || "+"}
              </span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/60 rounded-lg px-3 py-2 ring-1 ring-black/5 dark:ring-white/5 cursor-help">
                    <Image
                      src={ingredient.imageUrl}
                      alt={ingredient.name}
                      width={48}
                      height={48}
                      className="rounded-md"
                    />
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none mb-0.5">
                        {ingredient.count}×
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                        {ingredient.shortName || ingredient.name}
                      </span>
                    </div>

                    {ingredient.vendor && (
                      <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 dark:border-slate-700/50 ml-1 group/vendor">
                        <Image
                          src={ingredient.vendor.imageUrl}
                          alt={ingredient.vendor.name}
                          width={16}
                          height={16}
                          className="rounded-full opacity-70 transition-all duration-200 group-hover/vendor:opacity-100 group-hover/vendor:scale-110"
                        />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover/vendor:text-slate-700 dark:group-hover/vendor:text-slate-200 transition-colors">
                          {ingredient.vendor.level}
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900/95 backdrop-blur-sm border-slate-700/50 text-slate-200 p-3 shadow-xl rounded-xl max-w-[260px] z-50">
                  <p className="font-bold text-sm mb-1 text-slate-100 leading-snug">
                    {ingredient.name}
                  </p>
                  {ingredient.vendor && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-700/50">
                      <span>Buy from:</span>
                      <span className="text-indigo-400 font-medium">
                        {ingredient.vendor.name}{" "}
                        <span className="text-indigo-400/70">
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

      <div className="flex items-center justify-end sm:justify-start mt-2 sm:mt-0 pl-1">
        <span
          className={`text-sm font-bold px-3 py-1.5 rounded-full ${
            combo.resultText.includes("400K") || combo.resultText.includes("6h")
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-500/20"
              : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-1 ring-amber-500/20"
          }`}
        >
          {combo.resultText}
        </span>
      </div>
    </div>
  );
}

export function HotSacrificesPanel() {
  const featuredCombo = HOT_SACRIFICES[0];
  const remainingCombos = HOT_SACRIFICES.slice(1);

  return (
    <div className="w-full max-w-3xl mx-auto mb-4">
      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 text-slate-200 shadow-xl backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                <Flame className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-100 tracking-tight">
                  Hot Sacrifices
                </span>
                <span className="text-[10px] font-medium text-indigo-300/80 tracking-wide uppercase">
                  Community Tested Recipes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-3">
          {/* Featured Combo (Always visible) */}
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-50" />
            <div className="relative">
              <ComboRow combo={featuredCombo} />
            </div>
          </div>

          <details className="group w-full">
            <summary className="flex items-center justify-between cursor-pointer list-none py-2 px-1 mt-1 select-none">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                <span>View more community combos</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] border border-slate-700">
                  {remainingCombos.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                <span className="hidden sm:inline">Expand</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
              </div>
            </summary>

            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {remainingCombos.map((combo) => (
                <ComboRow key={combo.id} combo={combo} />
              ))}

              <div className="mt-3 pt-3 border-t border-slate-700/30 text-center">
                <p className="text-[10px] text-slate-500">
                  Values based on vendor sell prices and trading multipliers.
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
