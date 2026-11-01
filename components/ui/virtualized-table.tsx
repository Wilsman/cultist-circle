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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Lock,
  Star,
} from "lucide-react";
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

type SortKey =
  | "name"
  | "shortName"
  | "basePrice"
  | "lastLowPrice"
  | "avg24hPrice"
  | "traderSellPrice"
  | "traderBuyPrice"
  | "buyLimit";

interface VirtualizedTableProps {
  items: MinimalItem[];
  sortKey: string;
  sortDir: "asc" | "desc";
  onHeaderSort?: (sortKey: SortKey) => void;
  onToggleFavorite?: (itemId: string) => void;
  isFavorite?: (itemId: string) => boolean;
}

const ROW_HEIGHT = 40;

// Shared column sizes keep the header and the virtualized rows aligned.
// Lower-priority columns drop out on narrow screens instead of being clipped.
const COLUMNS = {
  name: "min-w-0 flex-1",
  basePrice: "w-[132px] shrink-0",
  lastLowPrice: "hidden w-[112px] shrink-0 sm:flex",
  avg24hPrice: "hidden w-[136px] shrink-0 xl:flex",
  traderSellPrice: "hidden w-[136px] shrink-0 md:flex",
  traderBuyPrice: "hidden w-[144px] shrink-0 lg:flex",
  buyLimit: "hidden w-[104px] shrink-0 lg:flex",
} as const;

const NUMBER_CELL =
  "items-center justify-end px-4 text-right tabular-nums text-muted-foreground";

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

