/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Check, CircleOff, DiamondPlus } from "lucide-react";

interface Item {
  id: string;
  name: string;
  bonus: number;
  icon: string | JSX.Element;
}

export default React.memo(ItemSocket);

const items: Item[] = [
  {
    id: "none",
    name: "No bonus item",
    bonus: 0,
    icon: (
      <span className="flex items-center justify-center w-8 h-8">
        <CircleOff className="w-5 h-5" />
      </span>
    ),
  },
  {
    id: "sacred-amulet",
    name: "Sacred Amulet",
    bonus: 15,
    icon: (
      <img
        src="https://assets.tarkov.dev/64d0b40fbe2eed70e254e2d4-icon.webp"
        alt=""
        width={32}
        height={32}
        className="object-contain"
        fetchPriority="low"
        loading="lazy"
      />
    ),
  },
];

interface ItemSocketProps {
  onBonusChange?: (bonus: number) => void;
}

function ItemSocket({ onBonusChange }: ItemSocketProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [hideoutLevel, setHideoutLevel] = useState<number>(1);
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateBonus = (baseBonus: number, level: number) => {
    // Linear scaling: 1% per level (level 1 = 1%, level 50 = 50%, level 51 = 51%)
    const levelMultiplier = level / 100;
    const levelBonus = baseBonus * levelMultiplier;
    return baseBonus + levelBonus;
  };

  const totalBonus = selectedItem
    ? Number(calculateBonus(selectedItem.bonus, hideoutLevel).toFixed(2))
    : 0;

  // Notify parent component when bonus changes (only if changed)
  const lastSentBonusRef = useRef<number | null>(null);
  useEffect(() => {
    if (!onBonusChange) return;
    if (lastSentBonusRef.current === totalBonus) return;
    lastSentBonusRef.current = totalBonus;
    onBonusChange(totalBonus);
  }, [totalBonus, onBonusChange]);

  return (
    <div className="relative flex flex-col items-center text-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-label={`Bonus item socket, current bonus ${totalBonus}%`}
              className={`relative h-9 rounded-full border px-2.5 text-gray-200 backdrop-blur-sm transition-colors ${
                totalBonus > 0
                  ? "border-emerald-400/40 bg-emerald-950/35 hover:bg-emerald-900/35"
                  : "border-slate-600/40 bg-slate-700/50 hover:bg-slate-700/70"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center">
                  {selectedItem ? (
                    typeof selectedItem.icon === "string" ? (
                      <img
                        src={selectedItem.icon}
                        alt={selectedItem.name}
                        width={20}
                        height={20}
                        fetchPriority="low"
                        loading="lazy"
                      />
                    ) : (
                      selectedItem.icon
                    )
                  ) : (
                    <DiamondPlus className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <span
                  className={`min-w-[32px] text-xs font-mono ${
                    totalBonus > 0 ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {totalBonus > 0 ? `+${totalBonus}%` : "0%"}
                </span>
                {isExpanded ? (
                  <ChevronUpIcon className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                )}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={8}
            collisionPadding={16}
            className="max-w-[280px] p-2 text-left bg-slate-800 text-gray-100 border border-slate-700 rounded-md shadow-lg z-[100]"
          >
            <p className="text-xs font-semibold mb-1">Bonus Settings</p>
            <p className="text-xs text-slate-300">
              Add a bonus item and Hideout skill level without moving the
              calculator controls.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isExpanded && (
        <div
          className={`
          absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))]
          origin-top-right overflow-hidden transition-all duration-200 ease-out
          max-h-[320px] scale-100 opacity-100
          `}
        >
          <div className="flex w-full flex-col items-stretch rounded-lg border border-slate-600/50 bg-slate-900/95 p-3 text-left shadow-xl shadow-black/30 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-300">
                Gift value bonus
              </span>
              <span className="rounded-md bg-slate-950/70 px-2 py-1 font-mono text-sm text-gray-100">
                <span
                  className={`font-bold ${
                    totalBonus > 0 ? "text-emerald-300" : "text-slate-400"
                  }`}
                >
                  {totalBonus > 0 ? `+${totalBonus}` : totalBonus}%
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 min-w-0 flex-1 justify-start gap-2 border-slate-700 bg-slate-800/80 px-2 text-left text-gray-200 hover:bg-slate-800 hover:text-gray-100"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-700/80 bg-slate-950/40">
                      {selectedItem ? (
                        selectedItem.icon
                      ) : (
                        <DiamondPlus className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                    <span className="min-w-0 truncate text-xs font-mono">
                      {selectedItem?.name ?? "Choose bonus item"}
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900/95 border-slate-700 text-gray-200 max-w-xs">
                  <DialogTitle>Item Socket</DialogTitle>
                  <div className="grid gap-2">
                    {items.map((item) => {
                      const isSelected =
                        item.id === "none"
                          ? !selectedItem
                          : selectedItem?.id === item.id;
                      const itemBonus = Number(
                        calculateBonus(item.bonus, hideoutLevel).toFixed(2),
                      );

                      return (
                        <Button
                          key={item.id}
                          variant="outline"
                          className="flex h-12 w-full items-center justify-start border-slate-700 bg-slate-800 px-2 hover:bg-slate-700/80 hover:text-gray-100"
                          onClick={() => {
                            setSelectedItem(item.id === "none" ? null : item);
                            setOpen(false);
                          }}
                        >
                          <div className="mr-3 flex h-8 w-8 items-center justify-center">
                            {item.icon}
                          </div>
                          <span className="flex min-w-0 flex-1 flex-col items-start">
                            <span className="truncate font-mono text-sm">
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {itemBonus > 0 ? `+${itemBonus}%` : "No bonus"}
                            </span>
                          </span>
                          {isSelected && (
                            <Check className="ml-2 h-4 w-4 text-emerald-300" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>

              {selectedItem && selectedItem.id !== "none" && (
                <label className="flex shrink-0 items-center gap-2 animate-fade-in">
                  <span className="font-mono text-xs text-slate-300">
                    Hideout
                  </span>
                  <div className="relative">
                    <select
                      value={hideoutLevel}
                      onChange={(e) => setHideoutLevel(Number(e.target.value))}
                      className="h-10 w-20 appearance-none rounded border border-slate-700 bg-slate-800 px-2 py-1 text-center text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {Array.from({ length: 50 }, (_, i) => i + 1).map(
                        (level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ),
                      )}
                      <option
                        key={51}
                        value={51}
                        className="text-yellow-400 font-bold"
                      >
                        Elite
                      </option>
                    </select>
                    {hideoutLevel === 51 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-xs font-bold">
                        ★
                      </span>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
