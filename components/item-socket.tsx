"use client";

import { useState, useEffect } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { XIcon, DiamondPlus } from "lucide-react";

interface Item {
  id: string;
  name: string;
  bonus: number;
  icon: string | JSX.Element;
}

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

export default function ItemSocket({ onBonusChange }: ItemSocketProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [hideoutLevel, setHideoutLevel] = useState<number>(1);
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateBonus = (baseBonus: number, level: number) => {
    const levelMultiplier = level / 100; // Level 50 = 0.5 multiplier
    const levelBonus = baseBonus * levelMultiplier;
    return baseBonus + levelBonus;
  };

  const totalBonus = selectedItem
    ? Number(calculateBonus(selectedItem.bonus, hideoutLevel).toFixed(1))
    : 0;

  // Notify parent component when bonus changes
  useEffect(() => {
    if (onBonusChange) {
      onBonusChange(totalBonus);
    }
  }, [totalBonus, onBonusChange]);

  return (
    <div className="flex flex-col items-center text-center w-full relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 relative"
      >
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircledIcon className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[600px] w-[400px] p-4 text-left space-y-3 bg-gray-700 text-white rounded shadow-md text-sm"
              >
                <div className="pt-1">
                  <p className="font-semibold mb-2">Bonuses:</p>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>
                      Sacrificing a Sacred Amulet increases the Gift&apos;s
                      value by 15%
                    </li>
                    <li>
                      The Hideout Management skill increases the bonus of Sacred
                      Amulet
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-sm">Bonus Settings</span>
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}

          {/* Show indicator next to text when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-800 square-full border border-gray-700">
                {/* Show icon if selected, show blank socket (square box with x) if not */}
                {selectedItem && selectedItem.icon}
                {!selectedItem && <XIcon className="w-4 h-4 text-gray-400" />}
              </div>
              <span
                className={`text-xs font-bold ${
                  totalBonus > 0 ? "text-blue-300" : "text-red-500"
                }`}
              >
                +{totalBonus}%
              </span>
            </div>
          )}
        </div>
      </Button>

      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out w-full flex flex-col items-center
          ${isExpanded ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}
          `}
      >
        <Badge
          variant="destructive"
          className="mb-2 rounded-full border-gray-700 "
        >
          Work In Progress
        </Badge>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-gray-300">
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

        <div className="flex items-center justify-center gap-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTitle>Item Socket</DialogTitle>
            <DialogTrigger asChild>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className={`w-12 h-12 p-1 border-gray-700 bg-gray-800 hover:bg-gray-900/50 ${
                    !selectedItem ? "text-gray-600" : "text-gray-200"
                  }`}
                >
                  {selectedItem ? (
                    selectedItem.icon
                  ) : (
                    <span className="flex items-center justify-center w-8 h-8">
                      <DiamondPlus className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="bg-gray-900/95 border-gray-700 text-gray-200 max-w-xs">
              <div className="grid gap-2">
                {items.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="flex items-center justify-start w-full border-gray-700 bg-gray-800 hover:bg-gray-900/20 hover:text-gray-200"
                    onClick={() => {
                      setSelectedItem(item.id === "none" ? null : item);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 mr-3">
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {selectedItem && selectedItem.id !== "none" && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="font-mono text-gray-300">Hideout Level:</span>
              <select
                value={hideoutLevel}
                onChange={(e) => setHideoutLevel(Number(e.target.value))}
                className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-16 text-center"
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
