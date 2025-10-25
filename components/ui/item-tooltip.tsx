"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { cn } from "@/lib/utils";

interface ItemTooltipProps {
  item: SimplifiedItem;
  children: React.ReactNode;
  iconUrl?: string;
}

export function ItemTooltip({ item, children, iconUrl }: ItemTooltipProps) {
  const formatPrice = (price: number | undefined) => {
    if (!price) return "-";
    return `₽ ${price.toLocaleString()}`;
  };

  const formatSize = () => {
    if (!item.width || !item.height) return "-";
    return `${item.width}x${item.height}`;
  };

  const getBestTraderPrice = () => {
    if (!item.buyFor || item.buyFor.length === 0) return null;
    const best = item.buyFor.reduce((max, offer) => 
      offer.priceRUB > (max?.priceRUB || 0) ? offer : max
    , item.buyFor[0]);
    return best;
  };

  const bestTrader = getBestTraderPrice();
  // Hide trader info if it's flea-market (since it's already shown in 24h average)
  const isTraderFleaMarket = bestTrader?.vendor?.normalizedName?.toLowerCase() === 'flea-market';
  const shouldShowTrader = bestTrader && !isTraderFleaMarket;

  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={8}
          className={cn(
            "z-50 overflow-hidden rounded-lg border border-gray-700/80 bg-gray-900/98 backdrop-blur-md shadow-2xl",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "min-w-[220px]"
          )}
        >
          <div className="p-3 space-y-2">
            {/* Header with icon and title */}
            <div className="pb-2 border-b border-gray-700/60">
              <div className="flex items-start gap-3">
                {/* Item Icon */}
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg bg-gray-800/50 p-1.5 border border-gray-700/50 flex-shrink-0"
                  />
                )}
                
                {/* Title - clickable if link exists */}
                <div className="flex-1 min-w-0">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-sm text-blue-400 hover:text-blue-300 leading-tight hover:underline"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <h3 className="font-semibold text-sm text-gray-100 leading-tight">
                      {item.name}
                    </h3>
                  )}
                  {item.shortName && item.shortName !== item.name && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.shortName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* List format - label on left, value on right */}
            <div className="space-y-1.5 text-xs">
              {/* Base Value */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Base Value:</span>
                <span className="font-semibold text-purple-400">
                  {formatPrice(item.basePrice)}
                </span>
              </div>

              {/* Market Price */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Market Price:</span>
                <span className="font-semibold text-emerald-400">
                  {formatPrice(item.lastLowPrice)}
                </span>
              </div>

              {/* 24h Average */}
              {item.avg24hPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">24h Average:</span>
                  <span className="font-semibold text-blue-400">
                    {formatPrice(item.avg24hPrice)}
                  </span>
                </div>
              )}

              {/* Best Trader Price - hide if flea-market since it's same as 24h average */}
              {shouldShowTrader && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Best Trader:</span>
                  <span className="font-semibold text-orange-400">
                    {formatPrice(bestTrader.priceRUB)}
                  </span>
                </div>
              )}

              {/* Trader Name - hide if flea-market */}
              {shouldShowTrader && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Trader:</span>
                  <span className="font-semibold text-gray-200 capitalize">
                    {bestTrader.vendor.normalizedName}
                    {bestTrader.vendor.minTraderLevel ? ` (L${bestTrader.vendor.minTraderLevel})` : ''}
                  </span>
                </div>
              )}

              {/* Size */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Size:</span>
                <span className="font-semibold text-gray-200">
                  {formatSize()}
                </span>
              </div>

              {/* Offer Count */}
              {item.lastOfferCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Offers:</span>
                  <span className={cn(
                    "font-semibold",
                    item.lastOfferCount <= 5 ? "text-red-400" : "text-gray-200"
                  )}>
                    {item.lastOfferCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
