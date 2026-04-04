/* eslint-disable @next/next/no-img-element */
// recipes/page.tsx - Enhanced UX/UI version

"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ItemTooltip } from "@/components/ui/item-tooltip";
import { recipeIconMap } from "@/data/recipe-icons";
import { useRecipeItemData } from "@/hooks/use-recipe-item-data";
import { useLanguage } from "@/contexts/language-context";
import { tarkovRecipes, type Recipe } from "@/data/recipes";
import {
  Package,
  CheckCircle2,
  Info,
  ArrowRight,
  Search,
  X,
  Clock3,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ============================================================================
// Types & Constants
// ============================================================================

interface ProcessedOutput {
  type: "normal" | "multiple_possible";
  content: string | { items: string[]; explanation: string };
}

type SortOption = "default" | "time-asc" | "time-desc" | "newest";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "time-asc", label: "Fastest First" },
  { value: "time-desc", label: "Slowest First" },
  { value: "newest", label: "Newest First" },
];

// ============================================================================
// Utility Functions
// ============================================================================

function parseCraftingTime(timeStr: string): number {
  const hours = timeStr.match(/(\d+)\s*hour/i);
  const minutes = timeStr.match(/(\d+)\s*min/i);
  const seconds = timeStr.match(/(\d+)\s*sec/i);
  return (
    (hours ? parseInt(hours[1], 10) * 3600 : 0) +
    (minutes ? parseInt(minutes[1], 10) * 60 : 0) +
    (seconds ? parseInt(seconds[1], 10) : 0)
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ============================================================================
// Components
// ============================================================================

const NewBadge = React.memo(function NewBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white absolute -top-2 -left-2 shadow-lg animate-pulse z-10">
      NEW
    </span>
  );
});

