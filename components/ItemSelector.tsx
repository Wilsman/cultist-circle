/* eslint-disable @next/next/no-img-element */
"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Copy,
  X as XIcon,
  Pin,
  Edit,
  CircleSlash,
  Trash2,
  Search,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import Fuse from "fuse.js";
import { motion, AnimatePresence } from "framer-motion";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { TraderLevels } from "@/components/ui/trader-level-selector";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ItemTooltip } from "@/components/ui/item-tooltip";
import { getRelativeDate, cn } from "@/lib/utils";
import { toast as sonnerToast } from "sonner";

// Import Dropdown components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Import react-window for virtualization
import {
  FixedSizeList as List,
  type FixedSizeList as FixedSizeListInstance,
  type ListChildComponentProps,
} from "react-window";
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
  fleaPriceType: "lastLowPrice" | "avg24hPrice";
  priceMode: "flea" | "trader";
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<FixedSizeListInstance<SimplifiedItem> | null>(null);

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

  const getSearchableNames = useCallback((item: SimplifiedItem) => {
    return [
      item.name,
      item.shortName,
      item.englishName,
      item.englishShortName,
    ].filter(Boolean) as string[];
  }, []);

  const excludedLookup = useMemo(() => {
    return new Set(Array.from(excludedItems, (name) => name.toLowerCase()));
  }, [excludedItems]);

  // Helper: compute effective price and chosen vendor info
  const getEffectivePriceInfo = useCallback(
    (
      item: SimplifiedItem | null | undefined
    ): {
      price: number | null;
      vendorName?: keyof TraderLevels;
      minTraderLevel?: number;
    } => {
      if (!item) return { price: null };
      if (priceMode === "flea") {
        const fleaVal = item[fleaPriceType as "lastLowPrice" | "avg24hPrice"];
        return { price: typeof fleaVal === "number" ? fleaVal : null };
      }
      // trader mode
      const offers = item.buyFor ?? [];
      let best: {
        price: number;
        vendorName: keyof TraderLevels;
        minTraderLevel?: number;
      } | null = null;
      for (const offer of offers) {
        const vendorName = offer.vendor?.normalizedName as string | undefined;
        const minLevel =
          offer.vendor && "minTraderLevel" in offer.vendor
            ? (offer.vendor as { minTraderLevel?: number }).minTraderLevel
            : undefined;
        if (!vendorName) continue;
        const key = vendorName as keyof TraderLevels;
        const userLevel = traderLevels[key as keyof TraderLevels];
        if (userLevel === undefined) continue; // not a trader or unknown vendor
        if (minLevel !== undefined && minLevel > userLevel) continue; // not eligible
        const price = offer.priceRUB;
        if (typeof price === "number") {
          if (best === null || price > best.price)
            best = { price, vendorName: key, minTraderLevel: minLevel };
        }
      }
      return best
        ? {
            price: best.price,
            vendorName: best.vendorName,
            minTraderLevel: best.minTraderLevel,
          }
        : { price: null };
    },
    [fleaPriceType, priceMode, traderLevels]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (selectedItem && overriddenPrice !== undefined) {
        const next = overriddenPrice.toString();
        setIsPriceOverrideActive(true);
        setPriceOverride(next);
      } else {
        setIsPriceOverrideActive(false);
        setPriceOverride("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedItem, overriddenPrice]);

  // Initialize Fuse.js for searching
  const fuse = useMemo(() => {
    const validItems = Array.isArray(items) ? items : [];
    try {
      return new Fuse(validItems, {
        keys: [
          { name: "name", weight: 0.7 },
          { name: "shortName", weight: 0.3 },
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 1,
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

    let results: SimplifiedItem[];
    if (isFocused && !debouncedSearchTerm) {
      results = validItems.filter((item) => item.basePrice > 0);
    } else if (!debouncedSearchTerm) {
      return [];
    } else if (!fuse) {
      results = validItems;
    } else {
      results = fuse
        .search(debouncedSearchTerm)
        .map((result) => result.item)
        .filter((item) => item.basePrice > 0);
    }
    return results.filter(
      (item) =>
        item.basePrice > 0 &&
        !getSearchableNames(item).some((name) =>
          excludedLookup.has(name.toLowerCase())
        )
    );
  }, [
    debouncedSearchTerm,
    excludedLookup,
    fuse,
    getSearchableNames,
    isFocused,
    items,
  ]);

  const inlineSuggestionItem = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return null;
    const validItems = Array.isArray(items) ? items : [];
    for (const item of validItems) {
      if (item.basePrice <= 0) continue;
      const searchableNames = getSearchableNames(item);
      const matches = searchableNames.some((name) =>
        name.toLowerCase().startsWith(normalizedTerm)
      );
      if (
        matches &&
        !searchableNames.some((name) => excludedLookup.has(name.toLowerCase()))
      ) {
        return item;
      }
    }
    return null;
  }, [excludedLookup, getSearchableNames, items, searchTerm]);

  const inlineSuggestionText = inlineSuggestionItem?.name ?? "";
  const hasInlineSuggestion =
    !!inlineSuggestionText &&
    inlineSuggestionText.toLowerCase() !== searchTerm.trim().toLowerCase();
  const suggestionRemainder = hasInlineSuggestion
    ? inlineSuggestionText.slice(
        Math.min(inlineSuggestionText.length, searchTerm.trim().length)
      )
    : "";

  useEffect(() => {
    let nextIndex = -1;
    if (isFocused && filteredItems.length > 0) {
      nextIndex = 0;
    }
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setHighlightedIndex(nextIndex);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearchTerm, filteredItems.length, isFocused]);

  useEffect(() => {
    if (!isFocused || highlightedIndex < 0) return;
    listRef.current?.scrollToItem(highlightedIndex);
  }, [highlightedIndex, isFocused]);

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
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!selectedItem || !isPriceOverrideActive || !priceOverride) return;
      const nextValue = Number(priceOverride) || 0;
      if (overriddenPrice !== undefined && overriddenPrice === nextValue)
        return;
      onSelect(selectedItem, nextValue);
    }, 500);
    return () => clearTimeout(handler);
  }, [
    priceOverride,
    selectedItem,
    isPriceOverrideActive,
    overriddenPrice,
    onSelect,
  ]);

  // Handle changes in the override input
  const handlePriceOverride = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^\d*$/.test(value)) {
        setPriceOverride(value);
      }
    },
    []
  );

  // Copy item name (with optional toast)
  const handleCopy = useCallback(() => {
    onCopy();
    if (onCopyWithToast) {
      onCopyWithToast();
    } else {
      sonnerToast("Name Copied", {
        description: selectedItem
          ? `${selectedItem.name} copied to clipboard`
          : "Item copied to clipboard",
      });
    }
  }, [onCopy, onCopyWithToast, selectedItem]);

  const acceptInlineSuggestion = useCallback(() => {
    if (!hasInlineSuggestion) return false;
    setSearchTerm(inlineSuggestionText);
    requestAnimationFrame(() => {
      const length = inlineSuggestionText.length;
      inputRef.current?.setSelectionRange(length, length);
    });
    return true;
  }, [hasInlineSuggestion, inlineSuggestionText]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        if (!filteredItems.length) return;
        event.preventDefault();
        setHighlightedIndex((prev) => {
          if (filteredItems.length === 0) return -1;
          const next =
            prev < 0 ? 0 : prev >= filteredItems.length - 1 ? 0 : prev + 1;
          return next;
        });
        return;
      }
      if (event.key === "ArrowUp") {
        if (!filteredItems.length) return;
        event.preventDefault();
        setHighlightedIndex((prev) => {
          if (filteredItems.length === 0) return -1;
          const next =
            prev <= 0 ? filteredItems.length - 1 : Math.max(prev - 1, 0);
          return next;
        });
        return;
      }
      if (event.key === "Enter") {
        if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          event.preventDefault();
          handleSelect(filteredItems[highlightedIndex]);
          return;
        }
        if (inlineSuggestionItem) {
          event.preventDefault();
          handleSelect(inlineSuggestionItem);
        }
        return;
      }
      if (event.key === "Tab") {
        if (acceptInlineSuggestion()) {
          event.preventDefault();
        }
        return;
      }
      if (
        event.key === "ArrowRight" &&
        hasInlineSuggestion &&
        inputRef.current &&
        inputRef.current.selectionStart === inputRef.current.value.length &&
        inputRef.current.selectionEnd === inputRef.current.value.length
      ) {
        event.preventDefault();
        acceptInlineSuggestion();
        return;
      }
      if (event.key === "Escape") {
        if (searchTerm) {
          event.preventDefault();
          setSearchTerm("");
        } else {
          inputRef.current?.blur();
          setIsFocused(false);
        }
      }
    },
    [
      acceptInlineSuggestion,
      filteredItems,
      handleSelect,
      hasInlineSuggestion,
      highlightedIndex,
      inlineSuggestionItem,
      searchTerm,
    ]
  );

  const highlightMatch = useCallback(
    (text: string): React.ReactNode => {
      const term = debouncedSearchTerm.trim();
      if (!term) return text;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "ig");
      return text.split(regex).map((segment, idx) => {
        if (!segment) {
          return <React.Fragment key={`empty-${idx}`}></React.Fragment>;
        }
        if (idx % 2 === 1) {
          return (
            <span key={`${segment}-${idx}`} className="text-primary">
              {segment}
            </span>
          );
        }
        return <span key={`${segment}-${idx}`}>{segment}</span>;
      });
    },
    [debouncedSearchTerm]
  );

  // Row component for react-window (dropdown list item)
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps<SimplifiedItem>) => {
      const item = filteredItems[index];
      const itemOverriddenPrice = overriddenPrices[item.id];
      const effectiveInfo = getEffectivePriceInfo(item);
      const displayedPrice =
        itemOverriddenPrice !== undefined
          ? itemOverriddenPrice
          : effectiveInfo.price ?? null;
      const isOverridden = itemOverriddenPrice !== undefined;

      return (
        <div
          style={style}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(item)}
          className={cn(
            "group px-3 py-2 cursor-pointer flex items-center transition-all active:scale-[0.98]",
            highlightedIndex === index ? "bg-white/10" : "hover:bg-white/5"
          )}
          onMouseEnter={() => setHighlightedIndex(index)}
        >
          {item.iconLink && (
            <div className="relative p-1 bg-white/5 border border-white/10 rounded-md mr-3 group-hover:border-primary/30 transition-colors">
              <img
                src={item.iconLink}
                alt={item.name}
                className="w-10 h-10 object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="truncate font-semibold text-sm text-slate-100 group-hover:text-primary transition-colors">
              {highlightMatch(item.name)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-extrabold text-emerald-500/90 uppercase tracking-wider">
                ₽{(item.basePrice || 0).toLocaleString()}
              </span>
              <span className="h-0.5 w-0.5 rounded-full bg-white/10" />
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-widest opacity-60",
                  isOverridden ? "text-amber-400/80" : "text-primary/90"
                )}
              >
                {priceMode === "flea" ? "Flea" : "Trader"}:{" "}
                {typeof displayedPrice === "number"
                  ? `₽${displayedPrice.toLocaleString()}`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      );
    },
    [
      filteredItems,
      getEffectivePriceInfo,
      handleSelect,
      highlightMatch,
      highlightedIndex,
      overriddenPrices,
      priceMode,
    ]
  );

  return (
    <TooltipProvider>
      <div className="relative w-full">
        <AnimatePresence mode="wait">
          {!selectedItem ? (
            <motion.div
              key="search-mode"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 bg-black/40 backdrop-blur-xl border transition-all duration-200 rounded-xl",
                  isFocused
                    ? "border-primary/50 shadow-[0_0_20px_rgba(0,255,255,0.1)]"
                    : "border-white/10"
                )}
              >
                <Search
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isFocused ? "text-primary" : "text-white/30"
                  )}
                />
                <div className="relative flex-1">
                  {isFocused && hasInlineSuggestion && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-sm font-medium text-white/25"
                    >
                      <span className="text-transparent">{searchTerm}</span>
                      <span>{suggestionRemainder}</span>
                    </span>
                  )}
                  <input
                    ref={inputRef}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    type="text"
                    value={searchTerm}
                    onKeyDown={handleInputKeyDown}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search items..."
                    className="relative z-10 w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none font-medium"
                  />
                </div>
              </div>

              {isFocused && hasInlineSuggestion && (
                <div className="flex items-center gap-2 px-4 pt-2 text-[11px] text-white/50">
                  <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                    Tab
                  </span>
                  <span className="truncate">
                    Autocomplete to &quot;{inlineSuggestionText}&quot;
                  </span>
                </div>
              )}

              <AnimatePresence>
                {isFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 4 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 z-[100] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="max-h-[320px]">
                      <AutoSizer disableHeight>
                        {({ width }) => (
                          <List
                            ref={listRef}
                            height={Math.min(
                              filteredItems.length * 56 || 200,
                              320
                            )}
                            itemCount={filteredItems.length}
                            itemSize={56}
                            width={width}
                          >
                            {Row}
                          </List>
                        )}
                      </AutoSizer>
                      {filteredItems.length === 0 && (
                        <div className="p-8 text-center text-white/30 text-sm font-medium">
                          No items matching your search
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="selected-mode"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "relative group bg-black/40 backdrop-blur-xl border rounded-xl overflow-hidden transition-all duration-300",
                isPinned
                  ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                  : "border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center p-3 sm:p-4 gap-4">
                {/* Item Icon & Basic Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center group-hover:border-primary/30 transition-colors">
                    <ItemTooltip
                      item={selectedItem}
                      iconUrl={selectedItem.iconLink || undefined}
                    >
                      <img
                        src={selectedItem.iconLink || undefined}
                        alt={selectedItem.name}
                        className="w-full h-full object-contain p-1"
                      />
                    </ItemTooltip>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <h3 className="text-white font-bold text-sm sm:text-base truncate tracking-tight">
                      {selectedItem.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider flex items-center shadow-[0_0_15px_rgba(16,185,129,0.05)] border border-emerald-500/20">
                        Base: {(selectedItem.basePrice || 0).toLocaleString()}
                      </span>
                      <AnimatePresence mode="wait">
                        {isPriceOverrideActive ? (
                          <motion.div
                            key="price-input"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/40 rounded-md px-2 py-0.5 ring-1 ring-amber-500/20"
                          >
                            <span className="text-[10px] text-amber-400 font-bold">
                              ₽
                            </span>
                            <input
                              autoFocus
                              type="text"
                              value={priceOverride}
                              onChange={handlePriceOverride}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (selectedItem) {
                                    onSelect(
                                      selectedItem,
                                      Number(priceOverride) || 0
                                    );
                                  }
                                  setIsPriceOverrideActive(false);
                                }
                                if (e.key === "Escape") clearPriceOverride();
                              }}
                              className="w-20 bg-transparent text-[10px] font-bold text-amber-400 outline-none placeholder:text-amber-400/30 font-mono"
                              placeholder="Manual..."
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearPriceOverride();
                              }}
                              className="text-amber-400/60 hover:text-red-400 transition-colors ml-1"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="price-badge"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePriceOverride();
                            }}
                            className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-widest cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all",
                              isPriceOverrideActive
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-400 opacity-100 ring-1 ring-amber-500/20"
                                : "bg-primary/5 border-primary/20 text-primary/90 opacity-80 hover:opacity-100 hover:border-primary/40 hover:bg-primary/10"
                            )}
                          >
                            <span className="text-[8px] text-white/60 mr-0.5">
                              {priceMode === "flea" ? "Flea" : "Trader"}
                            </span>
                            <span>
                              {((isPriceOverrideActive && priceOverride
                                ? Number(priceOverride)
                                : null) ??
                                overriddenPrices[selectedItem.id] ??
                                getEffectivePriceInfo(selectedItem).price ??
                                null) !== null
                                ? `₽${(
                                    (isPriceOverrideActive && priceOverride
                                      ? Number(priceOverride)
                                      : null) ??
                                    overriddenPrices[selectedItem.id] ??
                                    getEffectivePriceInfo(selectedItem).price ??
                                    0
                                  ).toLocaleString()}`
                                : "N/A"}
                            </span>
                            <Edit
                              className={cn(
                                "h-2 w-2 ml-1 transition-opacity",
                                isPriceOverrideActive
                                  ? "opacity-100"
                                  : "opacity-40"
                              )}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Toolbar Section */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-1 pl-0 sm:pl-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 h-9 sm:h-auto">
                    {/* Desktop Toolbar (visible on md+) */}
                    <div className="hidden sm:flex items-center gap-1">
                      <ActionButton
                        icon={<Copy className="h-3.5 w-3.5" />}
                        onClick={handleCopy}
                        tooltip="Copy name"
                      />
                      {selectedItem.link && (
                        <ActionButton
                          icon={<ExternalLink className="h-3.5 w-3.5" />}
                          onClick={() =>
                            window.open(selectedItem.link, "_blank")
                          }
                          tooltip="View on Tarkov.dev"
                        />
                      )}
                      <div className="w-px h-4 bg-white/10 mx-0.5" />
                    </div>

                    {/* Primary Actions (always visible) */}
                    <ActionButton
                      icon={<Pin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      onClick={onPin}
                      active={isPinned}
                      activeClass="text-amber-400 bg-amber-500/10"
                      tooltip={isPinned ? "Unpin item" : "Pin item"}
                      className="h-8 w-8 sm:h-7 sm:w-7"
                    />

                    {/* Desktop-only Exclude button (part of expanded toolbar) */}
                    <div className="hidden sm:flex items-center">
                      <ActionButton
                        icon={<CircleSlash className="h-3.5 w-3.5" />}
                        onClick={onToggleExclude}
                        active={isExcluded}
                        activeClass="text-red-400 bg-red-500/10"
                        tooltip={
                          isExcluded
                            ? "Include in auto-pick"
                            : "Exclude from auto-pick"
                        }
                      />
                    </div>

                    <div className="w-px h-4 bg-white/10 mx-0.5" />

                    {/* Mobile-only More Actions Dropdown */}
                    <div className="flex sm:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/40 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-black/90 border-white/10 backdrop-blur-xl"
                        >
                          <DropdownMenuItem
                            onClick={handleCopy}
                            className="gap-2 text-white/70 focus:text-white focus:bg-white/10"
                          >
                            <Copy className="h-4 w-4" />
                            <span>Copy Name</span>
                          </DropdownMenuItem>
                          {selectedItem.link && (
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(selectedItem.link, "_blank")
                              }
                              className="gap-2 text-white/70 focus:text-white focus:bg-white/10"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>View on Tarkov.dev</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={onToggleExclude}
                            className={cn(
                              "gap-2 focus:bg-white/10",
                              isExcluded
                                ? "text-red-400 focus:text-red-300"
                                : "text-white/70 focus:text-white"
                            )}
                          >
                            <CircleSlash className="h-4 w-4" />
                            <span>
                              {isExcluded
                                ? "Include in Autopick"
                                : "Exclude from Autopick"}
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Always visible Trash */}
                    <ActionButton
                      icon={<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      onClick={handleRemove}
                      className="h-8 w-8 sm:h-7 sm:w-7 text-red-400 hover:bg-red-500/10"
                      tooltip="Remove"
                    />
                  </div>
                </div>

                {/* Price Override Input removed - integrated into badge area */}
              </div>

              {/* Metadata Row */}
              <div className="px-3 sm:px-4 pb-3 flex items-center gap-3 text-[10px] text-white/30 font-medium">
                {priceMode === "trader" &&
                  getEffectivePriceInfo(selectedItem).vendorName && (
                    <div className="flex items-center gap-1.5">
                      <img
                        src={
                          TRADER_AVATARS[
                            getEffectivePriceInfo(selectedItem).vendorName!
                          ]
                        }
                        alt=""
                        className="w-3.5 h-3.5 rounded-full ring-1 ring-white/10"
                      />
                      <span className="capitalize">
                        {getEffectivePriceInfo(selectedItem).vendorName}
                        {getEffectivePriceInfo(selectedItem).minTraderLevel
                          ? ` L${
                              getEffectivePriceInfo(selectedItem).minTraderLevel
                            }`
                          : ""}
                      </span>
                    </div>
                  )}
                {priceMode === "flea" && selectedItem.updated && (
                  <span>
                    Updated {getRelativeDate(selectedItem.updated.toString())}
                  </span>
                )}
                {isExcluded && (
                  <span className="text-red-400 font-bold uppercase tracking-wider">
                    Excluded from Autopick
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
  activeClass?: string;
  className?: string;
}> = ({ icon, onClick, tooltip, active, activeClass, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "h-7 w-7 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all",
          active && activeClass,
          className
        )}
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-[10px] px-2 py-1">
      {tooltip}
    </TooltipContent>
  </Tooltip>
);

export default React.memo(ItemSelector);