function EmptyValue() {
  return <span className="text-muted-foreground/40">—</span>;
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = "right",
  className,
}: {
  label: string;
  column: SortKey;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort?: (sortKey: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortKey === column;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <div
      role="columnheader"
      aria-sort={
        active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "flex items-center px-2",
        align === "right" ? "justify-end" : "justify-start",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort?.(column)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        <span>{label}</span>
        <Icon
          className={cn("h-3.5 w-3.5", active ? "opacity-100" : "opacity-40")}
          aria-hidden="true"
        />
      </button>
    </div>
  );
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
  const [tableHeight, setTableHeight] = useState(0);

  useEffect(() => {
    function handleResize() {
      // Leave room for the site header and the table header.
      setTableHeight(Math.max(320, window.innerHeight - 200));
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];
      if (!item) return null;

      // Best trader sell price, excluding the flea market
      const bestTraderPrice =
        item.sellFor?.length > 0
          ? item.sellFor
              .filter(
                (seller) =>
                  seller?.vendor?.normalizedName !== "flea-market" &&
                  seller?.priceRUB != null,
              )
              .reduce<(typeof item.sellFor)[0] | null>((prev, curr) => {
                if (!prev) return curr;
                if (!curr?.priceRUB) return prev;
                return (prev?.priceRUB ?? 0) > curr.priceRUB ? prev : curr;
              }, null)
          : null;

      // Cheapest trader offer, excluding the flea market
      const bestBuyPrice =
        item.buyFor?.length > 0
          ? item.buyFor
              .filter(
                (offer) =>
                  offer?.vendor?.normalizedName !== "flea-market" &&
                  offer?.priceRUB != null,
              )
              .reduce<(typeof item.buyFor)[0] | null>((prev, curr) => {
                if (!prev) return curr;
                if (!curr?.priceRUB) return prev;
                return (prev?.priceRUB ?? 0) < curr.priceRUB ? prev : curr;
              }, null)
          : null;

      const itemLevelReq = getItemLevelRequirement(item.name);
      const categoryLevelReqs =
        item.categories?.map((cat) =>
          getCategoryLevelRequirementByName(cat.name),
        ) || [];
      const maxCategoryReq =
        categoryLevelReqs.length > 0 ? Math.max(...categoryLevelReqs) : 0;
      // An item-specific requirement wins over the category requirement
      const fleaLevelRequirement = itemLevelReq ?? maxCategoryReq;

      const favorite = isFavorite?.(item.id) ?? false;
      const favoriteLabel = favorite
        ? t("Remove from favorites")
        : t("Add to favorites");

      return (
        <div
          style={style}
          role="row"
          className="group flex items-center border-b border-border/40 text-sm transition-colors hover:bg-muted/40"
        >
          <div
            role="cell"
            className={cn(COLUMNS.name, "flex items-center gap-1.5 pl-2 pr-4")}
          >
            {onToggleFavorite && isFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id);
                }}
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  favorite
                    ? "text-yellow-500"
                    : "text-muted-foreground/50 hover:text-yellow-500",
                )}
                aria-label={favoriteLabel}
                aria-pressed={favorite}
                title={favoriteLabel}
              >
                <Star
                  className={cn("h-3.5 w-3.5", favorite && "fill-current")}
                />
              </button>
            )}
            <HoverCard openDelay={150} closeDelay={0}>
              <HoverCardTrigger asChild>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.name}
                </a>
              </HoverCardTrigger>
              <HoverCardContent
                side="right"
                align="start"
                sideOffset={12}
                className="w-[280px] overflow-hidden rounded-lg border-border/60 bg-popover/95 p-0 shadow-xl backdrop-blur-xl"
              >
                <div className="space-y-4 p-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold leading-tight text-foreground">
                      {item.name}
                    </h4>
                    {item.shortName && item.shortName !== item.name && (
                      <div className="text-xs text-muted-foreground">
                        {item.shortName}
                      </div>
                    )}
                  </div>

                  <div className="-mx-4 grid grid-cols-2 gap-4 border-y border-border/50 bg-muted/20 px-4 py-3">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Base Price
                      </span>
                      <div className="text-sm font-medium tabular-nums text-foreground">
                        ₽{item.basePrice.toLocaleString()}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Flea Req
                      </span>
                      {fleaLevelRequirement > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-orange-400">
                          <Lock className="h-3 w-3" />
                          <span>Lvl {fleaLevelRequirement}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground/60">
                          None
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">
                      Categories
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.categories?.slice(0, 5).map((cat) => (
                        <span
                          key={cat.name}
                          className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {cat.name}
                        </span>
                      ))}
                      {(item.categories?.length ?? 0) > 5 && (
                        <span className="rounded-md border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground/70">
                          +{(item.categories?.length ?? 0) - 5}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <div
            role="cell"
            className={cn(
              COLUMNS.basePrice,
              "flex items-center justify-end gap-1 pl-2 pr-4 font-medium tabular-nums text-foreground",
            )}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void navigator.clipboard.writeText(
                        String(item.basePrice),
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
            <span>{item.basePrice.toLocaleString()}</span>
          </div>
          <div role="cell" className={cn(COLUMNS.lastLowPrice, NUMBER_CELL)}>
            {item.lastLowPrice ? (
              item.lastLowPrice.toLocaleString()
            ) : (
              <EmptyValue />
            )}
          </div>
          <div role="cell" className={cn(COLUMNS.avg24hPrice, NUMBER_CELL)}>
            {item.avg24hPrice ? (
              item.avg24hPrice.toLocaleString()
            ) : (
              <EmptyValue />
            )}
          </div>
          <div role="cell" className={cn(COLUMNS.traderSellPrice, NUMBER_CELL)}>
            {bestTraderPrice ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {bestTraderPrice.priceRUB.toLocaleString()}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{capitalize(bestTraderPrice.vendor.normalizedName)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <EmptyValue />
            )}
          </div>
          <div role="cell" className={cn(COLUMNS.traderBuyPrice, NUMBER_CELL)}>
            {bestBuyPrice ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-end gap-1.5">
                    <span>{bestBuyPrice.priceRUB.toLocaleString()}</span>
                    {TRADER_IMAGES[bestBuyPrice.vendor.normalizedName] && (
                      <img
                        src={TRADER_IMAGES[bestBuyPrice.vendor.normalizedName]}
                        alt={bestBuyPrice.vendor.normalizedName}
                        width={16}
                        height={16}
                        className="h-4 w-4 rounded-full ring-1 ring-border"
                        fetchPriority="low"
                        loading="lazy"
                      />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {capitalize(bestBuyPrice.vendor.normalizedName)} (Level{" "}
                      {bestBuyPrice.vendor.minTraderLevel || 1})
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <EmptyValue />
            )}
          </div>
          <div role="cell" className={cn(COLUMNS.buyLimit, NUMBER_CELL)}>
            {!bestBuyPrice ? (
              <EmptyValue />
            ) : bestBuyPrice.vendor?.buyLimit ? (
              bestBuyPrice.vendor.buyLimit.toLocaleString()
            ) : (
              "∞"
            )}
          </div>
        </div>
      );
    },
    [items, onToggleFavorite, isFavorite, t],
  );

  const headerProps = { sortKey, sortDir, onSort: onHeaderSort };

  return (
    <div
      role="table"
      aria-rowcount={items.length}
      className="overflow-hidden rounded-lg border border-border/60 bg-background/40"
    >
      <div
        role="row"
        className="flex h-10 items-center overflow-hidden border-b border-border/60 bg-muted/30 [scrollbar-gutter:stable] text-xs font-medium text-muted-foreground"
      >
        <SortHeader
          {...headerProps}
          label={t("Name")}
          column="name"
          align="left"
          className={cn(COLUMNS.name, "pl-1")}
        />
        <SortHeader
          {...headerProps}
          label={t("Base Value")}
          column="basePrice"
          className={COLUMNS.basePrice}
        />
        <SortHeader
          {...headerProps}
          label={t("Flea")}
          column="lastLowPrice"
          className={COLUMNS.lastLowPrice}
        />
        <SortHeader
          {...headerProps}
          label={t("24h Avg Price")}
          column="avg24hPrice"
          className={COLUMNS.avg24hPrice}
        />
        <SortHeader
          {...headerProps}
          label={t("Sell to Trader")}
          column="traderSellPrice"
          className={COLUMNS.traderSellPrice}
        />
        <SortHeader
          {...headerProps}
          label={t("Buy from Trader")}
          column="traderBuyPrice"
          className={COLUMNS.traderBuyPrice}
        />
        <SortHeader
          {...headerProps}
          label={t("Buy Limit")}
          column="buyLimit"
          className={COLUMNS.buyLimit}
        />
      </div>
      {items.length ? (
        <List
          height={tableHeight}
          width="100%"
          itemCount={items.length}
          itemSize={ROW_HEIGHT}
          overscanCount={5}
        >
          {Row}
        </List>
      ) : (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          {t("No items match these filters.")}
        </div>
      )}
    </div>
  );
}
