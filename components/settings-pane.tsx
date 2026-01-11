// components/settings-pane.tsx

import {
  LayoutGrid,
  RotateCcw,
  Search,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Archive,
  Database,
  ChevronRight,
  ChevronDown,
  Info,
  HelpCircle,
  Settings as SettingsIcon,
  X,
  Check,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DEFAULT_EXCLUDED_CATEGORY_IDS,
  getCategoryDisplayName,
  type ItemCategory,
} from "@/config/item-categories";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import {
  TraderLevelSelector,
  TraderLevels,
} from "@/components/ui/trader-level-selector";
import { ENABLE_LANGUAGE_FEATURE } from "@/config/feature-flags";
import { useLanguage } from "@/contexts/language-context";
import { CATEGORY_LEVEL_REQUIREMENTS } from "@/config/flea-level-requirements";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENT_VERSION } from "@/config/changelog";

interface SettingsPaneProps {
  isOpen: boolean;
  onClose: () => void;
  onHardReset: () => void;
  onExportData: () => void;
  onImportData: (data: string) => void;
  onSortChange: (sortOption: string) => void;
  currentSortOption: string;
  fleaPriceType: "lastLowPrice" | "avg24hPrice";
  onFleaPriceTypeChange: (priceType: "lastLowPrice" | "avg24hPrice") => void;
  priceMode: "flea" | "trader";
  onPriceModeChange: (mode: "flea" | "trader") => void;
  traderLevels: TraderLevels;
  onTraderLevelsChange: (levels: TraderLevels) => void;
  excludedCategories: string[]; // category IDs
  onCategoryChange: (categories: string[]) => void; // array of category IDs
  allCategories: ItemCategory[]; // list of categories with id+name
  excludeIncompatible: boolean;
  onExcludeIncompatibleChange: (exclude: boolean) => void;
  excludedItems: Set<string>;
  onExcludedItemsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClearLocalStorage: () => void;
  useLastOfferCountFilter: boolean;
  onUseLastOfferCountFilterChange: (value: boolean) => void;
  useLevelFilter: boolean;
  onUseLevelFilterChange: (value: boolean) => void;
  playerLevel: number;
  onPlayerLevelChange: (level: number) => void;
}

const NAV_ITEMS = [
  { id: "general", labelKey: "General", icon: LayoutGrid },
  { id: "categories", labelKey: "Categories", icon: ShieldCheck },
  { id: "items", labelKey: "Excluded Items", icon: Archive },
  { id: "data", labelKey: "Data & Reset", icon: Database },
];

