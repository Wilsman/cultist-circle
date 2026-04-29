/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type FleaPriceType, type PriceMode } from "@/hooks/use-app-settings";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { type TraderLevels } from "@/components/ui/trader-level-selector";

interface SelectorSettingsPopoverProps {
  sortOption: string;
  onSortChange: (sortOption: string) => void;
  priceMode: PriceMode;
  onPriceModeChange: (mode: PriceMode) => void;
  traderLevels: TraderLevels;
  onTraderLevelsChange: (levels: TraderLevels) => void;
  fleaPriceType: FleaPriceType;
  onFleaPriceTypeChange: (type: FleaPriceType) => void;
  excludeIncompatible: boolean;
  onExcludeIncompatibleChange: (value: boolean) => void;
  incompatibleFilteredCount: number;
  useLevelFilter: boolean;
  onUseLevelFilterChange: (value: boolean) => void;
  fleaLevelFilteredCount: number;
  useLastOfferCountFilter: boolean;
  onUseLastOfferCountFilterChange: (value: boolean) => void;
  lowOfferCountFilteredCount: number;
  playerLevel: number;
  onPlayerLevelChange: (level: number) => void;
  ignoreFilters: boolean;
  onIgnoreFiltersChange: (value: boolean) => void;
}

const SORT_OPTIONS = [
  { value: "az", label: "Item name: A-Z" },
  { value: "most-recent", label: "Most recently updated" },
  { value: "base-value", label: "Base Value: Low to High" },
  { value: "base-value-desc", label: "Base Value: High to Low" },
  { value: "ratio", label: "Best value for money" },
] as const;

const TRADERS: Array<{
  key: keyof TraderLevels;
  label: string;
  imageLink: string;
}> = [
  {
    key: "prapor",
    label: "Prapor",
    imageLink: "https://assets.tarkov.dev/54cb50c76803fa8b248b4571.webp",
  },
  {
    key: "therapist",
    label: "Therapist",
    imageLink: "https://assets.tarkov.dev/54cb57776803fa99248b456e.webp",
  },
  {
    key: "skier",
    label: "Skier",
    imageLink: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
  },
  {
    key: "peacekeeper",
    label: "Peacekeeper",
    imageLink: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
  },
  {
    key: "mechanic",
    label: "Mechanic",
    imageLink: "https://assets.tarkov.dev/5a7c2eca46aef81a7ca2145d.webp",
  },
  {
    key: "ragman",
    label: "Ragman",
    imageLink: "https://assets.tarkov.dev/5ac3b934156ae10c4430e83c.webp",
  },
  {
    key: "jaeger",
    label: "Jaeger",
    imageLink: "https://assets.tarkov.dev/5c0647fdd443bc2504c2d371.webp",
  },
];

