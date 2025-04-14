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

  useEffect(() => {
    if (selectedItem && overriddenPrice !== undefined) {
      setPriceOverride(overriddenPrice.toString());
      setIsPriceOverrideActive(true);
    } else {
      setPriceOverride("");
      setIsPriceOverrideActive(false);
    }
  }, [selectedItem, overriddenPrice]);

  // Initialize Fuse.js for searching
  const fuse = useMemo(() => {
    const validItems = Array.isArray(items) ? items : [];
    try {
      return new Fuse(validItems, {
        keys: ["name"],
        threshold: 0.3,
        includeScore: false,
      });
    } catch (e) {
      console.debug("Fuse initialization error or empty items array");
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
    return results.filter((item) => !excludedItems.has(item.name));
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
      if (selectedItem && priceOverride && isPriceOverrideActive) {
        onSelect(selectedItem, Number(priceOverride) || 0);
      }
    }, 300);
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

  // Row component for react-window (dropdown list item)
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
              className="p-1 hover:bg-gray-600 cursor-pointer text-white flex items-center"
            >
              {itemIcon && (
                <img
                  src={itemIcon}
                  alt={item.name}
                  className="w-10 h-10 object-contain rounded mr-2"
                />
              )}
              <div className="flex-1 flex flex-col text-xs">
                <span className="truncate font-semibold text-sm">
                  {item.name}
                </span>
                <div className="text-gray-400 flex flex-wrap gap-2">
                  <span>Base: ₽{(item.basePrice || 0).toLocaleString()}</span>
                  <span>
                    Flea:{" "}
                    <span
                      className={
                        isOverridden ? "text-yellow-300 font-bold" : ""
                      }
                    >
                      ₽{(displayedPrice || 0).toLocaleString()}
                    </span>
                    {isOverridden && (
                      <span className="text-gray-400 ml-1">(Override)</span>
                    )}
                  </span>
                  {isItemExcluded && (
                    <span className="text-red-400 ml-auto">Excluded</span>
                  )}
                </div>
              </div>
            </li>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p>Base: ₽{(item.basePrice || 0).toLocaleString()}</p>
              <p>
                Flea:{" "}
                <span
                  className={isOverridden ? "text-yellow-300 font-bold" : ""}
                >
                  ₽{(displayedPrice || 0).toLocaleString()}
                </span>
              </p>
              {isItemExcluded && (
                <p className="text-red-500">This item is excluded.</p>
              )}
              {item.lastLowPrice && item.updated && (
                <p className="text-gray-400 text-xs">
                  Last updated: {getRelativeDate(item.updated.toString())}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    },
    [filteredItems, handleSelect, overriddenPrices, excludedItems]
  );

  return (
    <TooltipProvider>
      <div className="relative w-full text-sm gap-1">
        {/* SEARCH + DROP-DOWN (when no item is selected) */}
        {!selectedItem && (
          <div className="relative border border-gray-700 rounded-md p-1">
            <input
              onClick={() => setIsFocused(true)}
              onFocus={() => setIsFocused(true)}
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
                  absolute z-50 w-full mt-1 bg-yellow-700 rounded-md shadow-lg
                  max-h-[50vh] overflow-y-auto overflow-x-hidden
                  touch-pan-y
                "
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
            className={`border p-1 mb-0.5 rounded-md bg-gray-900 ${
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
              <div className="flex-1 flex flex-col p-2 space-y-2">
                {/* Top row: name + copy, pin/exclude/remove */}
                <div className="flex items-center justify-between">
                  {/* Item name + copy */}
                  <div className="flex items-center space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-teal-400 font-semibold text-xs sm:text-sm truncate"
                          style={{
                            maxWidth: "calc(100vw - 2rem)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {window.innerWidth < 640
                            ? `${selectedItem.name.slice(0, 20)}...`
                            : selectedItem.name.length > 42
                            ? `${selectedItem.name.slice(0, 42)}...`
                            : selectedItem.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{selectedItem.name}</TooltipContent>
                    </Tooltip>
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
                      <TooltipContent>Copy Item Name</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Pin / Exclude / Remove */}
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={onPin}
                          className={`h-5 w-5 rounded ${
                            isPinned ? "text-yellow-400" : "text-gray-400"
                          } hover:bg-gray-800`}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPinned ? "Unpin Item" : "Pin Item"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={toggleExclude}
                          className={`h-5 w-5 ${
                            isExcluded ? "text-red-500" : "text-gray-400"
                          } hover:bg-gray-800`}
                        >
                          <CircleSlash className="h-4 w-4" />
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
                          className="h-5 w-5 text-gray-400 hover:bg-gray-800"
                        >
                          <Trash2 className="text-red-500 h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove Item</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Middle row: base & flea prices, updated, override button */}
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-300">
                  <div>
                    Base:{" "}
                    <span className="text-teal-400 font-semibold">
                      ₽{(selectedItem.basePrice || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Flea:{" "}
                    <span className="text-teal-400 font-semibold">
                      ₽
                      {(
                        overriddenPrice ||
                        selectedItem.lastLowPrice ||
                        selectedItem.basePrice ||
                        0
                      ).toLocaleString()}
                    </span>
                  </div>
                  {selectedItem.updated && (
                    <span className="text-gray-500">
                      Updated:{" "}
                      {getRelativeDate(selectedItem.updated.toString())}
                    </span>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={togglePriceOverride}
                        className="h-5 w-5 text-gray-400 hover:bg-gray-700 ml-auto"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Price Override</TooltipContent>
                  </Tooltip>
                </div>

                {/* Price override input (if active) */}
                {isPriceOverrideActive && (
                  <div className="flex items-center bg-gray-800/50 rounded p-1 text-xs sm:text-sm">
                    <label
                      htmlFor="price-override"
                      className="text-gray-400 mr-1"
                    >
                      Override:
                    </label>
                    <input
                      id="price-override"
                      type="text"
                      value={priceOverride}
                      onChange={handlePriceOverride}
                      className="bg-gray-700 text-white p-1 mr-2 rounded w-20 text-right"
                      placeholder="Enter price"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={clearPriceOverride}
                      className="h-5 px-2 text-white hover:bg-red-700"
                    >
                      Cancel
                    </Button>
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
