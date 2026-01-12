/* eslint-disable @next/next/no-img-element */
// components/ui/virtualized-table.tsx
"use client";

import React, { useCallback, useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { cn } from "@/lib/utils";
import { MinimalItem } from "@/hooks/use-tarkov-api";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Copy, Lock } from "lucide-react";
import {
  getItemLevelRequirement,
  getCategoryLevelRequirementByName,
} from "@/config/flea-level-requirements";
import { useLanguage } from "@/contexts/language-context";

// Trader image mapping
const TRADER_IMAGES: Record<string, string> = {
  prapor: "https://assets.tarkov.dev/54cb50c76803fa8b248b4571.webp",
  therapist: "https://assets.tarkov.dev/54cb57776803fa99248b456e.webp",
  skier: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
  peacekeeper: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
  mechanic: "https://assets.tarkov.dev/5a7c2eca46aef81a7ca2145d.webp",
  ragman: "https://assets.tarkov.dev/5ac3b934156ae10c4430e83c.webp",
  jaeger: "https://assets.tarkov.dev/5c0647fdd443bc2504c2d371.webp",
};

interface VirtualizedTableProps {
  items: MinimalItem[];
  sortKey: string;
  sortDir: "asc" | "desc";
  onHeaderSort?: (
    sortKey:
      | "name"
      | "shortName"
      | "basePrice"
      | "lastLowPrice"
      | "avg24hPrice"
      | "traderSellPrice"
      | "traderBuyPrice"
      | "buyLimit"
  ) => void;
  onToggleFavorite?: (itemId: string) => void;
  isFavorite?: (itemId: string) => boolean;
}

