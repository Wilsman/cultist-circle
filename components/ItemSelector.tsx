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
import { useToast } from "@/hooks/use-toast";

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
import Image from "next/image";

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
  excludedItems, // Destructure the new prop
}) => {
  // Add validation check at the start with a default empty array
  useEffect(() => {
    if (!Array.isArray(items)) {
      console.debug('Items prop is not an array, defaulting to empty array');
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
      console.debug('Fuse initialization skipped - waiting for items');
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
    return results.filter(item => !excludedItems.has(item.name));
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
        // We don't call onSelect here - we'll let the user enter a price first
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
  }, [priceOverride, selectedItem, isPriceOverrideActive, onSelect, debouncedPriceValue]);

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
        description: selectedItem ? `"${selectedItem.name}" copied to clipboard` : "Item copied to clipboard",
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
        itemOverriddenPrice !== undefined ? itemOverriddenPrice : (item.lastLowPrice || item.basePrice);
      const isOverridden = itemOverriddenPrice !== undefined;
      const isItemExcluded = excludedItems.has(item.name); // We use item.name for exclusions as per the code above
      const itemIcon = item.iconLink;

      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <li
              style={style}
              onMouseDown={(e) => e.preventDefault()}
              onMouseUp={() => handleSelect(item)}
              className="p-2 hover:bg-gray-600 cursor-pointer text-white flex items-center" // Modified for flex
            >
              {itemIcon && (
                <Image
                  src={itemIcon}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="mr-2 rounded" // Add some margin for spacing
                />
              )}
              <div className="flex-1 flex flex-col"> {/* Use flex-1 to allow text to take up remaining space */}
                <span className="truncate">{item.name}</span>
                <div className="text-gray-400 text-sm">
                  <p>Base Value: ₽{item.basePrice.toLocaleString()}</p>
                  <p>
                    {item.lastLowPrice ? 'Last Low Price:' : 'Base Price:'}{" "}
                    <span
                      className={isOverridden ? "text-yellow-300 font-bold" : ""}
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
                {item.lastLowPrice ? 'Last Low Price:' : 'Base Price:'}{" "}
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
            className={`w-full p-2 pr-24 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPinned ? "border-2 border-yellow-500" : ""
            }`}
          />
          {selectedItem && (
            <>
              {/* Inline buttons for larger screens */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center space-x-1 bg-gray-700 bg-opacity rounded-md p-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onPin}
                  className={`h-8 w-8 ${isPinned ? "text-yellow-500" : "text-gray-400"
                  } hover:bg-gray-800`}
                >
                  <Pin className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-8 w-8 text-gray-400 hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={togglePriceOverride}
                  className={`h-8 w-8 ${isPriceOverrideActive ? "text-blue-500" : "text-gray-400"
                  } hover:bg-gray-800`}
                >
                  <BadgeDollarSign className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleExclude}
                  className={`h-8 w-8 ${isExcluded ? "text-red-500" : "text-gray-400"
                  } hover:bg-gray-800`}
                >
                  <CircleSlash className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRemove}
                  className="h-8 w-8 text-red-500 hover:bg-gray-800"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Dropdown menu for small screens */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 sm:hidden">
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
                    <DropdownMenuItem onSelect={handleCopy}>
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
            </>
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
            <div className="flex items-center">
              {selectedItem.iconLink && (
                <Image
                  src={selectedItem.iconLink}
                  alt={selectedItem.name}
                  className="w-12 h-12 mr-2 rounded"
                  width={32}
                  height={32}
                />
              )}
              <span>Base: ₽{selectedItem.basePrice.toLocaleString()}</span>
            </div>
            <span className={overriddenPrice ? "text-blue-500" : ""}>
              Flea: ₽{(overriddenPrice || selectedItem.lastLowPrice || selectedItem.basePrice).toLocaleString()}
            </span>
            {selectedItem.updated && (
              <span>Updated: {getRelativeDate(selectedItem.updated.toString())}</span>
            )}
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
