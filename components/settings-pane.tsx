// components/settings-pane.tsx

import { List, RotateCcw, Search, CandlestickChart, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HelpCircle,
  Download,
  Upload,
  Trash2,
  Settings as SettingsIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DEFAULT_EXCLUDED_CATEGORY_IDS,
  getCategoryDisplayName,
  type ItemCategory,
} from "@/config/item-categories";
import { Alert } from "./ui/alert";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import {
  TraderLevelSelector,
  TraderLevels,
} from "@/components/ui/trader-level-selector";
import { ENABLE_LANGUAGE_FEATURE } from "@/config/feature-flags";
import { useLanguage } from "@/contexts/language-context";

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
}

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
}: SettingsPaneProps) {
  const [sortOption, setSortOption] = useState(currentSortOption);
  const [currentFleaPriceType, setCurrentFleaPriceType] =
    useState(fleaPriceType);
  const [currentPriceMode, setCurrentPriceMode] = useState<"flea" | "trader">(priceMode);
  const [currentUseLastOfferCountFilter, setCurrentUseLastOfferCountFilter] = useState(useLastOfferCountFilter);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [excludedItemsSearch, setExcludedItemsSearch] = useState("");
  const { language, setLanguage, supported } = useLanguage();

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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          onImportData(data);
          sonnerToast("Success", {
            description: "Data imported successfully",
          });
        } catch (error) {
          sonnerToast("Error", {
            description: "Failed to import data. Please check the file format.",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="bg-gray-800/95 backdrop-blur-md border-gray-700 text-white max-w-2xl max-h-[90vh] sm:max-h-[85vh] h-full overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure your preferences and manage your data
          </DialogDescription>
        </DialogHeader>

        {/* Tabs Switcher */}
        <Tabs
          defaultValue="general"
          className="w-full flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="sticky top-0 z-10 flex-shrink-0 overflow-x-auto">
            <TabsTrigger value="general">General/Sorting</TabsTrigger>
            <TabsTrigger value="categories">Excluded Categories</TabsTrigger>
            <TabsTrigger value="items">Excluded Items</TabsTrigger>
            <TabsTrigger value="data">Data/Reset</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 h-[calc(100%-48px)]" type="always">
            <TabsContent value="general" className="h-full p-1">
              {/* Language Section (General Tab) */}
              {ENABLE_LANGUAGE_FEATURE && (
                <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold">Language</span>
                  </div>
                  <div className="w-56">
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full bg-[#232b32] border border-[#e4c15a]/30 text-gray-100 focus:ring-yellow-300 focus:border-yellow-300">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#232b32] border border-[#e4c15a]/30 text-gray-100">
                        {supported.map((l) => (
                          <SelectItem
                            key={l.code}
                            value={l.code}
                            className="hover:bg-[#2d3748] focus:bg-[#2d3748] focus:text-white"
                          >
                            {l.label} ({l.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {/* Sort Options Section (General Tab) */}
              <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <List className="h-5 w-5 text-blue-400" />
                  <span className="text-lg font-semibold">Sort Options</span>
                </div>
                <div className="w-56">
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-full bg-[#232b32] border border-[#e4c15a]/30 text-gray-100 focus:ring-yellow-300 focus:border-yellow-300">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#232b32] border border-[#e4c15a]/30 text-gray-100">
                      <SelectItem 
                        value="az" 
                        className="hover:bg-[#2d3748] focus:bg-[#2d3748] focus:text-white"
                      >
                        Item name: A-Z
                      </SelectItem>
                      <SelectItem 
                        value="most-recent"
                        className="hover:bg-[#2d3748] focus:bg-[#2d3748] focus:text-white"
                      >
                        Most recently updated first
                      </SelectItem>
                      <SelectItem 
                        value="base-value"
                        className="hover:bg-[#2d3748] focus:bg-[#2d3748] focus:text-white"
                      >
                        Base Value: Low to High
                      </SelectItem>
                      <SelectItem 
                        value="base-value-desc"
                        className="hover:bg-[#2d3748] focus:bg-[#2d3748] focus:text-white"
                      >
                        Base Value: High to Low
                      </SelectItem>
                      <SelectItem 
                        value="ratio"
                        className="hover:bg-[#2d3748] focus:bg-[#2d3748] focus:text-white"
                      >
                        Best value for money
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price Mode Toggle */}
              <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CandlestickChart className="h-5 w-5 text-yellow-400" />
                    <span className="text-lg font-semibold">Price Mode</span>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-yellow-400/30 text-yellow-300/90 bg-yellow-400/10">WIP</span>
                  </div>
                </div>
                <RadioGroup
                  value={currentPriceMode}
                  onValueChange={(v) => setCurrentPriceMode(v as "flea" | "trader")}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <div className="flex items-center space-x-2 rounded-md border border-gray-700 p-3">
                    <RadioGroupItem value="flea" id="mode-flea" />
                    <Label htmlFor="mode-flea">Flea market prices</Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border border-gray-700 p-3">
                    <RadioGroupItem value="trader" id="mode-trader" />
                    <Label htmlFor="mode-trader">Trader prices</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-gray-400 mt-2">⚠️ Traders are currently work-in-progress, known limitations: all quest locked items present.</p>
              </div>
              
              {/* Trader Levels (only when trader mode) */}
              {currentPriceMode === "trader" && (
                <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <List className="h-5 w-5 text-yellow-400" />
                      <span className="text-lg font-semibold">Trader Levels</span>
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-yellow-400/30 text-yellow-300/90 bg-yellow-400/10">WIP</span>
                    </div>
                  </div>
                  <TraderLevelSelector
                    traderLevels={traderLevels}
                    onTraderLevelsChange={onTraderLevelsChange}
                  />
                </div>
              )}

              {/* Flea Price Type Section (General Tab) */}
              <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CandlestickChart className="h-5 w-5 text-green-400" />
                    <span className="text-lg font-semibold">Flea Market Price Basis</span>
                  <Badge
                    variant="outline"
                    className="text-yellow-300 border-gray-600 rounded-full animate-pulse"
                  >
                    New
                  </Badge>
                  </div>
                </div>
                <RadioGroup
                  value={currentFleaPriceType}
                  onValueChange={(value) => setCurrentFleaPriceType(value as 'lastLowPrice' | 'avg24hPrice')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lastLowPrice" id="lastLowPrice" className="text-yellow-300 border-gray-600" />
                    <Label htmlFor="lastLowPrice" className="text-gray-200">Last Low Price</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="avg24hPrice" id="avg24hPrice" className="text-yellow-300 border-gray-600" />
                    <Label htmlFor="avg24hPrice" className="text-gray-200">Average 24h Price</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-gray-400 mt-2">Determines which flea market price is used for calculations.</p>
              </div>

              {/* Market Offer Count Filter Section (General Tab) */}
              <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-purple-400" />
                    <span className="text-lg font-semibold">Exclude Low Offer Count Items</span>
                    <Badge
                      variant="outline"
                      className="text-yellow-300 border-gray-600 rounded-full animate-pulse"
                    >
                      New
                    </Badge>
                  </div>
                  <Switch
                    id="use-last-offer-count-filter"
                    checked={currentUseLastOfferCountFilter}
                    onCheckedChange={setCurrentUseLastOfferCountFilter}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-600"
                  />
                </div>
                <p className="text-sm text-gray-400">
                  If enabled, items with fewer than 5 offers on the Flea Market
                  will be excluded from calculations. This helps avoid using items
                  with artificially inflated prices due to low availability.
                </p>
              </div>

            </TabsContent>

            <TabsContent value="categories" className="h-full p-1">
              {/* Excluded Categories Section (Categories Tab) */}
              <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <List className="h-5 w-5 text-blue-400" />
                    <span className="text-lg font-semibold">
                      Excluded Categories
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 px-4 bg-red-300 hover:bg-red-400 text-gray-800 rounded"
                    onClick={() =>
                      onCategoryChange([...DEFAULT_EXCLUDED_CATEGORY_IDS])
                    }
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex items-center space-x-2 mb-4">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search categories..."
                    className="flex-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-[40vh] max-h-[300px] pr-4">
                  <div className="">
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
                          className="flex items-center space-x-2 py-1"
                        >
                          <Checkbox
                            checked={excludedCategories.includes(c.id)}
                            onCheckedChange={() =>
                              handleCategoryChange(c.id)
                            }
                            className="border-gray-500"
                          />
                          <Label className="text-sm">
                            {getCategoryDisplayName(c.name)}
                          </Label>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="items" className="h-full p-1">
              {/* Excluded Items Section (Items Tab) */}
              <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <List className="h-5 w-5 text-blue-400" />
                    <span className="text-lg font-semibold">
                      Excluded Items
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 px-4 bg-red-300 hover:bg-red-400 text-gray-800 rounded"
                    onClick={() => {
                      // Reset to default excluded items
                      onExcludedItemsChange(new Set(DEFAULT_EXCLUDED_ITEMS));
                      sonnerToast("Reset complete", {
                        description:
                          "Excluded items have been reset to defaults",
                      });
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="border-b border-[#e4c15a]/10 mb-2"></div>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">
                        Exclude Incompatible Items
                      </Label>
                      <p className="text-sm text-gray-400">
                        Exclude items that are incompatible with the cultist
                        circle
                      </p>
                    </div>
                    <Switch
                      checked={excludeIncompatible}
                      onCheckedChange={(checked) =>
                        onExcludeIncompatibleChange(checked as boolean)
                      }
                    />
                  </div>
                  <div className="flex flex-col p-3 bg-gray-700/50 rounded-lg">
                    <Label className="text-sm font-medium">
                      Excluded Items List
                    </Label>
                    {/* note: add new items with the exclude from auto button */}
                    <Alert variant="default" className="text-sm mb-2 mt-2">
                      To add an item to the list, use the{" "}
                      <span className="font-bold">
                        &quot;Exclude from Auto&quot;
                      </span>{" "}
                      when selecting items.
                    </Alert>
                    <p className="text-sm text-gray-400 mb-4">
                      Manage the list of excluded items
                    </p>

                    {/* Search existing items */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Search excluded items..."
                        className="flex-1"
                        value={excludedItemsSearch}
                        onChange={(e) => setExcludedItemsSearch(e.target.value)}
                      />
                    </div>

                    <ScrollArea className="overflow-y-auto pr-4">
                      <div className="">
                        {Array.from(excludedItems)
                          .filter((itemId) =>
                            itemId
                              .toLowerCase()
                              .includes(excludedItemsSearch.toLowerCase())
                          )
                          .sort()
                          .map((itemId) => (
                            <div
                              key={itemId}
                              className="flex items-center space-x-2 py-1 justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <Label className="text-sm">{itemId}</Label>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs px-2 py-1 rounded text-white hover:bg-transparent"
                                onClick={() => {
                                  const newExcludedItems = new Set(
                                    excludedItems
                                  );
                                  newExcludedItems.delete(itemId);
                                  onExcludedItemsChange(newExcludedItems);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="data" className="h-full p-1">
              {/* Data Management Section */}
              <div className="space-y-6">
                <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-blue-400" />
                    <span className="text-lg font-semibold">
                      Data Management
                    </span>
                  </div>
                  <div className="border-b border-[#e4c15a]/10 mb-2"></div>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">
                          Export Data
                        </Label>
                        <p className="text-sm text-gray-400">
                          Download your settings and preferences
                        </p>
                      </div>
                      <Button
                        onClick={onExportData}
                        variant="outline"
                        size="sm"
                        className="interactive-bounce border-gray-600 hover:bg-gray-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">
                          Import Data
                        </Label>
                        <p className="text-sm text-gray-400">
                          Restore from a backup file
                        </p>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImport}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="interactive-bounce border-gray-600 hover:bg-gray-600"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset Options Section */}
                <div className="bg-[#232b32] border border-[#e4c15a]/20 rounded-xl shadow-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="h-5 w-5 text-yellow-400" />
                    <span className="text-lg font-semibold">Reset Options</span>
                  </div>
                  <div className="border-b border-[#e4c15a]/10 mb-2"></div>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium text-red-400">
                          Clear All Data
                        </Label>
                        <p className="text-sm text-gray-400">
                          Remove all stored data and start fresh
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowConfirmClear(true)}
                        variant="destructive"
                        size="sm"
                        className="interactive-bounce"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Confirmation Dialogs */}
        <Dialog open={showConfirmClear} onOpenChange={setShowConfirmClear}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Confirm Clear Data</DialogTitle>
              <DialogDescription className="text-gray-400">
                This will permanently remove all your stored data, including
                settings and preferences. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmClear(false)}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onHardReset();
                  onClose();
                  setShowConfirmClear(false);
                }}
                className="interactive-bounce"
              >
                Clear All Data
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
