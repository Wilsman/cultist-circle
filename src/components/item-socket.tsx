
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
} from "@radix-ui/react-icons";
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
      <img
        src="https://assets.tarkov.dev/64d0b40fbe2eed70e254e2d4-icon.webp"
        alt="Sacred Amulet"
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
        className="object-contain"
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
    <div className="flex flex-col items-center text-center relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-200 hover:bg-slate-700/60 relative h-9 px-2 rounded-full bg-slate-700/50 border border-slate-600/30 backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 flex items-center justify-center">
                  {selectedItem ? (
                    typeof selectedItem.icon === "string" ? (
                      <img
                        src={selectedItem.icon}
                        alt={selectedItem.name}
                        width={20}
                        height={20}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      selectedItem.icon
                    )
                  ) : (
                    <DiamondPlus className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <span
                  className={`text-xs font-mono min-w-[32px] ${
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
              Sacred Amulet increases Gift value by 15% (+Hideout skill)
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
                      <span className="font-mono text-sm">
                        {totalBonus.toFixed(2)}%
                      </span>
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {selectedItem && selectedItem.id !== "none" && (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="font-mono text-gray-200 text-sm">
                  Hideout Level:
                </span>
                <div className="relative">
                  <select
                    value={hideoutLevel}
                    onChange={(e) => setHideoutLevel(Number(e.target.value))}
                    className="bg-slate-800 text-gray-200 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20 text-center appearance-none text-sm h-8"
                  >
                    {Array.from({ length: 50 }, (_, i) => i + 1).map(
                      (level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      )
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
                      â˜…
                    </span>
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
