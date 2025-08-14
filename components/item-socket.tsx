"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  QuestionMarkCircledIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DiamondPlus } from "lucide-react";

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
    name: "NONE",
    bonus: 0,
    icon: (
      <span className="flex items-center justify-center w-8 h-8">
        <DiamondPlus className="w-5 h-5" />
      </span>
    ),
  },
  {
    id: "sacred-amulet",
    name: "Sacred Amulet",
    bonus: 15,
    icon: (
      <Image
        src="https://assets.tarkov.dev/64d0b40fbe2eed70e254e2d4-icon.webp"
        alt="Sacred Amulet"
        width={32}
        height={32}
        className="object-contain"
        priority
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
    <div className="flex flex-col items-center text-center w-full relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-gray-200 hover:bg-slate-700/60 relative h-9 px-3 rounded-full bg-slate-700/50 border border-slate-600/30 backdrop-blur-sm"
      >
        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-help"
                  tabIndex={0}
                  aria-label="Item socket bonuses help"
                >
                  <QuestionMarkCircledIcon className="w-4 h-4 text-gray-400 hover:text-gray-300" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[340px] p-3 text-left space-y-2 bg-slate-800 text-gray-100 border border-slate-700 rounded-md shadow-lg"
              >
                <div>
                  <p className="font-semibold mb-1">Bonuses</p>
                  <ul className="space-y-1 list-disc pl-4 text-xs">
                    <li>
                      Sacrificing a Sacred Amulet increases the Gift&apos;s value by 15%
                    </li>
                    <li>
                      The Hideout Management skill increases the bonus of Sacred Amulet
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs">Bonus Settings</span>
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}

          {/* Show indicator next to text when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-1 ml-1.5">
              <div className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded-md border border-gray-700">
                {selectedItem ? (
                  <div className="w-5 h-5 flex items-center justify-center">
                    {typeof selectedItem.icon === "string" ? (
                      <Image src={selectedItem.icon} alt={selectedItem.name} width={20} height={20} />
                    ) : (
                      selectedItem.icon
                    )}
                  </div>
                ) : (
                  <span className="flex items-center justify-center w-6 h-6">
                    <DiamondPlus className="w-4 h-4" />
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-mono ${
                  totalBonus > 0 ? "text-blue-300" : "text-gray-400"
                }`}
              >
                {totalBonus > 0 ? `+${totalBonus}%` : `${totalBonus}%`}
              </span>
            </div>
          )}
        </div>
      </Button>

      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out w-full
          ${isExpanded ? "max-h-[360px] opacity-100 mt-2" : "max-h-0 opacity-0"}
          `}
      >
        <div className="mx-auto w-full max-w-md rounded-2xl bg-slate-700/40 border border-slate-600/30 backdrop-blur-sm px-3 py-3 flex flex-col items-center">
          <Badge
            variant="destructive"
            className="mb-2 rounded-full border-gray-700 text-[10px]"
          >
            Work In Progress
          </Badge>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
            <span className="font-mono text-gray-200 text-sm">
              Total bonus to the Gift{" "}
              <span
                className={`font-bold ${
                  totalBonus > 0 ? "text-blue-300" : "text-red-500"
                }`}
              >
                {totalBonus}%
              </span>
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    className={`w-10 h-10 p-1 border-slate-600/30 bg-slate-800/70 hover:bg-slate-800 ${
                      !selectedItem ? "text-gray-600" : "text-gray-200"
                    }`}
                  >
                    {selectedItem ? (
                      selectedItem.icon
                    ) : (
                      <span className="flex items-center justify-center w-8 h-8">
                        <DiamondPlus className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent className="bg-slate-900/95 border-slate-700 text-gray-200 max-w-xs">
                <DialogTitle>Item Socket</DialogTitle>
                <div className="grid gap-2">
                  {items.map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="flex items-center justify-start w-full border-slate-700 bg-slate-800 hover:bg-slate-900/20 hover:text-gray-200 h-8"
                      onClick={() => {
                        setSelectedItem(item.id === "none" ? null : item);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-center w-8 h-8 mr-3">
                        {item.icon}
                      </div>
                      <span className="font-mono text-sm">{totalBonus.toFixed(2)}%</span>
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {selectedItem && selectedItem.id !== "none" && (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="font-mono text-gray-200 text-sm">Hideout Level:</span>
                <div className="relative">
                  <select
                    value={hideoutLevel}
                    onChange={(e) => setHideoutLevel(Number(e.target.value))}
                    className="bg-slate-800 text-gray-200 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20 text-center appearance-none text-sm h-8"
                  >
                    {Array.from({ length: 50 }, (_, i) => i + 1).map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                    <option key={51} value={51} className="text-yellow-400 font-bold">
                      Elite
                    </option>
                  </select>
                  {hideoutLevel === 51 && (
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-400 text-xs font-bold">★</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
