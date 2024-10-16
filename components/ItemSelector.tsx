// components/ui/ItemSelector.tsx

"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Copy,
  X as XIcon,
  Pin,
  BadgeDollarSign,
  MoreVertical,
  CircleSlash,
} from "lucide-react";
import Fuse from "fuse.js";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { getRelativeDate } from "@/lib/utils";

// Import Dropdown components
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  onPin,
  isPinned,
  overriddenPrice,
  overriddenPrices,
  isExcluded,
  onToggleExclude,
  excludedItems, // Destructure the new prop
}) => {
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

  // Initialize Fuse.js
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ["name"],
      threshold: 0.3,
      includeScore: false,
    });
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
    if (isFocused && !debouncedSearchTerm) {
      return items.filter((item) => item.price > 0);
    }
    if (!debouncedSearchTerm) return [];
    return fuse
      .search(debouncedSearchTerm)
      .map((result) => result.item)
      .filter((item) => item.price > 0);
  }, [debouncedSearchTerm, fuse, isFocused, items]);

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

  const handlePriceOverride = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^\d*$/.test(value)) {
        // Allow only numbers
        setPriceOverride(value);
        if (selectedItem && value && isPriceOverrideActive) {
          onSelect(selectedItem, Number(value) || 0);
        }
      }
    },
    [onSelect, selectedItem, isPriceOverrideActive]
  );

  const togglePriceOverride = useCallback(() => {
    setIsPriceOverrideActive((prev) => {
      const newState = !prev;
      if (newState && selectedItem) {
        if (priceOverride) {
          onSelect(selectedItem, Number(priceOverride));
        } else if (overriddenPrice !== undefined) {
          setPriceOverride(overriddenPrice.toString());
        }
      } else if (!newState && selectedItem) {
        onSelect(selectedItem, null);
        setPriceOverride("");
      }
      return newState;
    });
  }, [selectedItem, priceOverride, overriddenPrice, onSelect]);

  const toggleExclude = useCallback(() => {
    onToggleExclude();
  }, [onToggleExclude]);

  // Row component for react-window
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = filteredItems[index];
      const itemOverriddenPrice = overriddenPrices[item.uid];
      const displayedPrice =
        itemOverriddenPrice !== undefined ? itemOverriddenPrice : item.price;
      const isOverridden = itemOverriddenPrice !== undefined;
      const isItemExcluded = excludedItems.has(item.uid); // Check if the item is excluded

      return (
        <Tooltip key={item.uid}>
          <TooltipTrigger asChild>
            <li
              style={style}
              onMouseDown={(e) => e.preventDefault()}
              onMouseUp={() => handleSelect(item)}
              className="p-2 hover:bg-gray-600 cursor-pointer text-white flex flex-col"
            >
              <div className="flex justify-between items-center">
                <span className="truncate">{item.name}</span>{" "}
                {isItemExcluded && (
                  <span className="text-red-500 ml-2">Excluded</span>
                )}
              </div>
              <div className="text-gray-400 text-sm mt-1">
                <p>Base Value: ₱{item.basePrice.toLocaleString()}</p>
                <p>
                  Estimated Flea Price:{" "}
                  <span
                    className={isOverridden ? "text-yellow-300 font-bold" : ""}
                  >
                    ₱{displayedPrice.toLocaleString()}
                  </span>
                  {isOverridden && (
                    <span className="text-gray-400 ml-1">(Overridden)</span>
                  )}
                </p>
              </div>
            </li>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p>Base Value: ₱{item.basePrice.toLocaleString()}</p>
              <p>
                Estimated Flea Price:{" "}
                <span
                  className={isOverridden ? "text-yellow-300 font-bold" : ""}
                >
                  ₱{displayedPrice.toLocaleString()}
                </span>
                {isOverridden && (
                  <span className="text-gray-400 ml-1">(Overridden)</span>
                )}
              </p>
              {isItemExcluded && (
                <p className="text-red-500">This item is excluded.</p>
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
      <div className="relative w-full mb-2">
        <div className="relative">
          <input
            onClick={() => setIsFocused(true)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 100)}
            type="text"
            value={selectedItem ? selectedItem.name : searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedItem) handleSelect(null);
            }}
            placeholder="Search items..."
            className={`w-full p-2 pr-24 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isPinned ? "border-2 border-yellow-500" : ""
            }`}
          />
          {selectedItem && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 bg-gray-700 bg-opacity rounded-md p-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={onPin}
                className={`h-8 w-8 ${
                  isPinned ? "text-yellow-500" : "text-gray-400"
                } hover:bg-gray-200`}
              >
                <Pin className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onCopy}
                className="h-8 w-8 text-gray-400 hover:bg-gray-200"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePriceOverride}
                className={`h-8 w-8 ${
                  isPriceOverrideActive ? "text-blue-500" : "text-gray-400"
                } hover:bg-gray-200`}
              >
                <BadgeDollarSign className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleExclude}
                className={`h-8 w-8 ${
                  isExcluded ? "text-red-500" : "text-gray-400"
                } hover:bg-gray-200`}
              >
                <CircleSlash className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRemove}
                className="h-8 w-8 text-red-500 hover:bg-gray-200"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
          {selectedItem && (
            <div className="sm:hidden absolute right-2 top-1/2 transform -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="bg-primary text-secondary"
                  align="end"
                >
                  <DropdownMenuItem onSelect={onPin}>
                    <Pin className="mr-2 h-4 w-4" />
                    <span>{isPinned ? "Unpin Item" : "Pin Item"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Item Name</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={togglePriceOverride}>
                    <BadgeDollarSign className="mr-2 h-4 w-4" />
                    <span>
                      {isPriceOverrideActive
                        ? "Disable Flea Override"
                        : "Enable Flea Override"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={toggleExclude}>
                    <CircleSlash className="mr-2 h-4 w-4" />
                    <span>
                      {isExcluded ? "Include Item" : "Exclude from Autopick"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleRemove}>
                    <XIcon className="mr-2 h-4 w-4 text-red-500" />
                    <span className="text-red-500">Remove Item</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {!selectedItem && isFocused && (
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
        {selectedItem && (
          <div className="text-sm text-gray-400 mt-1 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            {" "}
            <span>Base: ₱{selectedItem.basePrice.toLocaleString()}</span>
            <span className={overriddenPrice ? "text-blue-500" : ""}>
              Flea: ₱{(overriddenPrice || selectedItem.price).toLocaleString()}
            </span>
            <span>Updated: {getRelativeDate(selectedItem.updated)}</span>
            {isExcluded && (
              <span className="text-red-500">Excluded from Autopick</span>
            )}
          </div>
        )}
        {selectedItem && isPriceOverrideActive && (
          <div className="mt-1 flex items-center">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={priceOverride}
              onChange={handlePriceOverride}
              placeholder="Override flea price"
              className="w-1/2 p-1 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(Number(priceOverride) > 0 || overriddenPrice !== undefined) && (
              <button
                onClick={clearPriceOverride}
                className="ml-2 p-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Clear Price Override Input"
              >
                <XIcon size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(ItemSelector);