export function SelectorSettingsPopover({
  sortOption,
  onSortChange,
  priceMode,
  onPriceModeChange,
  traderLevels,
  onTraderLevelsChange,
  fleaPriceType,
  onFleaPriceTypeChange,
  excludeIncompatible,
  onExcludeIncompatibleChange,
  incompatibleFilteredCount,
  useLevelFilter,
  onUseLevelFilterChange,
  fleaLevelFilteredCount,
  useLastOfferCountFilter,
  onUseLastOfferCountFilterChange,
  lowOfferCountFilteredCount,
  playerLevel,
  onPlayerLevelChange,
  ignoreFilters,
  onIgnoreFiltersChange,
}: SelectorSettingsPopoverProps) {
  const { t } = useLanguage();
  const filtersAreOverridden = ignoreFilters;

  const normalizedLevel = useMemo(
    () => Math.min(79, Math.max(1, playerLevel)),
    [playerLevel],
  );

  const handlePlayerLevelChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    onPlayerLevelChange(Math.min(79, Math.max(1, parsed)));
  };

  const handleTraderLevelChange = (
    trader: keyof TraderLevels,
    level: string,
  ) => {
    onTraderLevelsChange({
      ...traderLevels,
      [trader]: Number.parseInt(level, 10),
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-2 rounded-md border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
            filtersAreOverridden
              ? "border-amber-500/40 bg-amber-500/12 text-amber-200 hover:border-amber-400/60 hover:bg-amber-500/18"
              : "border-slate-600/40 bg-slate-900/70 text-slate-300 hover:border-slate-500/60 hover:bg-slate-800/80 hover:text-slate-100",
          )}
          aria-label={t("Open selector settings")}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>{t("Quick Settings")}</span>
          {filtersAreOverridden && (
            <span className="rounded-full border border-amber-300/40 bg-amber-200/12 px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-[0.14em] text-amber-100">
              {t("All Items")}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[340px] border-slate-700 bg-[#12161d]/95 p-0 text-slate-100 shadow-2xl backdrop-blur-md"
      >
        <div className="max-h-[70vh] overflow-y-auto p-3">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {t("Settings")}
          </p>

          {filtersAreOverridden && (
            <div className="mb-3 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] font-medium text-amber-200">
                {t("All selector filters are currently bypassed")}
              </p>
              <p className="mt-1 text-[10px] text-amber-100/80">
                {t("Every item is shown in the selector list")}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <section className="space-y-1.5">
              <label className="text-[11px] text-slate-400">{t("Sort")}</label>
              <Select value={sortOption} onValueChange={onSortChange}>
                <SelectTrigger className="h-9 rounded-md border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-slate-600 focus:ring-slate-500/50">
                  <SelectValue placeholder={t("Sort by...")} />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-[#12161d] text-slate-100">
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-xs focus:bg-slate-800 focus:text-slate-100"
                    >
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="rounded-md border border-slate-700 bg-slate-900/70 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-300">
                  {t("Price Mode")}
                </span>
              </div>
              <RadioGroup
                value={priceMode}
                onValueChange={(value) => onPriceModeChange(value as PriceMode)}
                className="grid grid-cols-2 gap-2"
              >
                {(["flea", "trader"] as const).map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-md border px-2.5 py-2 text-[11px] transition-colors",
                      priceMode === value
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-600",
                    )}
                  >
                    <span className="font-medium">
                      {value === "flea" ? t("Flea") : t("Trader")}
                    </span>
                    <RadioGroupItem
                      value={value}
                      className="border-current text-current"
                    />
                  </label>
                ))}
              </RadioGroup>
            </section>

            {priceMode === "trader" && (
              <section className="rounded-md border border-slate-700 bg-slate-900/70 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">
                    {t("Trader Levels")}
                  </span>
                </div>
                <div className="space-y-2">
                  {TRADERS.map((trader) => (
                    <div
                      key={trader.key}
                      className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1.5"
                    >
                      <img
                        src={trader.imageLink}
                        alt={trader.label}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full object-cover"
                        loading="lazy"
                        fetchPriority="low"
                      />
                      <span className="min-w-0 flex-1 text-[11px] font-medium text-slate-200">
                        {trader.label}
                      </span>
                      <Select
                        value={traderLevels[trader.key].toString()}
                        onValueChange={(value) =>
                          handleTraderLevelChange(trader.key, value)
                        }
                      >
                        <SelectTrigger className="h-8 w-16 rounded-md border-slate-700 bg-slate-900/80 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-[#12161d] text-slate-100">
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-md border border-slate-700 bg-slate-900/70 p-2.5">
              <div className="mb-2 text-[11px] text-slate-300">
                {t("Flea Price Basis")}
              </div>
              <RadioGroup
                value={fleaPriceType}
                onValueChange={(value) =>
                  onFleaPriceTypeChange(value as FleaPriceType)
                }
                className="space-y-2"
              >
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-[11px] text-slate-200 hover:border-slate-600">
                  <div className="flex flex-col">
                    <span className="font-medium">{t("Last Low Price")}</span>
                    <span className="text-[10px] text-slate-500">
                      {t("Uses the most recent lowest listing")}
                    </span>
                  </div>
                  <RadioGroupItem
                    value="lastLowPrice"
                    className="border-current text-amber-300"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-[11px] text-slate-200 hover:border-slate-600">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t("Average 24h Price")}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {t("Weighted average over the last 24h")}
                    </span>
                  </div>
                  <RadioGroupItem
                    value="avg24hPrice"
                    className="border-current text-amber-300"
                  />
                </label>
              </RadioGroup>
            </section>

            <section
              className={cn(
                "rounded-md border border-slate-700 bg-slate-900/70 p-2.5 transition-opacity",
                filtersAreOverridden && "opacity-55",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-300">
                    {t("Exclude incompatible items")}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {t("Exclude items invalid for the cultist circle")}
                  </span>
                  {excludeIncompatible &&
                    !filtersAreOverridden &&
                    incompatibleFilteredCount > 0 && (
                      <span className="mt-1 text-[10px] font-medium text-amber-300">
                        {t("Filtered {count} incompatible items", {
                          count: incompatibleFilteredCount.toLocaleString(),
                        })}
                      </span>
                    )}
                </div>
                <Switch
                  checked={excludeIncompatible}
                  onCheckedChange={onExcludeIncompatibleChange}
                  className="data-[state=checked]:bg-amber-400 data-[state=unchecked]:bg-slate-700"
                />
              </div>
            </section>

            <section
              className={cn(
                "rounded-md border border-slate-700 bg-slate-900/70 p-2.5 transition-opacity",
                filtersAreOverridden && "opacity-55",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-300">
                    {t("Flea Level Filter")}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {t("Hide items you cannot access at your current level")}
                  </span>
                  {useLevelFilter &&
                    !filtersAreOverridden &&
                    fleaLevelFilteredCount > 0 && (
                      <span className="mt-1 text-[10px] font-medium text-amber-300">
                        {t("Filtered {count} inaccessible items", {
                          count: fleaLevelFilteredCount.toLocaleString(),
                        })}
                      </span>
                    )}
                </div>
                <Switch
                  checked={useLevelFilter}
                  onCheckedChange={onUseLevelFilterChange}
                  className="data-[state=checked]:bg-amber-400 data-[state=unchecked]:bg-slate-700"
                />
              </div>

              {useLevelFilter && (
                <div className="mt-2 flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-2">
                  <span className="text-[11px] text-slate-300">
                    {t("Your Current Level")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={79}
                      value={normalizedLevel}
                      onChange={(event) =>
                        handlePlayerLevelChange(event.target.value)
                      }
                      className="h-8 w-16 border-slate-700 bg-slate-900/80 px-2 text-center font-mono text-xs text-amber-300"
                    />
                    <span className="text-[10px] text-slate-500">(1-79)</span>
                  </div>
                </div>
              )}
            </section>

            {priceMode === "flea" && (
              <section
                className={cn(
                  "rounded-md border border-slate-700 bg-slate-900/70 p-2.5 transition-opacity",
                  filtersAreOverridden && "opacity-55",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-300">
                      {t("Exclude Low Offer Count")}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {t("Filters items with fewer than 5 active flea offers")}
                    </span>
                    {useLastOfferCountFilter &&
                      !filtersAreOverridden &&
                      lowOfferCountFilteredCount > 0 && (
                        <span className="mt-1 text-[10px] font-medium text-amber-300">
                          {t("Filtered {count} low-offer items", {
                            count: lowOfferCountFilteredCount.toLocaleString(),
                          })}
                        </span>
                      )}
                  </div>
                  <Switch
                    checked={useLastOfferCountFilter}
                    onCheckedChange={onUseLastOfferCountFilterChange}
                    className="data-[state=checked]:bg-amber-400 data-[state=unchecked]:bg-slate-700"
                  />
                </div>
              </section>
            )}

            <section className="rounded-md border border-slate-700 bg-slate-900/70 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-300">
                    {t("Show all items")}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {filtersAreOverridden
                      ? t(
                          "All item-list filters are ignored and every item is shown",
                        )
                      : t(
                          "Only items allowed by your current filters are shown",
                        )}
                  </span>
                </div>
                <Switch
                  checked={filtersAreOverridden}
                  onCheckedChange={onIgnoreFiltersChange}
                  className="data-[state=checked]:bg-amber-400 data-[state=unchecked]:bg-slate-700"
                />
              </div>
            </section>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
