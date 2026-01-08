// recipes/page.tsx

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Package, CheckCircle2, Clock, Info, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ItemTooltip } from "@/components/ui/item-tooltip";
import { recipeIconMap } from "@/data/recipe-icons";
import { useRecipeItemData } from "@/hooks/use-recipe-item-data";

import { tarkovRecipes, type Recipe } from "@/data/recipes";

const NewBadge = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500 text-white absolute -top-1 -left-1 shadow-lg animate-pulse">
    NEW
  </span>
);

export function RecipesPage() {
  // Get isPVE from localStorage (same as main app)
  const [isPVE] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isPVE") === "true";
    }
    return false;
  });
  const { getItemByName } = useRecipeItemData(isPVE);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  // No local routing needed; global nav handles navigation

  // Global nav provides navigation; remove local back affordance

  const filteredItems = tarkovRecipes.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      // Search in inputs
      item.requiredItems.some((input) =>
        input.toLowerCase().includes(searchLower)
      ) ||
      // Search in outputs (handle both old and new format)
      item.producedItems.some((output) => {
        if (typeof output === "string") {
          return output.toLowerCase().includes(searchLower);
        } else {
          // New format: search in items array
          return output.items.some((outputItem) =>
            outputItem.toLowerCase().includes(searchLower)
          );
        }
      })
    );
  });

  // Keyboard shortcut to focus search with "/"
  useEffect(function registerSlashToFocus() {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const composing =
        (e as KeyboardEvent & { isComposing?: boolean }).isComposing === true;
      const isTyping =
        tag === "input" || tag === "textarea" || tag === "select" || composing;
      if (isTyping) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ItemBadge component with large external icon
  function ItemBadge({
    itemName,
    isOutput = false,
  }: {
    itemName: string;
    isOutput?: boolean;
  }) {
    const iconUrl = recipeIconMap[itemName];
    const itemData = getItemByName(itemName);

    const badgeContent = (
      <div className="flex items-center gap-3 lg:gap-4 w-full">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={itemName}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className="rounded-lg flex-shrink-0 bg-gray-900/50 p-2 w-12 h-12 lg:w-16 lg:h-16"
          />
        ) : (
          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg bg-gray-900/50 flex-shrink-0" />
        )}
        <Badge
          variant="secondary"
          title={itemName}
          className={`inline-flex items-center flex-1 truncate rounded-full border py-1.5 px-3 lg:py-2 lg:px-4 ${
            isOutput
              ? "bg-green-900/40 text-green-300 border-green-800/60"
              : "bg-gray-800/70 text-gray-100 border-gray-600"
          }`}
        >
          <span className="truncate text-sm lg:text-base">{itemName}</span>
        </Badge>
      </div>
    );

    // If we have item data, wrap in tooltip
    if (itemData) {
      return (
        <TooltipProvider>
          <ItemTooltip item={itemData} iconUrl={iconUrl}>
            {badgeContent}
          </ItemTooltip>
        </TooltipProvider>
      );
    }

    return badgeContent;
  }

  // RoomInfoBadge component for displaying room spawn information
  function RoomInfoBadge({
    roomInfo,
  }: {
    roomInfo: { itemName: string; spawnInfo: string };
  }) {
    // Get the battery icon URL
    const batteryIconUrl = recipeIconMap["1x 6-STEN-140-M military battery"];

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-blue-900/20 border border-blue-800/40 hover:bg-blue-900/30 transition-colors cursor-help">
              <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-300 font-medium">
                Room contains 100% battery spawn
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {/* Battery Icon */}
                {batteryIconUrl && (
                  <img
                    src={batteryIconUrl}
                    alt="6-STEN-140-M military battery"
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="rounded-lg bg-gray-800/50 p-1.5 border border-gray-700/50 flex-shrink-0"
                  />
                )}

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-300 mb-1">
                    {roomInfo.itemName}
                  </p>
                  <p className="text-xs text-gray-300">{roomInfo.spawnInfo}</p>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // MultipleOutputBadge component for recipes with multiple possible outputs
  function MultipleOutputBadge({
    items,
    explanation,
  }: {
    items: string[];
    explanation: string;
  }) {
    return (
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => {
          const iconUrl = recipeIconMap[item];
          const itemData = getItemByName(item);

          const badgeContent = (
            <div className="flex items-center gap-3 lg:gap-4 w-full">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={item}
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="rounded-lg flex-shrink-0 bg-gray-900/50 p-2 w-12 h-12 lg:w-16 lg:h-16"
                />
              ) : (
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg bg-gray-900/50 flex-shrink-0" />
              )}
              <Badge
                variant="secondary"
                title={item}
                className="bg-green-900/40 text-green-300 border-green-800/60 rounded-full border py-1.5 px-3 lg:py-2 lg:px-4 flex-1"
              >
                <span className="truncate text-sm lg:text-base">{item}</span>
              </Badge>
            </div>
          );

          return (
            <div key={idx}>
              {itemData ? (
                <TooltipProvider>
                  <ItemTooltip item={itemData} iconUrl={iconUrl}>
                    {badgeContent}
                  </ItemTooltip>
                </TooltipProvider>
              ) : (
                badgeContent
              )}
              {/* Add "and/or" or "or" between items (not after the last item) */}
              {idx < items.length - 1 && !explanation.includes("Outcome") && (
                <div className="flex items-center justify-center my-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-xs text-gray-400 bg-gray-800/60 px-3 py-1.5 rounded-full border border-gray-700 hover:bg-gray-700/60 hover:text-gray-300 transition-colors">
                          {explanation.includes("You always get 2 items")
                            ? "and/or"
                            : "or"}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">{explanation}</p>
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
  }

  // RecipeCard subcomponent
  function RecipeCard({ recipe }: { recipe: Recipe }) {
    // Handle both old format (string[]) and new format with multiple possible outputs
    const processOutputs = () => {
      const outputs: Array<{
        type: "normal" | "multiple_possible";
        content: string | { items: string[]; explanation: string };
      }> = [];

      recipe.producedItems.forEach((item) => {
        if (typeof item === "string") {
          // Old format: split comma-separated strings into individual items
          const splitItems = item
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          splitItems.forEach((splitItem) => {
            outputs.push({ type: "normal", content: splitItem });
          });
        } else {
          // New format: multiple possible outputs
          outputs.push({
            type: "multiple_possible",
            content: { items: item.items, explanation: item.explanation },
          });
        }
      });

      return outputs;
    };

    const processedOutputs = processOutputs();
    const outputCount = (() => {
      // If there are multiple outcome sets separated by OR, we only count the first one
      // (as both should ideally have the same item count, or we represent the 'either' state)
      const firstSet = processedOutputs[0];
      if (!firstSet) return 0;

      const countInItems = (items: string[]) => {
        return items.reduce((sum, item) => {
          const match = item.match(/^(\d+)x/);
          const qty = match ? parseInt(match[1], 10) : 1;
          return sum + qty;
        }, 0);
      };

      if (firstSet.type === "normal") {
        // Simple case: sum up all normal outputs (old format)
        return processedOutputs.reduce((sum, output) => {
          if (output.type === "normal") {
            const match = (output.content as string).match(/^(\d+)x/);
            return sum + (match ? parseInt(match[1], 10) : 1);
          }
          return sum;
        }, 0);
      } else {
        // Complex case: handle multiple_possible
        const content = firstSet.content as {
          items: string[];
          explanation: string;
        };

        if (content.explanation.includes("You get 1 item")) {
          return 1;
        }
        if (content.explanation.includes("You always get 2 items")) {
          return 2;
        }

        // Default to counting items in the set
        return countInItems(content.items);
      }
    })();

    return (
      <div className="relative rounded-2xl border border-gray-700/70 bg-gray-700/50 p-4 backdrop-blur transition-colors hover:bg-gray-700/70">
        {recipe.isNew && <NewBadge />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          {/* Inputs */}
          <div className="min-w-0 sm:pr-2">
            <div className="mb-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-red-300">
                <Package className="h-3.5 w-3.5 opacity-90" aria-hidden />
                <span>Sacrifice</span>
                <span className="rounded-full border border-gray-700 bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-300">
                  {recipe.requiredItems.length}
                </span>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                Items to sacrifice
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {recipe.requiredItems.map((ing, idx) => (
                <ItemBadge key={idx} itemName={ing} />
              ))}
            </div>
          </div>

          {/* Time */}
          <div
            className="sm:border-x sm:border-gray-700 sm:px-4 grid place-items-center"
            aria-label={`Crafting time ${recipe.craftingTime}`}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-gray-400"
                aria-hidden
              >
                <ArrowRight className="flow-arrow h-3 w-3 text-green-400/60" />
                <ArrowRight
                  className="flow-arrow h-3 w-3 text-green-400/80"
                  style={{ animationDelay: "150ms" }}
                />
                <ArrowRight
                  className="flow-arrow h-3 w-3 text-green-400/90"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <style>{`
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
              <div className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-900/60 px-3 py-1 text-[11px] font-medium text-gray-100 tracking-wide">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <span className="font-mono">{recipe.craftingTime}</span>
              </div>
            </div>
          </div>

          {/* Outputs */}
          <div className="min-w-0 sm:pl-2">
            <div className="mb-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-green-300">
                <CheckCircle2 className="h-3.5 w-3.5 opacity-90" aria-hidden />
                <span>Rewards</span>
                <span className="rounded-full border border-gray-700 bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-300">
                  {outputCount}
                </span>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                Items gained
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
                    />
                  );
                } else {
                  const content = output.content as {
                    items: string[];
                    explanation: string;
                  };
                  return (
                    <div key={`multiple-wrapper-${idx}`}>
                      <MultipleOutputBadge
                        key={`multiple-${idx}`}
                        items={content.items}
                        explanation={content.explanation}
                      />
                      {idx < processedOutputs.length - 1 && (
                        <div className="flex items-center justify-center my-4">
                          <span className="text-sm font-bold text-orange-400 bg-orange-950/30 px-4 py-1 rounded-full border border-orange-900/50 uppercase tracking-widest">
                            OR
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
              })}
            </div>
            {/* Room spawn information */}
            {recipe.roomInfo && <RoomInfoBadge roomInfo={recipe.roomInfo} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-my_bg_image bg-no-repeat bg-cover bg-fixed text-gray-100 px-4 pb-4 pt-0 sm:pt-1 overflow-auto -mt-px flex items-center justify-center">
      <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700 text-secondary shadow-lg w-full max-w-2xl lg:max-w-5xl mx-auto flex flex-col rounded-t-none border-t-0">
        <div className="sticky top-0 z-10 bg-gray-800/95 border-b border-gray-700 px-6 pt-6 pb-4 rounded-t-none backdrop-blur">
          <CardHeader className="p-0 mb-4">
            <h1 className="text-center text-2xl sm:text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-yellow-300 drop-shadow">
              Recipes
            </h1>
          </CardHeader>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search recipes by input or output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              ref={searchRef}
              className="w-full rounded-full bg-gray-700 text-white border-gray-600 focus:border-gray-500 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-gray-600 bg-gray-800/70 px-2 py-0.5 text-xs text-gray-200 hover:bg-gray-700"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-2 text-center text-xs text-gray-400">
            Tip: Try keywords like <span className="text-gray-300">WD-40</span>{" "}
            or <span className="text-gray-300">mask</span>.
          </div>
          <div className="mt-1 text-center text-[11px] text-gray-500">
            {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
          </div>
        </div>
        <CardContent className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
          {filteredItems.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-gray-700/70 bg-gray-800/40 p-6 text-center text-sm text-gray-300">
              No recipes match your search. Try a different keyword.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredItems.map((item, index) => (
                <RecipeCard key={index} recipe={item} />
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-400 mt-4 border-t border-gray-700 px-6 py-4">
          Data combined with the&nbsp;
          <a
            href="https://escapefromtarkov.fandom.com/wiki/Escape_from_Tarkov_Wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Escape from Tarkov Wiki
          </a>
          . Thank you all contributors!
        </CardFooter>
      </Card>
    </div>
  );
}
