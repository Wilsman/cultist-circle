// components/ui/ItemSelector.tsx

import React, { useState, useMemo, useEffect } from "react";
import { Copy, X, Pin, BadgePoundSterling } from "lucide-react";
import Fuse from "fuse.js";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { getRelativeDate } from "@/lib/utils";

interface ItemSelectorProps {
  items: SimplifiedItem[];
  selectedItem: SimplifiedItem | null;
  onSelect: (
    item: SimplifiedItem | null,
    overriddenPrice?: number | null
  ) => void;
  onCopy: () => void;
  onPin: () => void;
  isPinned: boolean;
  overriddenPrice?: number;
  isAutoPickActive: boolean;
  overriddenPrices: Record<string, number>;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  items,
  selectedItem,
  onSelect,
  onCopy,
  onPin,
  isPinned,
  overriddenPrice,
  isAutoPickActive,
  overriddenPrices,
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

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ["name"],
      threshold: 0.3,
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (isFocused && !searchTerm) {
      return items;
    }
    if (!searchTerm) return [];
    return fuse
      .search(searchTerm)
      .map((result) => result.item)
      .filter((item) => item.price > 0);
  }, [searchTerm, fuse, isFocused, items]);

  const handleSelect = (item: SimplifiedItem | null) => {
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
  };

  const handleRemove = () => {
    if (isPinned) {
      onPin();
    }
    handleSelect(null);
  };

  const clearPriceOverride = () => {
    setPriceOverride("");
    setIsPriceOverrideActive(false);
    if (selectedItem) {
      onSelect(selectedItem, null);
    }
  };

  const handlePriceOverride = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPriceOverride(value);
    if (selectedItem && value && isPriceOverrideActive) {
      onSelect(selectedItem, Number(value) || 0);
    }
  };

  const togglePriceOverride = () => {
    setIsPriceOverrideActive(!isPriceOverrideActive);
    if (!isPriceOverrideActive && selectedItem && priceOverride) {
      onSelect(selectedItem, Number(priceOverride));
    } else if (isPriceOverrideActive && selectedItem) {
      onSelect(selectedItem, null);
      setPriceOverride("");
    }
  };

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
              if (selectedItem) onSelect(null);
            }}
            placeholder="Search items..."
            className={`w-full p-2 pr-24 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isPinned ? "border-2 border-yellow-500" : ""
            }`}
          />
          {selectedItem && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
              <button
                onClick={onPin}
                className={`p-1 ${
                  isPinned ? "bg-yellow-500" : "bg-gray-500"
                } text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                title={isPinned ? "Unpin Item" : "Pin Item"}
              >
                <Pin size={16} />
              </button>
              <button
                onClick={togglePriceOverride}
                className={`p-1 ${
                  isPriceOverrideActive ? "bg-green-500" : "bg-gray-500"
                } text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500`}
                title={
                  isPriceOverrideActive
                    ? "Disable Price Override"
                    : "Enable Price Override"
                }
              >
                <BadgePoundSterling size={16} />
              </button>
              <button
                onClick={onCopy}
                className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Copy Item Name"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={handleRemove}
                className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Remove Item"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {!selectedItem && isFocused && (
          <ul className="absolute z-10 w-full mt-1 bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredItems.map((item) => {
              const itemOverriddenPrice = overriddenPrices[item.uid];
              const displayedPrice =
                itemOverriddenPrice !== undefined
                  ? itemOverriddenPrice
                  : item.price;
              const isOverridden = itemOverriddenPrice !== undefined;

              return (
                <Tooltip key={item.uid}>
                  <TooltipTrigger asChild>
                    <li
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseUp={() => handleSelect(item)}
                      className="p-2 hover:bg-gray-600 cursor-pointer text-white flex flex-col"
                    >
                      <div className="flex justify-between">
                        <span>{item.name}</span>
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        <p>Base Value: ₱{item.basePrice.toLocaleString()}</p>
                        <p>
                          Estimated Flea Price:{" "}
                          <span
                            className={
                              isOverridden ? "text-yellow-300 font-bold" : ""
                            }
                          >
                            ₱{displayedPrice.toLocaleString()}
                          </span>
                          {isOverridden && (
                            <span className="text-gray-400 ml-1">
                              (Overridden)
                            </span>
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
                          className={
                            isOverridden ? "text-yellow-300 font-bold" : ""
                          }
                        >
                          ₱{displayedPrice.toLocaleString()}
                        </span>
                        {isOverridden && (
                          <span className="text-gray-400 ml-1">
                            (Overridden)
                          </span>
                        )}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {filteredItems.length === 0 && (
              <li className="p-2 text-gray-400">No items found.</li>
            )}
          </ul>
        )}
        {selectedItem && (
          <div className="text-sm text-gray-400 mt-1 flex flex-col sm:flex-row justify-between">
            <span>Base: ₱{selectedItem.basePrice.toLocaleString()}</span>
            <span className={overriddenPrice ? "text-neutral-100" : ""}>
              Flea: ₱{(overriddenPrice || selectedItem.price).toLocaleString()}
            </span>
            <span>Updated: {getRelativeDate(selectedItem.updated)}</span>
          </div>
        )}
        {selectedItem && isPriceOverrideActive && !isAutoPickActive && (
          <div className="mt-1 flex items-center">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={priceOverride || ""}
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
                <X size={16} />
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