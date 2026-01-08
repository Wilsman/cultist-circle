/* eslint-disable @next/next/no-img-element */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export interface TraderLevels {
  prapor: number;
  therapist: number;
  skier: number;
  peacekeeper: number;
  mechanic: number;
  ragman: number;
  jaeger: number;
}

interface TraderInfo {
  normalizedName: keyof TraderLevels;
  displayName: string;
  imageLink: string;
}

const TRADERS: TraderInfo[] = [
  {
    normalizedName: "prapor",
    displayName: "Prapor",
    imageLink: "https://assets.tarkov.dev/54cb50c76803fa8b248b4571.webp"
  },
  {
    normalizedName: "therapist",
    displayName: "Therapist",
    imageLink: "https://assets.tarkov.dev/54cb57776803fa99248b456e.webp"
  },
  {
    normalizedName: "skier",
    displayName: "Skier",
    imageLink: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp"
  },
  {
    normalizedName: "peacekeeper",
    displayName: "Peacekeeper",
    imageLink: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp"
  },
  {
    normalizedName: "mechanic",
    displayName: "Mechanic",
    imageLink: "https://assets.tarkov.dev/5a7c2eca46aef81a7ca2145d.webp"
  },
  {
    normalizedName: "ragman",
    displayName: "Ragman",
    imageLink: "https://assets.tarkov.dev/5ac3b934156ae10c4430e83c.webp"
  },
  {
    normalizedName: "jaeger",
    displayName: "Jaeger",
    imageLink: "https://assets.tarkov.dev/5c0647fdd443bc2504c2d371.webp"
  }
];

const DEFAULT_TRADER_LEVELS: TraderLevels = {
  prapor: 4,
  therapist: 4,
  skier: 4,
  peacekeeper: 4,
  mechanic: 4,
  ragman: 4,
  jaeger: 4
};

interface TraderLevelSelectorProps {
  traderLevels: TraderLevels;
  onTraderLevelsChange: (levels: TraderLevels) => void;
}

export function TraderLevelSelector({ traderLevels, onTraderLevelsChange }: TraderLevelSelectorProps) {
  const handleTraderLevelChange = (trader: keyof TraderLevels, level: string) => {
    onTraderLevelsChange({
      ...traderLevels,
      [trader]: parseInt(level)
    });
  };

  const handleReset = () => {
    onTraderLevelsChange(DEFAULT_TRADER_LEVELS);
  };

  const isAtDefaults = Object.entries(traderLevels).every(
    ([trader, level]) => level === DEFAULT_TRADER_LEVELS[trader as keyof TraderLevels]
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Trader Levels</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isAtDefaults}
            className="h-7 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {TRADERS.map((trader) => (
          <div key={trader.normalizedName} className="flex items-center space-x-3">
            <img
              src={trader.imageLink}
              alt={trader.displayName}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
              fetchPriority="low"
              loading="lazy"
            />
            <div className="flex-1">
              <Label htmlFor={`trader-${trader.normalizedName}`} className="text-sm">
                {trader.displayName}
              </Label>
            </div>
            <Select
              value={traderLevels[trader.normalizedName].toString()}
              onValueChange={(value) => handleTraderLevelChange(trader.normalizedName, value)}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export { DEFAULT_TRADER_LEVELS };
