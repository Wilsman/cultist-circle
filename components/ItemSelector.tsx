/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Copy, X as XIcon, Pin, Edit, CircleSlash, Trash2 } from "lucide-react";
import Fuse from "fuse.js";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { TraderLevels } from "@/components/ui/trader-level-selector";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { getRelativeDate } from "@/lib/utils";
import { toast as sonnerToast } from "sonner";

// Import Dropdown components
import { Button } from "@/components/ui/button";

// Import react-window for virtualization
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

interface ItemSelectorProps {
  items: SimplifiedItem[];
  selectedItem: SimplifiedItem | null;
  onSelect: (
    selectedItem: SimplifiedItem | null,
    overriddenPrice: number | null | undefined
  ) => void;
  onCopy: () => void;
  onCopyWithToast?: () => void;
  onPin: () => void;
  isPinned: boolean;
  overriddenPrice?: number;
  isAutoPickActive: boolean;
  overriddenPrices: Record<string, number>;
  isExcluded: boolean;
  onToggleExclude: () => void;
  excludedItems: Set<string>;
  fleaPriceType: 'lastLowPrice' | 'avg24hPrice';
  priceMode: 'flea' | 'trader';
  traderLevels: TraderLevels;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  items,
  selectedItem,
  onSelect,
  onCopy,
  onCopyWithToast,
  onPin,
  isPinned,
  overriddenPrice,
  overriddenPrices,
  isExcluded,
  onToggleExclude,
  excludedItems,
  fleaPriceType,
  priceMode,
  traderLevels,
}) => {
  // Validate that items is an array
  useEffect(() => {
    if (!Array.isArray(items)) {
      console.debug("Items prop is not an array, defaulting to empty array");
    }
  }, [items]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [isPriceOverrideActive, setIsPriceOverrideActive] = useState(false);

  // Avatars for trader vendors (normalizedName keys)
  const TRADER_AVATARS = useMemo<Record<keyof TraderLevels, string>>(
    () => ({
      prapor: "https://assets.tarkov.dev/54cb50c76803fa8b248b4571.webp",
      therapist: "https://assets.tarkov.dev/54cb57776803fa99248b456e.webp",
      skier: "https://assets.tarkov.dev/58330581ace78e27b8b10cee.webp",
      peacekeeper: "https://assets.tarkov.dev/5935c25fb3acc3127c3d8cd9.webp",
      mechanic: "https://assets.tarkov.dev/5a7c2eca46aef81a7ca2145d.webp",
      ragman: "https://assets.tarkov.dev/5ac3b934156ae10c4430e83c.webp",
      jaeger: "https://assets.tarkov.dev/5c0647fdd443bc2504c2d371.webp",
    }),
    []
  );

  // Helper: compute effective price and chosen vendor info
  const getEffectivePriceInfo = useCallback(
    (
      item: SimplifiedItem | null | undefined
    ): { price: number | null; vendorName?: keyof TraderLevels; minTraderLevel?: number } => {
      if (!item) return { price: null };
      if (priceMode === 'flea') {
        const fleaVal = item[fleaPriceType as 'lastLowPrice' | 'avg24hPrice'];
        return { price: typeof fleaVal === 'number' ? fleaVal : null };
      }
      // trader mode
      const offers = item.buyFor ?? [];
      let best: { price: number; vendorName: keyof TraderLevels; minTraderLevel?: number } | null = null;
      for (const offer of offers) {
        const vendorName = offer.vendor?.normalizedName as string | undefined;
        const minLevel =
          offer.vendor && 'minTraderLevel' in offer.vendor
            ? (offer.vendor as { minTraderLevel?: number }).minTraderLevel
            : undefined;
        if (!vendorName) continue;
        const key = vendorName as keyof TraderLevels;
        const userLevel = traderLevels[key as keyof TraderLevels];
        if (userLevel === undefined) continue; // not a trader or unknown vendor
        if (minLevel !== undefined && minLevel > userLevel) continue; // not eligible
        const price = offer.priceRUB;
        if (typeof price === 'number') {
          if (best === null || price > best.price) best = { price, vendorName: key, minTraderLevel: minLevel };
        }
      }
      return best ? { price: best.price, vendorName: best.vendorName, minTraderLevel: best.minTraderLevel } : { price: null };
    },
    [fleaPriceType, priceMode, traderLevels]
  );

  useEffect(() => {
    if (selectedItem && overriddenPrice !== undefined) {
      const next = overriddenPrice.toString();
      // Only update when values actually change to avoid render loops
      setIsPriceOverrideActive((prev) => (prev ? prev : true));
      setPriceOverride((prev) => (prev !== next ? next : prev));
    } else {
      // Only reset if there is something to reset
      setIsPriceOverrideActive((prev) => (prev ? false : prev));
      setPriceOverride((prev) => (prev !== "" ? "" : prev));
    }
  }, [selectedItem, overriddenPrice]);

  // Initialize Fuse.js for searching
  const fuse = useMemo(() => {
    const validItems = Array.isArray(items) ? items : [];
    try {
      return new Fuse(validItems, {
        keys: [
          { name: 'name', weight: 0.7 },
          { name: 'shortName', weight: 0.3 }
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2
      });
    } catch (e) {
      console.debug("Fuse initialization error or empty items array", e);
      return null;
    }
  }, [items]);

  // Debounce the search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const validItems = Array.isArray(items) ? items : [];
    if (validItems.length === 0) return [];

    let results;
    if (isFocused && !debouncedSearchTerm) {
      // Show only items with basePrice > 0 when focused but the search input is empty
      results = validItems.filter((item) => item.basePrice > 0);
    } else if (!debouncedSearchTerm) {
      return [];
    } else if (!fuse) {
      return validItems;
    } else {
      results = fuse
        .search(debouncedSearchTerm)
        .map((result) => result.item)
        .filter((item) => item.basePrice > 0);
    }
    return results.filter((item) => {
      const candidates = [
        item.name,
        item.shortName,
        item.englishName,
        item.englishShortName,
      ].filter(Boolean) as string[];
      const lowered = new Set(Array.from(excludedItems, (n) => n.toLowerCase()));
      return !candidates.some((n) => lowered.has(n.toLowerCase()));
    });
  }, [debouncedSearchTerm, fuse, isFocused, items, excludedItems]);

  // Handle selection
  const handleSelect = useCallback(
    (item: SimplifiedItem | null) => {
      let overriddenPriceToPass: number | undefined | null = undefined;
      if (item) {
        if (overriddenPrice !== undefined) {
          overriddenPriceToPass = overriddenPrice;
        } else if (priceOverride) {
          overriddenPriceToPass = Number(priceOverride);
        }
      }
      onSelect(item, overriddenPriceToPass);
      setSearchTerm("");
      setIsFocused(false);
      setPriceOverride(
        overriddenPriceToPass !== undefined && overriddenPriceToPass !== null
          ? overriddenPriceToPass.toString()
          : ""
      );
    },
    [onSelect, overriddenPrice, priceOverride]
  );

  // Handle removing the selected item
  const handleRemove = useCallback(() => {
    if (isPinned) {
      onPin();
    }
    handleSelect(null);
  }, [isPinned, onPin, handleSelect]);

  // Clear price override
  const clearPriceOverride = useCallback(() => {
    setPriceOverride("");
    setIsPriceOverrideActive(false);
    if (selectedItem) {
      onSelect(selectedItem, null);
    }
  }, [onSelect, selectedItem]);

  // Toggle price override
  const togglePriceOverride = useCallback(() => {
    if (!isPriceOverrideActive) {
      setIsPriceOverrideActive(true);
      if (selectedItem && overriddenPrice !== undefined) {
        setPriceOverride(overriddenPrice.toString());
      }
    } else {
      setIsPriceOverrideActive(false);
      if (selectedItem) {
        onSelect(selectedItem, null);
        setPriceOverride("");
      }
    }
  }, [isPriceOverrideActive, selectedItem, overriddenPrice, onSelect]);

  // Debounce price override updates
  const [debouncedPriceValue, setDebouncedPriceValue] = useState("");

  useEffect(() => {
    if (priceOverride === debouncedPriceValue) return;
    const handler = setTimeout(() => {
      setDebouncedPriceValue(priceOverride);
      if (!selectedItem || !isPriceOverrideActive || !priceOverride) return;
      const nextValue = Number(priceOverride) || 0;
      // Skip if parent already has this exact override to prevent update loops
      if (overriddenPrice !== undefined && overriddenPrice === nextValue) return;
      onSelect(selectedItem, nextValue);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [
    priceOverride,
    debouncedPriceValue,
    selectedItem,
    isPriceOverrideActive,
    overriddenPrice,
    onSelect,
  ]);

  // Handle changes in the override input
  const handlePriceOverride = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Only numbers allowed
      if (/^\d*$/.test(value)) {
        setPriceOverride(value);
      }
    },
    []
  );

  const toggleExclude = useCallback(() => {
    onToggleExclude();
  }, [onToggleExclude]);

  // Copy item name (with optional toast)
  const handleCopy = useCallback(() => {
    onCopy();
    if (onCopyWithToast) {
      onCopyWithToast();
    } else {
      sonnerToast("Name Copied", {
        description: selectedItem
          ? `"${selectedItem.name}" copied to clipboard`
          : "Item copied to clipboard",
      });
    }
  }, [onCopy, onCopyWithToast, selectedItem]);

  // Row component for react-window (dropdown list item)
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = filteredItems[index];
      const itemOverriddenPrice = overriddenPrices[item.id];
      const effectiveInfo = getEffectivePriceInfo(item);
      const displayedPrice =
        itemOverriddenPrice !== undefined
          ? itemOverriddenPrice
          : effectiveInfo.price ?? null;
      const isOverridden = itemOverriddenPrice !== undefined;

      const isItemExcluded = (() => {
        const candidates = [
          item.name,
          item.shortName,
          item.englishName,
          item.englishShortName,
        ].filter(Boolean) as string[];
        const lowered = new Set(Array.from(excludedItems, (n) => n.toLowerCase()));
        return candidates.some((n) => lowered.has(n.toLowerCase()));
      })();
      const itemIcon = item.iconLink;

      return (
        <li
          style={style}
          onMouseDown={(e) => e.preventDefault()}
          onMouseUp={() => handleSelect(item)}
          className="p-1 hover:bg-gray-600 cursor-pointer text-white flex items-center"
        >
          {itemIcon && (
            <img
              src={itemIcon}
              alt={item.name}
              className="w-10 h-10 object-contain rounded mr-2"
            />
          )}
          <div className="flex-1 min-w-0 flex flex-col text-xs">
            <span className="truncate font-semibold text-sm">{item.name}</span>
            <div className="text-gray-400 flex flex-wrap items-center gap-2">
              {/* Base value chip */}
              <div className="inline-flex items-center rounded-full bg-blue-500/10 border border-gray-700 px-2 py-0.5">
                <span className="mr-1 text-gray-400 font-bold">Base</span>
                <span className="font-semibold text-teal-300">
                  ₽{(item.basePrice || 0).toLocaleString()}
                </span>
              </div>

              {/* Price chip (Flea/Trader) */}
              <div
                className={`inline-flex items-center rounded-full px-2 py-0.5 border ${
                  isOverridden
                    ? "bg-amber-500/10 border-amber-400/30 text-amber-300"
                    : item.lastOfferCount !== undefined &&
                      item.lastOfferCount <= 5
                    ? "bg-red-500/10 border-red-400/30 text-red-300"
                    : "bg-gray-800/60 border-gray-700 text-gray-300"
                }`}
              >
                <span className="mr-1 text-gray-400">
                  {priceMode === "flea" ? "Flea" : "Trader"}
                </span>
                <span className="font-semibold">
                  {typeof displayedPrice === "number"
                    ? `₽${displayedPrice.toLocaleString()}`
                    : "N/A"}
                </span>
                {isOverridden && (
                  <span className="text-gray-400 ml-1">(Override)</span>
                )}
              </div>

              {/* Trader vendor chip */}
              {priceMode === "trader" && effectiveInfo.vendorName && (
                <div className="inline-flex items-center rounded-full bg-gray-800/60 border border-gray-700 px-2 py-0.5">
                  <img
                    src={TRADER_AVATARS[effectiveInfo.vendorName]}
                    alt={effectiveInfo.vendorName}
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="ml-1 capitalize">
                    {effectiveInfo.vendorName}{" "}
                    {effectiveInfo.minTraderLevel
                      ? `L${effectiveInfo.minTraderLevel}`
                      : ""}
                  </span>
                </div>
              )}

              {/* Excluded badge */}
              {isItemExcluded && (
                <span className="ml-auto inline-flex items-center rounded-full bg-red-500/10 border border-red-400/30 text-red-300 px-2 py-0.5">
                  Excluded
                </span>
              )}
            </div>
          </div>
        </li>
      );
    },
    [
      filteredItems,
      handleSelect,
      overriddenPrices,
      excludedItems,
      priceMode,
      getEffectivePriceInfo,
      TRADER_AVATARS,
    ]
  );

  return (
    <TooltipProvider>
      <div className="relative w-full text-sm gap-1">
        {/* SEARCH + DROP-DOWN (when no item is selected) */}
        {!selectedItem && (
          <div className="relative border border-gray-700 rounded-md p-1">
            <input
              onMouseUp={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 100)}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="w-full p-1 text-sm bg-gray-700 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            {isFocused && (
              <div
              className="
                  w-full mt-3 pt-2 bg-transparent rounded-md shadow-lg
                  max-h-[50vh] overflow-y-auto overflow-x-hidden
                  touch-pan-y
                  "
                  style={{ marginTop: '10px' }}
                  >
                <AutoSizer disableHeight>
                  {({ width }) => (
                    <List
                      height={240}
                      itemCount={filteredItems.length}
                      itemSize={56}
                      width={width}
                      >
                      {Row}
                    </List>
                  )}
                </AutoSizer>
                {filteredItems.length === 0 && (
                  <div className="p-1 text-gray-400">No items found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SELECTED ITEM CARD */}
        {selectedItem && (
          <div
            className={`border p-1 mb-0.5 rounded-md bg-gray-900 overflow-hidden ${
              isPinned ? "border-yellow-400" : "border-gray-600"
            }`}
            >
            <div className="flex items-stretch">
              <div className="rounded-l-md overflow-hidden flex items-center justify-center min-w-3 max-w-10 sm:min-w-24 sm:max-w-28">
                {selectedItem.iconLink && (
                  <img
                    src={selectedItem.iconLink}
                    alt={selectedItem.name}
                    className="object-contain max-h-20 sm:max-h-24 md:max-h-28"
                    />
                )}
              </div>

              {/* RIGHT SIDE (All info and buttons) */}
              <div className="flex-1 min-w-0 flex flex-col p-2 space-y-2">
                {/* Top row: name + compact action toolbar */}
                <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2">
                  {/* Item name */}
                  <div className="min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {selectedItem.link ? (
                          <a
                            href={selectedItem.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-teal-400 font-semibold text-xs sm:text-sm truncate hover:underline"
                          >
                            {selectedItem.name}
                          </a>
                        ) : (
                          <span className="block text-teal-400 font-semibold text-xs sm:text-sm truncate">
                            {selectedItem.name}
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>{selectedItem.name}</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Actions toolbar */}
                  <div className="ml-2 shrink-0 flex items-center rounded-full border border-gray-700/60 bg-gray-800/50 px-1.5 py-0.5 shadow-sm">
                    {/* Copy */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCopy}
                          className="h-5 w-5 text-gray-400 hover:bg-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy name</TooltipContent>
                    </Tooltip>

                    <span className="mx-0.5 h-5 w-px bg-gray-700/70" />

                    {/* Toggle override */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={togglePriceOverride}
                          className={`h-5 w-5 rounded ${
                            isPriceOverrideActive
                              ? "text-amber-300 bg-amber-500/10"
                              : "text-gray-400"
                          } hover:bg-gray-700`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPriceOverrideActive ? "Disable override" : "Enable override"}
                      </TooltipContent>
                    </Tooltip>

                    <span className="mx-0.5 h-5 w-px bg-gray-700/70" />

                    {/* Pin */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={onPin}
                          className={`h-5 w-5 rounded ${
                            isPinned
                              ? "text-yellow-400 bg-yellow-500/10"
                              : "text-gray-400"
                          } hover:bg-gray-700`}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isPinned ? "Unpin" : "Pin"}</TooltipContent>
                    </Tooltip>

                    {/* Exclude */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={toggleExclude}
                          className={`h-5 w-5 rounded ${
                            isExcluded
                              ? "text-red-400 bg-red-500/10"
                              : "text-gray-400"
                          } hover:bg-gray-700`}
                        >
                          <CircleSlash className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isExcluded ? "Include in auto-pick" : "Exclude from auto-pick"}
                      </TooltipContent>
                    </Tooltip>

                    <span className="mx-0.5 h-5 w-px bg-gray-700/70" />

                    {/* Delete */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleRemove}
                          className="h-5 w-5 text-gray-400 hover:bg-gray-700"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Middle row: base & price, updated, override button */}
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-300">
                  {/* Base value chip */}
                  <div className="inline-flex items-center rounded-full bg-blue-500/10 border border-gray-700 px-2 py-0.5">
                    <span className="mr-1 text-gray-400 font-bold">Base</span>
                    <span className="font-semibold text-teal-300">
                      ₽{(selectedItem.basePrice || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Price chip (Flea/Trader) */}
                  <div
                    className={`inline-flex items-center rounded-full px-2 py-0.5 border ${
                      (isPriceOverrideActive && priceOverride)
                        ? 'bg-amber-500/10 border-amber-400/30 text-amber-300'
                        : (selectedItem.lastOfferCount !== undefined && selectedItem.lastOfferCount <= 5)
                        ? 'bg-red-500/10 border-red-400/30 text-red-300'
                        : 'bg-gray-800/60 border-gray-700 text-gray-300'
                    }`}
                  >
                    <span className="mr-1 text-gray-400">{priceMode === 'flea' ? 'Flea' : 'Trader'}</span>
                    <span className="font-semibold">
                      {(
                        (isPriceOverrideActive && priceOverride ? Number(priceOverride) : null) ??
                        overriddenPrices[selectedItem.id] ??
                        getEffectivePriceInfo(selectedItem).price ??
                        null
                      ) !== null
                        ? `₽${(
                            (isPriceOverrideActive && priceOverride ? Number(priceOverride) : null) ??
                            overriddenPrices[selectedItem.id] ??
                            getEffectivePriceInfo(selectedItem).price ??
                            0
                          ).toLocaleString()}`
                        : 'N/A'}
                    </span>
                  </div>

                  {/* Trader vendor chip */}
                  {priceMode === 'trader' && getEffectivePriceInfo(selectedItem).vendorName && (
                    <div className="inline-flex items-center rounded-full bg-gray-800/60 border border-gray-700 px-2 py-0.5">
                      <img
                        src={TRADER_AVATARS[getEffectivePriceInfo(selectedItem).vendorName!]}
                        alt={getEffectivePriceInfo(selectedItem).vendorName!}
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="ml-1 capitalize">
                        {getEffectivePriceInfo(selectedItem).vendorName} {getEffectivePriceInfo(selectedItem).minTraderLevel ? `L${getEffectivePriceInfo(selectedItem).minTraderLevel}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Updated time (flea) */}
                  {priceMode === 'flea' && selectedItem.updated && (
                    <span className="text-gray-500 ml-1">
                      • Updated: {getRelativeDate(selectedItem.updated.toString())}
                    </span>
                  )}

                  {/* Override toggle moved to action toolbar above */}
                </div>

                {/* Price override input (if active) */}
                {isPriceOverrideActive && (
                  <div className="flex items-center rounded-full border border-gray-700/60 bg-gray-800/50 px-2 py-1 text-xs sm:text-sm">
                    <span className="text-gray-400 mr-1">₽</span>
                    <input
                      id="price-override"
                      type="text"
                      value={priceOverride}
                      onChange={handlePriceOverride}
                      className="bg-transparent text-white px-1 py-0.5 rounded w-24 sm:w-28 text-right outline-none placeholder:text-gray-500"
                      placeholder="Price"
                    />
                    <span className="mx-1 h-5 w-px bg-gray-700/70" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={clearPriceOverride}
                          className="h-5 w-5 text-gray-400 hover:bg-gray-700"
                        >
                          <XIcon className="h-4 w-4 text-red-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Clear override</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Excluded notice at bottom if item is excluded */}
                {isExcluded && (
                  <div className="px-2 py-1 bg-red-900/20 text-red-400 text-xs rounded">
                    Excluded from Autopick
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* If override is active but no item is selected, show bare input */}
        {isPriceOverrideActive && !selectedItem && (
          <div className="mt-1 flex items-center">
            <label
              htmlFor="price-override"
              className="text-xs sm:text-sm text-gray-400 mr-1"
            >
              Override Price:
            </label>
            <input
              id="price-override"
              type="text"
              value={priceOverride}
              onChange={handlePriceOverride}
              className="text-xs sm:text-sm bg-gray-700/50 text-white p-1 mr-1 rounded w-16 text-right"
              placeholder="Enter price"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={clearPriceOverride}
              className="h-5 w-5 text-gray-400 hover:bg-gray-800"
            >
              <XIcon className="text-red-500 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default React.memo(ItemSelector);