export default function SettingsPane({
  isOpen,
  onClose,
  onExportData,
  onImportData,
  onSortChange,
  currentSortOption,
  fleaPriceType,
  onFleaPriceTypeChange,
  priceMode,
  onPriceModeChange,
  traderLevels,
  onTraderLevelsChange,
  excludedCategories,
  onCategoryChange,
  allCategories,
  excludeIncompatible,
  onExcludeIncompatibleChange,
  excludedItems,
  onExcludedItemsChange,
  onHardReset,
  useLastOfferCountFilter,
  onUseLastOfferCountFilterChange,
  useLevelFilter,
  onUseLevelFilterChange,
  playerLevel,
  onPlayerLevelChange,
}: SettingsPaneProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [sortOption, setSortOption] = useState(currentSortOption);
  const [currentFleaPriceType, setCurrentFleaPriceType] =
    useState(fleaPriceType);
  const [currentPriceMode, setCurrentPriceMode] = useState<"flea" | "trader">(
    priceMode
  );
  const [currentUseLastOfferCountFilter, setCurrentUseLastOfferCountFilter] =
    useState(useLastOfferCountFilter);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [excludedItemsSearch, setExcludedItemsSearch] = useState("");
  const { language, setLanguage, supported, t } = useLanguage();

  // Update parent component when sortOption changes
  useEffect(() => {
    onSortChange(sortOption);
  }, [sortOption, onSortChange]);

  // Update parent component when fleaPriceType changes
  useEffect(() => {
    onFleaPriceTypeChange(currentFleaPriceType);
  }, [currentFleaPriceType, onFleaPriceTypeChange]);

  // Update local state if prop changes (e.g., initial load or reset)
  useEffect(() => {
    setCurrentFleaPriceType(fleaPriceType);
  }, [fleaPriceType]);

  // Update parent when price mode changes
  useEffect(() => {
    onPriceModeChange(currentPriceMode);
  }, [currentPriceMode, onPriceModeChange]);

  // Sync local price mode when prop changes
  useEffect(() => {
    setCurrentPriceMode(priceMode);
  }, [priceMode]);

  useEffect(() => {
    setCurrentUseLastOfferCountFilter(useLastOfferCountFilter);
  }, [useLastOfferCountFilter]);

  useEffect(() => {
    onUseLastOfferCountFilterChange(currentUseLastOfferCountFilter);
  }, [currentUseLastOfferCountFilter, onUseLastOfferCountFilterChange]);

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    const updatedCategories = excludedCategories.includes(categoryId)
      ? excludedCategories.filter((id) => id !== categoryId)
      : [...excludedCategories, categoryId];

    onCategoryChange(updatedCategories);
  };

  const handleTickAll = () => {
    onCategoryChange(allCategories.map((c) => c.id));
  };

  const handleUntickAll = () => {
    onCategoryChange([]);
  };

  const handleResetCategories = () => {
    onCategoryChange([...DEFAULT_EXCLUDED_CATEGORY_IDS]);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          onImportData(data);
          sonnerToast(t("Success"), {
            description: t("Data imported successfully"),
          });
        } catch {
          sonnerToast(t("Error"), {
            description: t("Failed to import data. Please check the file format."),
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0f1115]/95 backdrop-blur-xl border-white/5 text-white max-w-4xl max-h-[90vh] sm:max-h-[85vh] h-[800px] sm:h-[700px] overflow-hidden p-0 gap-0 shadow-2xl flex flex-col sm:flex-row [&>button:last-child]:hidden sm:[&>button:last-child]:flex">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("Settings")}</DialogTitle>
          <DialogDescription>
            {t("Configure your preferences and manage your data")}
          </DialogDescription>
        </DialogHeader>

        {/* Navigation Sidebar/Top-Bar */}
        <div className="w-full sm:w-[240px] border-b sm:border-b-0 sm:border-r border-white/5 bg-black/20 flex flex-row sm:flex-col py-0 sm:py-6 px-0 sm:px-4 shrink-0 overflow-x-auto sm:overflow-x-visible no-scrollbar relative items-center sm:items-stretch">
          <div className="hidden sm:flex items-center gap-3 px-2 mb-8 mt-6">
            <div className="p-2 bg-yellow-400/10 rounded-xl">
              <SettingsIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              {t("Settings")}
            </h2>
          </div>

          <nav className="flex flex-row sm:flex-col space-x-1 sm:space-x-0 sm:space-y-1 py-3 sm:py-0 px-4 sm:px-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 px-3 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-all duration-200 group relative whitespace-nowrap",
                    isActive
                      ? "bg-white/10 text-white shadow-lg shadow-black/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:right-auto sm:left-0 h-1 sm:h-5 w-auto sm:w-1 bg-yellow-400 rounded-full"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 sm:h-4.5 sm:w-4.5 transition-colors",
                      isActive
                        ? "text-yellow-400"
                        : "group-hover:text-yellow-400/80"
                    )}
                  />
                  <span className="text-xs sm:text-sm font-medium">
                    {t(item.labelKey)}
                  </span>
                  {isActive && (
                    <ChevronRight className="hidden sm:block ml-auto h-4 w-4 text-white/30" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Close Button - Sticky */}
          <div className="sm:hidden sticky right-0 top-0 h-full flex items-center pr-4 pl-8 bg-gradient-to-l from-[#0f1115] via-[#0f1115]/90 to-transparent z-10">
            <DialogClose className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          <div className="hidden sm:flex pt-6 border-t border-white/5 flex flex-col gap-1 sm:mt-auto">
            <p className="px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
              {t("Version")}
            </p>
            <div className="px-2 flex items-center justify-between">
              <Badge
                variant="outline"
                className="bg-black/40 border-white/5 text-[10px] text-gray-400 px-2 py-0"
              >
                v{CURRENT_VERSION}
              </Badge>
              <span className="text-[10px] text-gray-600">
                {t("Stable")}
              </span>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-transparent to-white/[0.02]">
          <div className="h-12 sm:h-14 flex items-center px-6 sm:px-8 border-b border-white/5">
            <h3 className="text-[10px] sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
              {NAV_ITEMS.find((i) => i.id === activeTab)
                ? t(NAV_ITEMS.find((i) => i.id === activeTab)!.labelKey)
                : ""}
            </h3>
          </div>

          <ScrollArea className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                transition={{ duration: 0.2 }}
                className="p-8 pb-12"
              >
                {activeTab === "general" && (
                  <div className="space-y-8">
                    {/* Language Section */}
                    {ENABLE_LANGUAGE_FEATURE && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-base font-semibold text-white">
                            {t("Language")}
                          </Label>
                          <Badge className="bg-yellow-400/10 text-yellow-500 border-yellow-400/20 text-[10px] uppercase">
                            {t("WIP")}
                          </Badge>
                        </div>
                        <div className="w-64">
                          <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors h-10 rounded-xl">
                              <SelectValue placeholder={t("Select language")} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1c20] border-white/10 text-white rounded-xl">
                              {supported.map((l) => (
                                <SelectItem
                                  key={l.code}
                                  value={l.code}
                                  className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
                                >
                                  {l.label} ({l.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed italic">
                          {t('Known issue: the "Excluded Items" list is still shown in English.')}
                        </p>
                      </section>
                    )}

                    {/* Sort Options Section */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold text-white">
                          {t("Sort Options")}
                        </Label>
                      </div>
                      <div className="w-64">
                        <Select
                          value={sortOption}
                          onValueChange={setSortOption}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors h-10 rounded-xl">
                            <SelectValue placeholder={t("Sort by...")} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1c20] border-white/10 text-white rounded-xl text-xs">
                            <SelectItem
                              value="az"
                              className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
                            >
                              {t("Item name: A-Z")}
                            </SelectItem>
                            <SelectItem
                              value="most-recent"
                              className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
                            >
                              {t("Most recently updated")}
                            </SelectItem>
                            <SelectItem
                              value="base-value"
                              className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
                            >
                              {t("Base Value: Low to High")}
                            </SelectItem>
                            <SelectItem
                              value="base-value-desc"
                              className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
                            >
                              {t("Base Value: High to Low")}
                            </SelectItem>
                            <SelectItem
                              value="ratio"
                              className="rounded-lg focus:bg-yellow-400/10 focus:text-yellow-400"
                            >
                              {t("Best value for money")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </section>

                    {/* Price Mode Toggle */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold text-white">
                          {t("Price Mode")}
                        </Label>
                        <Badge className="bg-yellow-400/10 text-yellow-500 border-yellow-400/20 text-[10px] uppercase">
                          {t("WIP")}
                        </Badge>
                      </div>
                      <RadioGroup
                        value={currentPriceMode}
                        onValueChange={(v) =>
                          setCurrentPriceMode(v as "flea" | "trader")
                        }
                        className="grid grid-cols-2 gap-4"
                      >
                        <Label
                          htmlFor="mode-flea"
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                            currentPriceMode === "flea"
                              ? "border-yellow-400/50 bg-yellow-400/5"
                              : "border-white/5 bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="flea"
                              id="mode-flea"
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">
                              {t("Flea Market")}
                            </span>
                          </div>
                          {currentPriceMode === "flea" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          )}
                        </Label>
                        <Label
                          htmlFor="mode-trader"
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                            currentPriceMode === "trader"
                              ? "border-yellow-400/50 bg-yellow-400/5"
                              : "border-white/5 bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="trader"
                              id="mode-trader"
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">
                              {t("Trader")}
                            </span>
                          </div>
                          {currentPriceMode === "trader" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          )}
                        </Label>
                      </RadioGroup>
                    </section>

                    {/* Trader Levels */}
                    {currentPriceMode === "trader" && (
                      <section className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Label className="text-base font-semibold text-white">
                            Trader Levels
                          </Label>
                        </div>
                        <TraderLevelSelector
                          traderLevels={traderLevels}
                          onTraderLevelsChange={onTraderLevelsChange}
                        />
                      </section>
                    )}

                    {/* Flea Market Price Basis */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold text-white">
                          Flea Market Price Basis
                        </Label>
                      </div>
                      <RadioGroup
                        value={currentFleaPriceType}
                        onValueChange={(v) =>
                          setCurrentFleaPriceType(
                            v as "lastLowPrice" | "avg24hPrice"
                          )
                        }
                        className="space-y-3"
                      >
                        <Label
                          htmlFor="lastLowPrice"
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                            currentFleaPriceType === "lastLowPrice"
                              ? "border-emerald-400/50 bg-emerald-400/5"
                              : "border-white/5 bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3 text-sm">
                            <RadioGroupItem
                              value="lastLowPrice"
                              id="lastLowPrice"
                              className="sr-only"
                            />
                            <span className="font-medium">Last Low Price</span>
                            <span className="text-gray-500 text-xs">
                              Uses the most recent lowest listing
                            </span>
                          </div>
                          {currentFleaPriceType === "lastLowPrice" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                        </Label>
                        <Label
                          htmlFor="avg24hPrice"
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                            currentFleaPriceType === "avg24hPrice"
                              ? "border-emerald-400/50 bg-emerald-400/5"
                              : "border-white/5 bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3 text-sm">
                            <RadioGroupItem
                              value="avg24hPrice"
                              id="avg24hPrice"
                              className="sr-only"
                            />
                            <span className="font-medium">
                              Average 24h Price
                            </span>
                            <span className="text-gray-500 text-xs">
                              Weighted average over the last 24h
                            </span>
                          </div>
                          {currentFleaPriceType === "avg24hPrice" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                        </Label>
                      </RadioGroup>
                    </section>

                    {/* Market Offer Count Filter (Temporarily Disabled) */}
                    <section className="space-y-4 pt-6 border-t border-white/5 opacity-50 cursor-not-allowed">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold text-gray-400">
                              Exclude Low Offer Count Items
                            </Label>
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/10 text-[10px] text-gray-500 uppercase px-2 py-0"
                            >
                              Disabled
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Items with fewer than 5 offers on the Flea Market
                            will not be excluded from calculations.
                          </p>
                        </div>
                        <Switch
                          id="use-last-offer-count-filter"
                          checked={false}
                          disabled={true}
                          className="data-[state=unchecked]:bg-white/10"
                        />
                      </div>
                    </section>

                    {/* Flea Market Level Filter */}
                    <section className="space-y-6 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold text-white">
                              Flea Market Level Filter
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="text-gray-500 hover:text-white transition-colors">
                                  <Info className="h-4 w-4" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                side="right"
                                className="w-80 bg-[#1a1c20] border-white/10 p-4 shadow-2xl rounded-2xl"
                              >
                                <div className="space-y-4">
                                  <h4 className="text-sm font-semibold text-yellow-400 lowercase tracking-wider">
                                    Level Requirements
                                  </h4>
                                  <ScrollArea className="h-48">
                                    <div className="space-y-2 pr-4">
                                      {[...CATEGORY_LEVEL_REQUIREMENTS]
                                        .sort(
                                          (a, b) =>
                                            a.levelRequirement -
                                            b.levelRequirement
                                        )
                                        .map((cat) => (
                                          <div
                                            key={cat.categoryId}
                                            className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0"
                                          >
                                            <span className="text-gray-400">
                                              {cat.categoryName}
                                            </span>
                                            <span className="text-yellow-400 font-mono">
                                              Lv.{cat.levelRequirement}
                                            </span>
                                          </div>
                                        ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <p className="text-xs text-gray-400">
                            Filter items you can&apos;t buy yet based on your
                            level.
                          </p>
                        </div>
                        <Switch
                          id="use-level-filter"
                          checked={useLevelFilter}
                          onCheckedChange={onUseLevelFilterChange}
                          className="data-[state=checked]:bg-yellow-400"
                        />
                      </div>

                      <AnimatePresence>
                        {useLevelFilter && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5"
                          >
                            <div className="space-y-1 flex-1">
                              <Label className="text-sm font-medium">
                                Your Current Level
                              </Label>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="number"
                                  min={1}
                                  max={79}
                                  value={playerLevel}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 1 && val <= 79)
                                      onPlayerLevelChange(val);
                                  }}
                                  className="w-16 h-8 bg-black/40 border-white/10 text-center font-mono text-yellow-400"
                                />
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                                  (1 - 79)
                                </span>
                              </div>
                            </div>
                            {playerLevel < 30 && (
                              <div className="w-32 text-[10px] text-yellow-400/80 leading-relaxed bg-yellow-400/5 p-2 rounded-lg border border-yellow-400/10">
                                ⚠️ High-value categories are restricted at Lv.
                                {playerLevel}.
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  </div>
                )}

                {activeTab === "categories" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white/5 p-5 rounded-3xl border border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">
                            {t("Excluded Categories")}
                          </h4>
                          <Link href="/faq" target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full hover:bg-white/10 text-gray-400"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                        <p className="text-sm text-gray-400">
                          {t("Selection will be hidden from the auto-selector and items lists.")}
                        </p>
                      </div>
                      <div className="w-full space-y-2 md:w-auto md:space-y-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="md:hidden h-10 w-full justify-between rounded-2xl border border-white/10 bg-white/5 text-sm text-gray-200 hover:bg-white/10"
                            >
                              {t("Quick Actions")}
                              <ChevronDown className="h-4 w-4 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-2xl border border-white/10 bg-[#0f131a]/95 p-1 text-gray-200 shadow-2xl backdrop-blur"
                          >
                            <DropdownMenuItem
                              className="flex items-center gap-2 text-sm"
                              onSelect={handleTickAll}
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              {t("Tick All")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center gap-2 text-sm"
                              onSelect={handleUntickAll}
                            >
                              <Ban className="h-3.5 w-3.5 text-red-400" />
                              {t("Untick All")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center gap-2 text-sm"
                              onSelect={handleResetCategories}
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-yellow-400" />
                              {t("Reset Defaults")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="hidden md:flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleTickAll}
                            className="h-8 hover:bg-emerald-400/10 hover:text-emerald-400 text-xs rounded-xl"
                          >
                            <Check className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                            {t("Tick All")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleUntickAll}
                            className="h-8 hover:bg-red-400/10 hover:text-red-400 text-xs rounded-xl"
                          >
                            <Ban className="h-3.5 w-3.5 mr-2 text-red-400" />
                            {t("Untick All")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetCategories}
                            className="h-8 hover:bg-white/10 text-xs rounded-xl"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-2 text-yellow-400" />
                            {t("Reset")}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-yellow-400 transition-colors" />
                      <Input
                        placeholder={t("Search for categories...")}
                        className="pl-11 h-12 bg-white/5 border-white/10 rounded-2xl focus:ring-yellow-400 focus:border-yellow-400 transition-all placeholder:text-gray-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 pt-2">
                      {allCategories
                        .filter((c) =>
                          c.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                          >
                            <Checkbox
                              id={`cat-${c.id}`}
                              checked={excludedCategories.includes(c.id)}
                              onCheckedChange={() => handleCategoryChange(c.id)}
                              className="border-white/20 data-[state=checked]:bg-yellow-400"
                            />
                            <Label
                              htmlFor={`cat-${c.id}`}
                              className="text-sm cursor-pointer text-gray-400 group-hover:text-white transition-colors"
                            >
                              {getCategoryDisplayName(c.name)}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {activeTab === "items" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-400/10 to-transparent rounded-3xl border border-emerald-400/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg text-emerald-400">
                            {t("Compatibility Mode")}
                          </h4>
                          <Link href="/faq" target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full hover:bg-emerald-400/10 text-emerald-400/60"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                        <p className="text-sm text-gray-400">
                          {t("Exclude items invalid for the cultist circle.")}
                        </p>
                      </div>
                      <Switch
                        checked={excludeIncompatible}
                        onCheckedChange={onExcludeIncompatibleChange}
                        className="data-[state=checked]:bg-emerald-400"
                      />
                    </div>

                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-base font-semibold">
                            {t("Individual Exclusions")}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {t('To add items, use the "Exclude from Auto" button in the selector.')}
                          </p>
                        </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onExcludedItemsChange(
                                new Set(DEFAULT_EXCLUDED_ITEMS)
                              );
                              sonnerToast.success(t("Reset Complete"), {
                                description: t("Defaults restored."),
                              });
                            }}
                            className="h-8 hover:bg-white/10 text-xs rounded-xl"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-2 text-yellow-400" />
                            {t("Restore Defaults")}
                          </Button>
                      </div>

                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-yellow-400 transition-colors" />
                        <Input
                          placeholder={t("Find an excluded item...")}
                          className="pl-11 h-12 bg-white/5 border-white/10 rounded-2xl focus:ring-yellow-400 focus:border-yellow-400 transition-all placeholder:text-gray-600"
                          value={excludedItemsSearch}
                          onChange={(e) =>
                            setExcludedItemsSearch(e.target.value)
                          }
                        />
                      </div>

                      <ScrollArea className="h-[300px] border border-white/5 bg-black/20 rounded-2xl p-4">
                        <div className="grid grid-cols-1 gap-1">
                          {Array.from(excludedItems)
                            .filter((id) =>
                              id
                                .toLowerCase()
                                .includes(excludedItemsSearch.toLowerCase())
                            )
                            .sort()
                            .map((id) => (
                              <div
                                key={id}
                                className="flex items-center justify-between p-2 pl-4 rounded-xl hover:bg-white/5 transition-colors group"
                              >
                                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                                  {id}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const next = new Set(excludedItems);
                                    next.delete(id);
                                    onExcludedItemsChange(next);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-red-400/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          {excludedItems.size === 0 && (
                            <div className="h-40 flex flex-col items-center justify-center text-gray-600 gap-2">
                              <Archive className="h-8 w-8 opacity-20" />
                              <p className="text-xs font-medium uppercase tracking-widest opacity-50">
                                {t("Empty Archive")}
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </section>
                  </div>
                )}

                {activeTab === "data" && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <section className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                        <div className="p-3 bg-blue-400/10 rounded-2xl w-fit">
                          <Download className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold">{t("Export Profile")}</h4>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {t("Save your custom exclusions and preferences as a JSON file.")}
                          </p>
                        </div>
                        <Button
                          onClick={onExportData}
                          className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all shadow-sm"
                        >
                          {t("Export Configuration")}
                        </Button>
                      </section>

                      <section className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                        <div className="p-3 bg-indigo-400/10 rounded-2xl w-fit">
                          <Upload className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold">{t("Import Profile")}</h4>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {t("Restore your configuration from a previously exported file.")}
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Button
                            variant="outline"
                            className="w-full h-10 border-white/10 text-white rounded-xl bg-white/5 hover:bg-white/10 shadow-sm"
                          >
                            {t("Upload File")}
                          </Button>
                        </div>
                      </section>
                    </div>

                    <section className="p-8 bg-red-400/5 rounded-[32px] border border-red-400/10 space-y-6">
                      <div className="flex items-start gap-5">
                        <div className="p-3 bg-red-400/20 rounded-2xl text-red-400 mt-1">
                          <RotateCcw className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-lg font-bold text-red-400">
                            {t("System Hard Reset")}
                          </h4>
                          <p className="text-sm text-gray-400 leading-relaxed max-w-md">
                            {t("This will clear all localized storage including custom categories, exclusions, and preferred price modes.")}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowConfirmClear(true)}
                        className="w-full h-12 bg-red-400/10 hover:bg-red-400 text-red-100 font-semibold rounded-2xl border border-red-400/20 transition-all"
                      >
                        {t("Clear All Application Data")}
                      </Button>
                    </section>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Confirmation Dialogs */}
        <Dialog open={showConfirmClear} onOpenChange={setShowConfirmClear}>
          <DialogContent className="bg-[#1a1c20] border-white/5 text-white rounded-[32px] p-8 shadow-2xl">
            <DialogHeader className="space-y-4">
              <div className="p-4 bg-red-400/20 rounded-3xl w-fit mx-auto">
                <Trash2 className="h-8 w-8 text-red-400" />
              </div>
              <div className="text-center space-y-2">
                <DialogTitle className="text-2xl font-bold">
                  {t("Clear All Data?")}
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-sm leading-relaxed max-w-[320px] mx-auto">
                  {t("This action is irreversible. All your custom exclusions and settings will be permanently deleted.")}
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-8">
              <Button
                variant="destructive"
                onClick={() => {
                  onHardReset();
                  onClose();
                  setShowConfirmClear(false);
                }}
                className="h-12 rounded-2xl font-bold bg-red-400 hover:bg-red-500 shadow-lg shadow-red-500/20"
              >
                {t("Yes, Delete Everything")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowConfirmClear(false)}
                className="h-12 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {t("Cancel")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
