// components/ui/ItemSelector.tsx

"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Copy, X as XIcon, Pin, Edit, CircleSlash, Trash2 } from "lucide-react";
import Fuse from "fuse.js";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { getRelativeDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  isCompactMode?: boolean;
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
  isCompactMode,
}) => {
  // Add validation check at the start with a default empty array
  useEffect(() => {
    if (!Array.isArray(items)) {
      console.debug("Items prop is not an array, defaulting to empty array");
    }
  }, [items]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [isPriceOverrideActive, setIsPriceOverrideActive] = useState(false);

  useEffect(() => {
    if (selectedItem && overriddenPrice !== undefined) {
      setPriceOverride(overriddenPrice.toString());
      setIsPriceOverrideActive(true);
    } else {
      setPriceOverride("");
      setIsPriceOverrideActive(false);
    }
  }, [selectedItem, overriddenPrice]);

  // Initialize Fuse.js with better error handling
  const fuse = useMemo(() => {
    const validItems = Array.isArray(items) ? items : [];
    try {
      return new Fuse(validItems, {
        keys: ["name"],
        threshold: 0.3,
        includeScore: false,
      });
    } catch (e) {
      console.debug("Fuse initialization skipped - waiting for items");
      return null;
    }
  }, [items]);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Filtered items based on search term and focus state
  const filteredItems = useMemo(() => {
    const validItems = Array.isArray(items) ? items : [];

    if (validItems.length === 0) {
      return [];
    }

    let results;
    if (isFocused && !debouncedSearchTerm) {
      // Show only items that have a basePrice > 0 when input is focused but empty
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

    // Filter out excluded items from the results
    return results.filter((item) => !excludedItems.has(item.name));
  }, [debouncedSearchTerm, fuse, isFocused, items, excludedItems]);

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

  const handleRemove = useCallback(() => {
    if (isPinned) {
      onPin();
    }
    handleSelect(null);
  }, [isPinned, onPin, handleSelect]);

  const clearPriceOverride = useCallback(() => {
    setPriceOverride("");
    setIsPriceOverrideActive(false);
    if (selectedItem) {
      onSelect(selectedItem, null);
    }
  }, [onSelect, selectedItem]);

  const togglePriceOverride = useCallback(() => {
    // If turning on price override
    if (!isPriceOverrideActive) {
      setIsPriceOverrideActive(true);
      // If we have a selected item and an override price, set it
      if (selectedItem) {
        if (overriddenPrice !== undefined) {
          setPriceOverride(overriddenPrice.toString());
        }
      }
    }
    // If turning off price override
    else {
      setIsPriceOverrideActive(false);
      if (selectedItem) {
        // Clear the override when turning off
        onSelect(selectedItem, null);
        setPriceOverride("");
      }
    }
  }, [isPriceOverrideActive, selectedItem, overriddenPrice, onSelect]);

  // Add a debounced version of the price override
  const [debouncedPriceValue, setDebouncedPriceValue] = useState("");

  // Debounce price updates to parent
  useEffect(() => {
    if (priceOverride === debouncedPriceValue) return;

    const handler = setTimeout(() => {
      setDebouncedPriceValue(priceOverride);
      // Only update the parent if we have a value, a selected item, and price override is active
      if (selectedItem && priceOverride && isPriceOverrideActive) {
        onSelect(selectedItem, Number(priceOverride) || 0);
      }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [
    priceOverride,
    selectedItem,
    isPriceOverrideActive,
    onSelect,
    debouncedPriceValue,
  ]);

  // Handle price input changes - only update local state, not parent
  const handlePriceOverride = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^\d*$/.test(value)) {
        // Allow only numbers and update local state
        setPriceOverride(value);
        // The useEffect above will handle debounced updates to the parent
      }
    },
    []
  );

  const toggleExclude = useCallback(() => {
    onToggleExclude();
  }, [onToggleExclude]);

  const { toast } = useToast();

  const handleCopy = useCallback(() => {
    onCopy();
    if (onCopyWithToast) {
      onCopyWithToast();
    } else {
      toast({
        title: "Name Copied",
        description: selectedItem
          ? `"${selectedItem.name}" copied to clipboard`
          : "Item copied to clipboard",
        variant: "default",
      });
    }
  }, [onCopy, onCopyWithToast, toast, selectedItem]);

  // Row component for react-window
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = filteredItems[index];
      const itemOverriddenPrice = overriddenPrices[item.id];
      const displayedPrice =
        itemOverriddenPrice !== undefined
          ? itemOverriddenPrice
          : item.lastLowPrice || item.basePrice;
      const isOverridden = itemOverriddenPrice !== undefined;
      const isItemExcluded = excludedItems.has(item.name);
      const itemIcon = item.iconLink;

      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <li
              style={style}
              onMouseDown={(e) => e.preventDefault()}
              onMouseUp={() => handleSelect(item)}
              className="p-2 hover:bg-gray-600 cursor-pointer text-white flex items-center"
            >
              {itemIcon && (
                <img
                  src={itemIcon}
                  alt={item.name}
                  className={`w-12 h-12 md:w-16 md:h-16 object-contain rounded mr-4 ${
                    isCompactMode ? "p-1 text-sm hover:scale-105" : "p-2 text-base"
                  }`}
                />
              )}
              <div className="flex-1 flex flex-col">
                <span className="truncate">{item.name}</span>
                <div className="text-gray-400 text-sm">
                  <p>Base Value: ₽{item.basePrice.toLocaleString()}</p>
                  <p>
                    {item.lastLowPrice ? "Last Low Price:" : "Base Price:"}{" "}
                    <span
                      className={
                        isOverridden ? "text-yellow-300 font-bold" : ""
                      }
                    >
                      ₽{displayedPrice.toLocaleString()}
                    </span>
                    {isOverridden && (
                      <span className="text-gray-400 ml-1">(Overridden)</span>
                    )}
                  </p>
                </div>
              </div>
              {isItemExcluded && (
                <span className="text-red-500 ml-2">Excluded</span>
              )}
            </li>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p>Base Value: ₽{item.basePrice.toLocaleString()}</p>
              <p>
                {item.lastLowPrice ? "Last Low Price:" : "Base Price:"}{" "}
                <span
                  className={isOverridden ? "text-yellow-300 font-bold" : ""}
                >
                  ₽{displayedPrice.toLocaleString()}
                </span>
                {isOverridden && (
                  <span className="text-gray-400 ml-1">(Overridden)</span>
                )}
              </p>
              {isItemExcluded && (
                <p className="text-red-500">This item is excluded.</p>
              )}
              {item.lastLowPrice && item.updated && (
                <p className="text-gray-400">
                  Last updated: {getRelativeDate(item.updated.toString())}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    },
    [filteredItems, handleSelect, overriddenPrices, excludedItems, isCompactMode]
  );

  return (
    <TooltipProvider>
      <div
        className={`relative w-full ${
          isCompactMode ? "p-1 text-sm gap-1" : "p-1 text-sm gap-1"
        }`}
      >
        {/* If no item is selected, show the search input and dropdown list */}
        {!selectedItem && (
          <div className="relative">
            <input
              onClick={() => setIsFocused(true)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 100)}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className={`w-full ${isCompactMode ? "p-1 text-sm" : "p-2"} bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />

            {isFocused && (
              <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-md shadow-lg max-h-60 overflow-hidden">
                <AutoSizer disableHeight>
                  {({ width }) => (
                    <List
                      height={240} // Adjust based on desired height
                      itemCount={filteredItems.length}
                      itemSize={80} // Adjust based on item height
                      width={width}
                    >
                      {Row}
                    </List>
                  )}
                </AutoSizer>
                {filteredItems.length === 0 && (
                  <div className="p-2 text-gray-400">No items found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* When an item is selected, show a card-like layout */}
        {selectedItem && (
          <div
            className={`relative w-full ${isCompactMode ? "p-1" : "p-2"} rounded-md ${
              isPinned ? "border border-yellow-400" : "border border-gray-600"
            } bg-gray-900`}
          >
            {/* Top row: small icon button to pick another item, then action icons */}
            <div className={`flex items-center justify-between ${isCompactMode ? "mb-1" : "mb-1"}`}>
              <div className="flex items-center space-x-1">
                {/* Pick Another Item as a small icon + tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onPin}
                      className={`${isCompactMode ? "h-5 w-5" : "h-8 w-8"} ${
                        isPinned ? "text-yellow-400" : "text-gray-400"
                      } hover:bg-gray-800`}
                    >
                      <Pin className={`${isCompactMode ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPinned ? "Unpin Item" : "Pin Item"}
                  </TooltipContent>
                </Tooltip>
              </div>
              {/* Action icons */}
              <div className="flex items-center space-x-1">
                {/* button with Exclude from Auto tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleExclude}
                      className={`${isCompactMode ? "h-5 w-5" : "h-8 w-8"} ${
                        isExcluded ? "text-red-500" : "text-gray-400"
                      } hover:bg-gray-800`}
                    >
                      <CircleSlash className={`${isCompactMode ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exclude from Auto</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        handleRemove();
                        handleSelect(null);
                      }}
                      className={`${isCompactMode ? "h-6 w-6" : "h-8 w-8"} text-gray-400 hover:bg-gray-800`}
                    >
                      <Trash2 className={`text-red-500 ${isCompactMode ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove Item</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className={`${isCompactMode ? "mt-0.5 flex items-center p-1" : "flex"} rounded-lg`}>
              {/* Item icon */}
              {selectedItem.iconLink && (
                <img
                  src={selectedItem.iconLink}
                  alt={selectedItem.name}
                  className={`object-contain rounded mr-2 ${
                    isCompactMode ? "w-12 h-12 hover:scale-195" : "w-12 h-12 md:w-24 md:h-24 p-2"
                  }`}
                />
              )}
              <div className={`${isCompactMode ? "flex flex-row items-center flex-wrap gap-y-0.5" : "flex flex-col"} flex-grow`}>
                {/* Item name and copy button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center ${isCompactMode ? "" : ""}`}>
                      <span className={`text-teal-400 ${isCompactMode ? "text-sm" : "text-lg"} font-semibold`}>
                        {selectedItem.name.length > 30
                          ? `${selectedItem.name.slice(0, 30)}...`
                          : selectedItem.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{selectedItem.name}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCopy}
                      className={`${isCompactMode ? "h-6 w-6 mr-1" : "h-8 w-8 mr-1"} text-gray-400 hover:bg-gray-700`}
                    >
                      <Copy className={`${isCompactMode ? "h-3 w-3" : "h-4 w-4"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Item Name</TooltipContent>
                </Tooltip>
                {/* Price information */}
                <div className={`flex items-center flex-wrap ${isCompactMode ? "space-x-2 mt-0" : "space-x-3 mt-1"}`}>
                  <span className={`${isCompactMode ? "text-xs" : "text-sm"} text-gray-400`}>
                    Base:{" "}
                    <span className={`text-teal-400 font-semibold ${isCompactMode ? "text-xs" : ""}`}>
                      ₽{selectedItem.basePrice.toLocaleString()}
                    </span>
                  </span>
                  <span className={`${isCompactMode ? "text-xs" : "text-sm"} text-gray-400`}>
                    Flea:{" "}
                    <span className={`text-teal-400 ${isCompactMode ? "text-xs" : ""}`}>
                      ₽
                      {(
                        overriddenPrice ||
                        selectedItem.lastLowPrice ||
                        selectedItem.basePrice
                      ).toLocaleString()}
                    </span>
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={togglePriceOverride}
                        className={`${isCompactMode ? "h-6 w-6" : "h-8 w-8"} text-gray-400 hover:bg-gray-700`}
                      >
                        <Edit className={`${isCompactMode ? "h-3 w-3" : "h-4 w-4"}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Price Override</TooltipContent>
                  </Tooltip>
                </div>
                {/* 24h
                <span className="text-sm text-gray-400">
                  24h avg:{" "}
                  <span className="text-teal-400">
                    ₽{selectedItem.avg24hPrice?.toLocaleString()}
                  </span>
                </span> */}
                {/* Updated time */}
                {selectedItem.updated && (
                  <span className="text-xs text-gray-500">
                    Updated: {getRelativeDate(selectedItem.updated.toString())}
                  </span>
                )}
              </div>
            </div>

            {/* If price override is active, show override input */}
            {isPriceOverrideActive && (
              <div className="flex items-center bg-gray-800/50 rounded p-2">
                <label
                  htmlFor="price-override"
                  className="text-xs text-gray-400 mr-2"
                >
                  Override Price:
                </label>
                <input
                  id="price-override"
                  type="text"
                  value={priceOverride}
                  onChange={handlePriceOverride}
                  className="bg-gray-700 text-white p-1 rounded w-24 text-right text-xs"
                  placeholder="Enter price"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearPriceOverride}
                  className="ml-2 h-5 w-5 text-gray-400 hover:text-red-400"
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Excluded notice */}
            {isExcluded && (
              <div className="mt-2 px-3 py-1 bg-red-900/20 text-red-400 text-xs rounded">
                Excluded from Autopick
              </div>
            )}
          </div>
        )}

        {/* If override is active but no item is selected, show a bare input */}
        {isPriceOverrideActive && !selectedItem && (
          <div className="mt-2 flex items-center">
            <label
              htmlFor="price-override"
              className="text-xs text-gray-400 mr-2"
            >
              Override Price:
            </label>
            <input
              id="price-override"
              type="text"
              value={priceOverride}
              onChange={handlePriceOverride}
              className="bg-gray-700/50 text-white p-1 rounded w-24 text-right text-xs"
              placeholder="Enter price"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={clearPriceOverride}
              className="ml-2 h-5 w-5 text-gray-400 hover:text-red-400"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(ItemSelector);