const ModeRestrictionBadge = React.memo(function ModeRestrictionBadge({
  t,
  modeRestriction,
}: {
  t: (key: string) => string;
  modeRestriction: Recipe["modeRestriction"];
}) {
  if (modeRestriction !== "pvp-only") {
    return null;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 border border-amber-400/40 text-amber-200 shadow-lg">
            {t("PVP ONLY")}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {t("This recipe is available in PvP mode only.")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

const FoundInRaidBadge = React.memo(function FoundInRaidBadge({
  t,
}: {
  t: (key: string) => string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-500/20 border border-blue-400/40 text-blue-200 shadow-lg">
                {t("FiR")}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {t("Found in Raid")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

const ItemBadge = React.memo(function ItemBadge({
  itemName,
  isOutput = false,
  size = "md",
  getItemByName,
}: {
  itemName: string;
  isOutput?: boolean;
  size?: "sm" | "md";
  getItemByName: (
    name: string,
  ) => ReturnType<ReturnType<typeof useRecipeItemData>["getItemByName"]>;
}) {
  const iconUrl = recipeIconMap[itemName];
  const itemData = getItemByName(itemName);
  const sizeClasses =
    size === "sm"
      ? "w-10 h-10 p-1.5"
      : "w-12 h-12 lg:w-14 lg:h-14 p-2";

  const badgeContent = (
    <div className="flex items-center gap-2 lg:gap-3 w-full group">
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={itemName}
          width={56}
          height={56}
          className={`rounded-lg flex-shrink-0 bg-gray-900/50 ${sizeClasses} transition-transform group-hover:scale-105`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-lg bg-gray-800/50 flex-shrink-0 border border-gray-700/50`}
        />
      )}
      <Badge
        variant="secondary"
        title={itemName}
        className={`inline-flex items-center flex-1 min-w-0 truncate rounded-lg border py-1.5 px-2 lg:py-1.5 lg:px-3 text-xs lg:text-sm font-medium transition-colors ${
          isOutput
            ? "bg-green-900/30 text-green-300 border-green-700/40 hover:bg-green-900/50"
            : "bg-gray-800/60 text-gray-200 border-gray-700 hover:bg-gray-700/70"
        }`}
      >
        <span className="truncate">{itemName}</span>
      </Badge>
    </div>
  );

  if (itemData) {
    return (
      <TooltipProvider delayDuration={150}>
        <ItemTooltip item={itemData} iconUrl={iconUrl}>
          {badgeContent}
        </ItemTooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
});

const RoomInfoBadge = React.memo(function RoomInfoBadge({
  roomInfo,
}: {
  roomInfo: { itemName: string; spawnInfo: string };
}) {
  const batteryIconUrl =
    recipeIconMap["1x 6-STEN-140-M military battery"];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-blue-900/20 border border-blue-800/40 hover:bg-blue-900/30 transition-colors cursor-help group">
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 group-hover:text-blue-300 transition-colors" />
            <span className="text-xs text-blue-300 font-medium">
              Guaranteed battery spawn
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-sm bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-4"
        >
          <div className="flex items-start gap-3">
            {batteryIconUrl && (
              <img
                src={batteryIconUrl}
                alt="Battery"
                width={48}
                height={48}
                className="rounded-lg bg-gray-800/50 p-1.5 border border-gray-700/50 flex-shrink-0"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-300 mb-1">
                {roomInfo.itemName}
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {roomInfo.spawnInfo}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

const MultipleOutputBadge = React.memo(function MultipleOutputBadge({
  items,
  explanation,
  getItemByName,
}: {
  items: string[];
  explanation: string;
  getItemByName: (
    name: string,
  ) => ReturnType<ReturnType<typeof useRecipeItemData>["getItemByName"]>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const showConnector = !isLast && !explanation.includes("Outcome");

        return (
          <div key={idx}>
            <ItemBadge itemName={item} isOutput={true} getItemByName={getItemByName} />
            {showConnector && (
              <div className="flex items-center justify-center my-1.5">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-[10px] text-gray-500 bg-gray-800/40 px-2.5 py-1 rounded-full border border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-400 transition-all">
                        {explanation.includes("You always get 2 items")
                          ? "and/or"
                          : "or"}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>{explanation}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

interface RecipeCardProps {
  recipe: Recipe;
  getItemByName: (
    name: string,
  ) => ReturnType<ReturnType<typeof useRecipeItemData>["getItemByName"]>;
  t: (key: string) => string;
}

const RecipeCard = React.memo(function RecipeCard({
  recipe,
  getItemByName,
  t,
}: RecipeCardProps) {
  const processOutputs = useCallback((): ProcessedOutput[] => {
    const outputs: ProcessedOutput[] = [];

    recipe.producedItems.forEach((item) => {
      if (typeof item === "string") {
        item
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((splitItem) => {
            outputs.push({ type: "normal", content: splitItem });
          });
      } else {
        outputs.push({
          type: "multiple_possible",
          content: { items: item.items, explanation: item.explanation },
        });
      }
    });

    return outputs;
  }, [recipe.producedItems]);

  const processedOutputs = useMemo(() => processOutputs(), [processOutputs]);

  const outputCount = useMemo(() => {
    const firstSet = processedOutputs[0];
    if (!firstSet) return 0;

    if (firstSet.type === "normal") {
      return processedOutputs.reduce((sum, output) => {
        if (output.type === "normal") {
          const match = (output.content as string).match(/^(\d+)x/);
          return sum + (match ? parseInt(match[1], 10) : 1);
        }
        return sum;
      }, 0);
    } else {
      const content = firstSet.content as {
        items: string[];
        explanation: string;
      };
      if (content.explanation.includes("You get 1 item")) return 1;
      if (content.explanation.includes("You always get 2 items")) return 2;
      return content.items.reduce((sum, item) => {
        const match = item.match(/^(\d+)x/);
        return sum + (match ? parseInt(match[1], 10) : 1);
      }, 0);
    }
  }, [processedOutputs]);

  return (
    <div className="relative rounded-xl border border-gray-700/50 bg-gray-800/40 p-4 lg:p-5 backdrop-blur-sm transition-all duration-200 hover:bg-gray-800/60 hover:border-gray-600/50 hover:shadow-lg hover:shadow-black/20 group">
      {recipe.isNew && <NewBadge />}
      <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1.5">
        <FoundInRaidBadge t={t} />
        <ModeRestrictionBadge t={t} modeRestriction={recipe.modeRestriction} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        {/* Inputs Column */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700/50">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <Package className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-300">
                Sacrifice
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] text-gray-400 font-medium">
                {recipe.requiredItems.length}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {recipe.requiredItems.map((ing, idx) => (
              <ItemBadge key={idx} itemName={ing} getItemByName={getItemByName} />
            ))}
          </div>
        </div>

        {/* Time Column */}
        <div className="lg:border-x lg:border-gray-700/50 lg:px-6 flex flex-col items-center justify-center py-2 lg:py-0">
          <div className="flex items-center gap-1 mb-2">
            <ArrowRight
              className="flow-arrow h-3 w-3 text-green-400/60"
              style={{ animationDelay: "0ms" }}
            />
            <ArrowRight
              className="flow-arrow h-3 w-3 text-green-400/80"
              style={{ animationDelay: "150ms" }}
            />
            <ArrowRight
              className="flow-arrow h-3 w-3 text-green-400"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <style jsx global>{`
            @keyframes flowFlash {
              0% {
                opacity: 0;
              }
              30% {
                opacity: 1;
              }
              60%,
              100% {
                opacity: 0;
              }
            }
            .flow-arrow {
              animation: flowFlash 2s ease-in-out infinite;
              animation-fill-mode: both;
            }
          `}</style>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/60 border border-gray-700/50">
                  <Clock3 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-mono font-medium text-gray-200">
                    {recipe.craftingTime}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Crafting time
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Outputs Column */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700/50">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-green-300">
                Rewards
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] text-gray-400 font-medium">
                {outputCount}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {processedOutputs.map((output, idx) => {
              if (output.type === "normal") {
                return (
                  <ItemBadge
                    key={`${output.content}-${idx}`}
                    itemName={output.content as string}
                    isOutput={true}
                    getItemByName={getItemByName}
                  />
                );
              }
              const content = output.content as {
                items: string[];
                explanation: string;
              };
              return (
                <div key={`multiple-wrapper-${idx}`}>
                  <MultipleOutputBadge
                    items={content.items}
                    explanation={content.explanation}
                    getItemByName={getItemByName}
                  />
                  {idx < processedOutputs.length - 1 && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-xs font-bold text-orange-400/80 bg-orange-950/20 px-4 py-1 rounded-full border border-orange-900/30 uppercase tracking-widest">
                        OR
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {recipe.roomInfo && <RoomInfoBadge roomInfo={recipe.roomInfo} />}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Main Page Component
// ============================================================================

export default function RecipesPage() {
  const [isPVE] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isPVE") === "true";
    }
    return false;
  });

  const { getItemByName } = useRecipeItemData(isPVE);
  const languageContext = useLanguage();
  const t = (key: string) => languageContext.t(key);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 150);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || tag === "select" || e.isComposing;

      if (isTyping) {
        if (e.key === "Escape") {
          searchRef.current?.blur();
        }
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowFilters((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Filter and sort recipes
  const filteredAndSortedItems = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase().trim();

    let filtered = tarkovRecipes.filter((recipe) => {
      if (!searchLower) return true;

      const inInputs = recipe.requiredItems.some((input) =>
        input.toLowerCase().includes(searchLower),
      );

      const inOutputs = recipe.producedItems.some((output) => {
        if (typeof output === "string") {
          return output.toLowerCase().includes(searchLower);
        }
        return output.items.some((item) =>
          item.toLowerCase().includes(searchLower),
        );
      });

      return inInputs || inOutputs;
    });

    // Sort recipes
    switch (sortBy) {
      case "time-asc":
        filtered = [...filtered].sort(
          (a, b) =>
            parseCraftingTime(a.craftingTime) -
            parseCraftingTime(b.craftingTime),
        );
        break;
      case "time-desc":
        filtered = [...filtered].sort(
          (a, b) =>
            parseCraftingTime(b.craftingTime) -
            parseCraftingTime(a.craftingTime),
        );
        break;
      case "newest":
        filtered = [...filtered].sort(
          (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0),
        );
        break;
    }

    return filtered;
  }, [debouncedSearch, sortBy]);

  const hasActiveFilters = sortBy !== "default" || debouncedSearch;

  return (
    <div className="min-h-screen bg-my_bg_image bg-no-repeat bg-cover bg-fixed text-gray-100">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        <Card className="bg-gray-900/80 backdrop-blur-md border-gray-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900/95 border-b border-gray-800 px-4 sm:px-6 py-4 sm:py-5 backdrop-blur-md">
            <CardHeader className="p-0 mb-4 sm:mb-5 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-red-400">
                Cultist Circle Recipes
              </h1>
              <p className="text-center text-sm text-gray-400 mt-2">
                Discover what you can sacrifice and receive
              </p>
            </CardHeader>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search items or recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={searchRef}
                className="w-full pl-12 pr-24 py-3 rounded-xl bg-gray-800/70 text-white border-gray-700 focus:border-gray-500 focus:ring-2 focus:ring-gray-600/50 placeholder-gray-500 text-base transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded bg-gray-800 text-[10px] text-gray-500 border border-gray-700">
                  /
                </kbd>
              </div>
            </div>

            {/* Filters & Sort */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters & Sort
                {showFilters ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span className="px-3 py-1.5 rounded-full bg-gray-800/70 border border-gray-700">
                  {filteredAndSortedItems.length} recipe
                  {filteredAndSortedItems.length === 1 ? "" : "s"}
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSortBy("default");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-800 animate-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-medium self-center mr-2">
                    Sort by:
                  </span>
                  {SORT_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={sortBy === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy(option.value)}
                      className={`text-xs rounded-full transition-all ${
                        sortBy === option.value
                          ? "bg-gray-700 text-white border-gray-600"
                          : "bg-transparent text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-200"
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Tips */}
            {!searchQuery && (
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  Pro tip: Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 mx-1">
                    /
                  </kbd>{" "}
                  to search,{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 mx-1">
                    F
                  </kbd>{" "}
                  for filters
                </p>
              </div>
            )}
          </div>

          {/* Recipe List */}
          <CardContent className="p-4 sm:p-6">
            {filteredAndSortedItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
                  <Search className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-lg font-medium text-gray-300 mb-2">
                  No recipes found
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Try adjusting your search or filters
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSortBy("default");
                  }}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {filteredAndSortedItems.map((recipe, index) => (
                  <RecipeCard
                    key={`${recipe.requiredItems.join("-")}-${index}`}
                    recipe={recipe}
                    getItemByName={getItemByName}
                    t={t}
                  />
                ))}
              </div>
            )}
          </CardContent>

          {/* Footer */}
          <CardFooter className="border-t border-gray-800 px-4 sm:px-6 py-4 bg-gray-900/50">
            <p className="text-center text-xs text-gray-500 w-full">
              Data sourced from{" "}
              <a
                href="https://escapefromtarkov.fandom.com/wiki/Escape_from_Tarkov_Wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Escape from Tarkov Wiki
              </a>
              {" "}and our{" "}
              <a
                href="https://discord.com/invite/3dFmr5qaJK"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Cultist Circle Discord
              </a>
              . Thank you to all contributors!
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