export function VirtualizedTable({
  items,
  sortKey,
  sortDir,
  onHeaderSort,
  onToggleFavorite,
  isFavorite,
}: VirtualizedTableProps) {
  const { t } = useLanguage();
  const [tableHeight, setTableHeight] = useState(0); // Default height, will be updated

  useEffect(() => {
    function handleResize() {
      // Assuming 200px for other elements like header/footer/margins
      setTableHeight(window.innerHeight - 200);
    }

    // Set initial height
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Custom cell component that uses divs instead of td elements
  const Cell = React.memo(
    ({
      className,
      children,
    }: {
      className?: string;
      children: React.ReactNode;
    }) => <div className={cn("px-4 py-2", className)}>{children}</div>
  );

  // Add display name for ESLint
  Cell.displayName = "VirtualizedTableCell";

  // Memoize the row renderer to prevent unnecessary re-renders
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];
      if (!item) return null;

      // Best trader price minus "Flea Market"
      const bestTraderPrice =
        item.sellFor?.length > 0
          ? item.sellFor
              .filter(
                (seller) =>
                  seller?.vendor?.normalizedName !== "flea-market" &&
                  seller?.priceRUB != null
              )
              .reduce<(typeof item.sellFor)[0] | null>((prev, curr) => {
                if (!prev) return curr;
                if (!curr?.priceRUB) return prev;
                return (prev?.priceRUB ?? 0) > curr.priceRUB ? prev : curr;
              }, null)
          : null;

      // Best buy price from traders (excluding flea market)
      const bestBuyPrice =
        item.buyFor?.length > 0
          ? item.buyFor
              .filter(
                (offer) =>
                  offer?.vendor?.normalizedName !== "flea-market" &&
                  offer?.priceRUB != null
              )
              .reduce<(typeof item.buyFor)[0] | null>((prev, curr) => {
                if (!prev) return curr;
                if (!curr?.priceRUB) return prev;
                return (prev?.priceRUB ?? 0) < curr.priceRUB ? prev : curr;
              }, null)
          : null;

      // Calculate Flea Level Requirement
      const itemLevelReq = getItemLevelRequirement(item.name);
      
      const categoryLevelReqs =
        item.categories?.map((cat) => getCategoryLevelRequirementByName(cat.name)) ||
        [];
      
      // Get the highest requirement from categories (if multiple)
      const maxCategoryReq =
        categoryLevelReqs.length > 0 ? Math.max(...categoryLevelReqs) : 0;
      
      // Item specific requirement takes precedence if defined, otherwise use category requirement
      const fleaLevelRequirement = itemLevelReq ?? maxCategoryReq;

      return (
        <div
          style={style}
          className="flex border-b transition-colors hover:bg-muted/50"
          key={item.id}
        >
          <Cell className="font-medium flex-1 min-w-[200px] truncate flex items-center gap-2">
            {onToggleFavorite && isFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id);
                }}
                className="text-muted-foreground hover:text-yellow-500 transition-colors relative group"
                aria-label={
                  isFavorite(item.id)
                    ? t("Remove from favorites")
                    : t("Add to favorites")
                }
              >
                <span className="absolute hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 -mt-8 left-1/2 transform -translate-x-1/2 opacity-80">
                  {isFavorite(item.id)
                    ? t("Remove from favorites")
                    : t("Add to favorites")}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isFavorite(item.id) ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={
                    isFavorite(item.id)
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  }
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
            )}
              <HoverCard openDelay={0} closeDelay={0}>
                <HoverCardTrigger asChild>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-zinc-100 flex-1 truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.name}
                  </a>
                </HoverCardTrigger>
                <HoverCardContent
                  side="right"
                  align="start"
                  sideOffset={12}
                  className="w-[280px] p-0 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/80 shadow-2xl rounded-xl overflow-hidden"
                >
                  <div className="relative">
                    {/* Color bar indicator based on value or rarity could go here, for now just a subtle gradient */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 opacity-50" />
                    
                    <div className="p-4 space-y-4">
                      {/* Header */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-zinc-100 leading-tight">
                          {item.name}
                        </h4>
                        {item.shortName && item.shortName !== item.name && (
                          <div className="text-xs text-zinc-500 font-mono tracking-tight">
                            {item.shortName}
                          </div>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-zinc-900/50 bg-zinc-900/20 -mx-4 px-4">
                        {/* Price */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                            Base Price
                          </span>
                          <div className="font-mono text-sm text-emerald-400/90 font-medium">
                            ₽{item.basePrice.toLocaleString()}
                          </div>
                        </div>

                        {/* Flea Req */}
                        {fleaLevelRequirement > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                              Flea Req
                            </span>
                            <div className="flex items-center gap-1.5 text-orange-400 font-medium text-sm">
                              <Lock className="w-3 h-3" />
                              <span>Lvl {fleaLevelRequirement}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                              Flea Req
                            </span>
                            <div className="text-sm text-zinc-600">None</div>
                          </div>
                        )}
                      </div>

                      {/* Categories */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                          Categories
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.categories?.slice(0, 5).map((cat) => (
                            <span
                              key={cat.name}
                              className="px-2 py-0.5 rounded-[4px] bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-medium"
                            >
                              {cat.name}
                            </span>
                          ))}
                          {(item.categories?.length ?? 0) > 5 && (
                            <span className="px-2 py-0.5 rounded-[4px] bg-zinc-900/50 border border-zinc-800/50 text-[10px] text-zinc-500">
                              +{(item.categories?.length ?? 0) - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
          </Cell>
          <Cell className="text-right font-semibold w-[120px]">
            <div className="flex items-center justify-end gap-2">
              <span>{item.basePrice.toLocaleString()}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background/60 hover:bg-muted/50 text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(
                          String(item.basePrice)
                        );
                      }}
                      aria-label={t("Copy base price")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Copy base price")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </Cell>
          <Cell className="text-muted-foreground text-right w-[120px]">
            {item.lastLowPrice?.toLocaleString() ?? "-"}
          </Cell>
          <Cell className="text-muted-foreground text-right w-[120px]">
            {item.avg24hPrice?.toLocaleString() ?? "-"}
          </Cell>
          <Cell className="text-muted-foreground text-right w-[120px]">
            {bestTraderPrice ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {bestTraderPrice.priceRUB.toLocaleString()}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{bestTraderPrice.vendor.normalizedName}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              "-"
            )}
          </Cell>
          <Cell className="text-muted-foreground text-right w-[120px]">
            {bestBuyPrice ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-end gap-1">
                    <span>{bestBuyPrice.priceRUB.toLocaleString()}</span>
                    {TRADER_IMAGES[bestBuyPrice.vendor.normalizedName] && (
                      <img
                        src={TRADER_IMAGES[bestBuyPrice.vendor.normalizedName]}
                        alt={bestBuyPrice.vendor.normalizedName}
                        width={16}
                        height={16}
                        className="w-4 h-4 rounded-full"
                        fetchPriority="low"
                        loading="lazy"
                      />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {bestBuyPrice.vendor.normalizedName} (Level{" "}
                      {bestBuyPrice.vendor.minTraderLevel || 1})
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              "-"
            )}
          </Cell>
          <Cell className="text-muted-foreground text-right w-[120px]">
            {bestBuyPrice?.vendor?.buyLimit
              ? bestBuyPrice.vendor.buyLimit.toLocaleString()
              : "∞"}
          </Cell>
        </div>
      );
    },
    [items, Cell, onToggleFavorite, isFavorite]
  );

  // Only render if we have items
  if (!items.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No items found matching your criteria
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex border-b">
        <div
          className="font-medium p-2 flex-1 min-w-[200px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("name")}
        >
          Name {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-right font-semibold p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("basePrice")}
        >
          Base Value{" "}
          {sortKey === "basePrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("lastLowPrice")}
        >
          Flea Price{" "}
          {sortKey === "lastLowPrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("avg24hPrice")}
        >
          Avg 24h Price{" "}
          {sortKey === "avg24hPrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("traderSellPrice")}
        >
          Sell-to-trader Price{" "}
          {sortKey === "traderSellPrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("traderBuyPrice")}
        >
          Buy From Traders{" "}
          {sortKey === "traderBuyPrice" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
        <div
          className="text-muted-foreground text-right p-2 w-[120px] cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onHeaderSort?.("buyLimit")}
        >
          Buy Limit {sortKey === "buyLimit" && (sortDir === "asc" ? "↑" : "↓")}
        </div>
      </div>
      <List
        height={tableHeight}
        width="100%"
        itemCount={items.length}
        itemSize={40}
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}
