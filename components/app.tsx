"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import ItemSocket from "@/components/item-socket";
import { 
  AlertCircle,
  Loader2, 
  MessageSquareWarning, 
  Settings, 
  Table
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import SettingsPane from "@/components/settings-pane";
import { InstructionsDialog } from "@/components/InstructionsDialog";
import { ModeToggle } from "@/components/ModeToggle";
import { ThresholdSelectorWithHelper } from "@/components/ThresholdSelectorWithHelper";
import { AutoSelectButton } from "@/components/AutoSelectButton";
import { VersionInfo } from "@/components/version-info";
import { ShareCodeDialog } from "@/components/share-code-component";
import {
  ALL_ITEM_CATEGORIES,
  DEFAULT_EXCLUDED_CATEGORIES,
} from "@/config/item-categories";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { doItemsFitInBox } from "../lib/fit-items-in-box";
import { PlacementPreviewModal } from "./placement-preview-modal";
import { PlacementPreviewInline } from "./placement-preview-inline";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { resetUserData } from "@/utils/resetUserData";
import { FeedbackForm } from "./feedback-form";
import Link from "next/link";
import { useItemsData } from "@/hooks/use-items-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const CURRENT_VERSION = "1.2.2"; //* Increment this when you want to trigger a cache clear
const OVERRIDDEN_PRICES_KEY = "overriddenPrices";
const FLEA_PRICE_TYPE_KEY = "fleaPriceType";
const USE_LAST_OFFER_COUNT_FILTER_KEY = "useLastOfferCountFilter";

const DynamicItemSelector = dynamic(() => import("@/components/ItemSelector"), {
  ssr: false,
});

type FleaPriceType = "lastLowPrice" | "avg24hPrice";

function AppContent() {
  // Placement preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  // Define state variables and hooks
  const [isPVE, setIsPVE] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isPVE") === "true";
    }
    return false;
  });
  const [selectedItems, setSelectedItems] = useState<
    Array<SimplifiedItem | null>
  >(Array(5).fill(null));
  // Always compute fitDebug for the current selection
  const fitDebug = useMemo(() => {
    const result = doItemsFitInBox(
      selectedItems.filter(Boolean) as SimplifiedItem[],
      9,
      6,
      true // debug mode
    );
    return typeof result === "object" && result !== null ? result : null;
  }, [selectedItems]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isFeedbackFormVisible, setIsFeedbackFormVisible] =
    useState<boolean>(false);
  const [pinnedItems, setPinnedItems] = useState<boolean[]>(
    Array(5).fill(false)
  );
  const [isSettingsPaneVisible, setIsSettingsPaneVisible] =
    useState<boolean>(false);
  // Set the default sort option to "az" if no saved value exists in local storage
  const [sortOption, setSortOption] = useState<string>(() => {
    if (typeof window !== "undefined") {
      console.log("Loading sort option from localStorage");
      return localStorage.getItem("sortOption") || "az";
    }
    return "az";
  });
  const [fleaPriceType, setFleaPriceType] = useState<FleaPriceType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        FLEA_PRICE_TYPE_KEY
      ) as FleaPriceType | null;
      if (saved === "lastLowPrice" || saved === "avg24hPrice") {
        console.log("Loading flea price type from localStorage:", saved);
        return saved;
      }
    }
    console.log(
      "No valid saved flea price type found, using default: lastLowPrice"
    );
    return "lastLowPrice";
  });
  const [useLastOfferCountFilter, setUseLastOfferCountFilter] =
    useState<boolean>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(USE_LAST_OFFER_COUNT_FILTER_KEY);
        if (saved !== null) {
          return saved === "true";
        }
      }
      return true; // Default to true
    });
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(
    new Set()
  );
  const [threshold, setThreshold] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("userThreshold");
      const parsed = Number(saved);
      if (saved && Number.isFinite(parsed)) return parsed;
    }
    return 400000;
  });
  const [excludeIncompatible, setExcludeIncompatible] = useState<boolean>(true);
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set());
  const [overriddenPrices, setOverriddenPrices] = useState<
    Record<string, number>
  >({});
  const [hasAutoSelected, setHasAutoSelected] = useState<boolean>(false);
  const [itemBonus, setItemBonus] = useState<number>(0);

  // Import hooks
  const { toast } = useToast();
  const toastShownRef = useRef<boolean>(false);

  // Use the items data hook
  const {
    data: rawItemsData,
    isLoading: loading,
    hasError,
    mutate,
    needsManualRetry,
    resetRetryCount
  } = useItemsData(isPVE);

  // Save isPVE state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("isPVE", isPVE.toString());
  }, [isPVE]);

  // Save fleaPriceType to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(FLEA_PRICE_TYPE_KEY, fleaPriceType);
      console.log("Saved flea price type to localStorage:", fleaPriceType);
    }
  }, [fleaPriceType]);

  // Save useLastOfferCountFilter to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        USE_LAST_OFFER_COUNT_FILTER_KEY,
        useLastOfferCountFilter.toString()
      );
      console.log(
        "Saved useLastOfferCountFilter to localStorage:",
        useLastOfferCountFilter
      );
    }
  }, [useLastOfferCountFilter]);

  // Handle error state
  useEffect(() => {
    if (hasError) {
      toast({
        title: "Error Loading Items",
        description: "Failed to load items. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [hasError, toast]);

  // Initialize client-side state
  useEffect(() => {
    // Only initialize if we have data
    if (!rawItemsData || rawItemsData.length === 0) return;

    // No URL-based initialization needed anymore
    // We'll use the ShareCodeDialog component for sharing items

    // Load sort option
    const savedSort = localStorage.getItem("sortOption");
    if (savedSort) setSortOption(savedSort);

    // Load flea price type (already handled by useState initializer)

    // Load excluded categories
    try {
      const saved = localStorage.getItem("excludedCategories");
      if (saved) {
        const parsedCategories = JSON.parse(saved);
        if (Array.isArray(parsedCategories)) {
          setExcludedCategories(new Set(parsedCategories));
        } else {
          console.error(
            "Saved excludedCategories is not an array:",
            parsedCategories
          );
          setExcludedCategories(DEFAULT_EXCLUDED_CATEGORIES);
        }
      } else {
        console.log("No saved categories found, using defaults");
        setExcludedCategories(DEFAULT_EXCLUDED_CATEGORIES);
      }
    } catch (e) {
      console.error("Error parsing excludedCategories from localStorage", e);
      setExcludedCategories(DEFAULT_EXCLUDED_CATEGORIES);
    }

    // Load threshold
    const savedThreshold = localStorage.getItem("userThreshold");
    const parsed = Number(savedThreshold);
    if (savedThreshold && Number.isFinite(parsed)) {
      setThreshold(parsed);
    }

    // Load exclude incompatible setting
    try {
      const saved = localStorage.getItem("excludeIncompatible");
      if (saved !== null) {
        setExcludeIncompatible(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error parsing excludeIncompatible from localStorage", e);
    }

    // Load excluded items
    try {
      const saved = localStorage.getItem("excludedItems");
      if (saved) {
        const savedItems = new Set<string>(JSON.parse(saved) as string[]);
        // Merge with defaults to ensure defaults are always included
        Array.from(DEFAULT_EXCLUDED_ITEMS).forEach((item) =>
          savedItems.add(item)
        );
        setExcludedItems(savedItems);
      } else {
        // When no saved items exist, initialize with defaults
        setExcludedItems(new Set(Array.from(DEFAULT_EXCLUDED_ITEMS)));
      }
    } catch (e) {
      console.error("Error loading excludedItems from localStorage", e);
      // If there's an error, at least keep the defaults
      setExcludedItems(new Set(Array.from(DEFAULT_EXCLUDED_ITEMS)));
    }

    // Load overridden prices
    try {
      const stored = localStorage.getItem(OVERRIDDEN_PRICES_KEY);
      if (stored) {
        setOverriddenPrices(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading overriddenPrices from localStorage", e);
    }
  }, [rawItemsData, toast]);

  // Save sort option to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sortOption", sortOption);
    }
  }, [sortOption]);

  // Save excluded categories to localStorage whenever they change, but only if it's not the initial load
  useEffect(() => {
    // Skip saving if it's an empty set (initial state)
    if (excludedCategories.size === 0) return;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "excludedCategories",
          JSON.stringify(Array.from(excludedCategories))
        );
      } catch (e) {
        console.error("Error saving excludedCategories to localStorage", e);
      }
    }
  }, [excludedCategories]);

  // Save threshold to localStorage
  useEffect(() => {
    localStorage.setItem("userThreshold", threshold.toString());
  }, [threshold]);

  // Save excludeIncompatible to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "excludeIncompatible",
        JSON.stringify(excludeIncompatible)
      );
    }
  }, [excludeIncompatible]);

  // Save excludedItems to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "excludedItems",
        JSON.stringify(Array.from(excludedItems))
      );
    }
  }, [excludedItems]);

  // Save overriddenPrices to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          OVERRIDDEN_PRICES_KEY,
          JSON.stringify(overriddenPrices)
        );
      } catch (e) {
        console.error("Error saving overriddenPrices to localStorage", e);
      }
    }
  }, [overriddenPrices]);

  // Handler for category changes
  const handleCategoryChange = useCallback((categories: string[]) => {
    console.log("handleCategoryChange called with:", categories);
    setExcludedCategories(new Set(categories));
    setHasAutoSelected(false); // Reset Auto Select when categories change
  }, []);

  // Sort option handler
  const handleSortChange = useCallback((newSortOption: string) => {
    setSortOption(newSortOption);
    if (typeof window !== "undefined") {
      localStorage.setItem("sortOption", newSortOption);
    }
    setHasAutoSelected(false); // Reset Auto Select when sort changes
  }, []);

  // Calls handleReset and also clears the users cookies and local storage
  const handleReset = useCallback(async () => {
    await resetUserData(
      setSelectedItems,
      setPinnedItems,
      setExcludedCategories,
      setSortOption,
      setThreshold,
      setExcludedItems,
      setOverriddenPrices,
      setIsPVE,
      async () => {
        await mutate();
        return;
      },
      DEFAULT_EXCLUDED_CATEGORIES,
      toast
    );
  }, [
    setSelectedItems,
    setPinnedItems,
    setExcludedCategories,
    setSortOption,
    setThreshold,
    setExcludedItems,
    setOverriddenPrices,
    setIsPVE,
    mutate,
    toast,
  ]);

  // Handler for threshold changes
  const handleThresholdChange = (newValue: number) => {
    setThreshold(newValue);
    localStorage.setItem("userThreshold", newValue.toString());
    toastShownRef.current = false; // Reset toast shown flag when threshold changes
  };

  // Memoized computation of items based on categories, sort option, and excluded items
  const items: SimplifiedItem[] = useMemo(() => {
    if (loading || !rawItemsData) {
      return [];
    }

    if (!Array.isArray(rawItemsData)) {
      console.error("rawItemsData is not an array:", rawItemsData);
      return [];
    }

    // First filter by excluded categories
    const categoryFiltered = rawItemsData.filter(
      (item: SimplifiedItem) =>
        item.name.toLowerCase() === "pestily plague mask" || // ! TEMPORARY FIX FOR PESTILY PLAGUE MASK
        !item.categories_display?.some((category) =>
          excludedCategories.has(category.name)
        )
    );

    // Then filter out individually excluded items (case-insensitive)
    const excludedItemNames = new Set(
      Array.from(excludedItems, (name) => name.toLowerCase())
    );
    const excludedFiltered = excludeIncompatible
      ? categoryFiltered.filter(
          (item: SimplifiedItem) =>
            !excludedItemNames.has(item.name.toLowerCase())
        )
      : categoryFiltered;

    // Sorting logic...
    const sortedItems = [...excludedFiltered];
    if (sortOption === "az") {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "base-value") {
      sortedItems.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortOption === "base-value-desc") {
      sortedItems.sort((a, b) => b.basePrice - a.basePrice);
    } else if (sortOption === "most-recent") {
      // Sort by updated time in descending order (updated is a timestamp so calc timestamp - updated) use datetime.strptime
      sortedItems.sort((a, b) => {
        const dateA = a.updated ? new Date(a.updated) : new Date(0);
        const dateB = b.updated ? new Date(b.updated) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    } else if (sortOption === "ratio") {
      sortedItems.sort((a, b) => {
        // Skip items without lastLowPrice in sorting (push them to the end)
        if (!b.lastLowPrice) return -1;
        if (!a.lastLowPrice) return 1;
        // Sort by highest base value to lowest market price ratio
        return b.basePrice / b.lastLowPrice - a.basePrice / a.lastLowPrice;
      });
    }

    return sortedItems;
  }, [
    rawItemsData,
    sortOption,
    excludedCategories,
    excludeIncompatible,
    excludedItems,
    loading,
  ]);

  // Function to find the best combination of items
  const findBestCombination = useCallback(
    (
      validItems: SimplifiedItem[],
      threshold: number,
      maxItems: number
    ): { selected: SimplifiedItem[]; totalFleaCost: number } => {
      // Apply the bonus to the baseValue of each item for calculation
      const bonusMultiplier = 1 + itemBonus / 100;

      // Pre-calculate adjusted base prices to avoid repeated calculations
      const adjustedItems = validItems.map((item) => ({
        ...item,
        adjustedBasePrice: Math.floor(item.basePrice * bonusMultiplier),
        fleaPrice: item[fleaPriceType],
      }));

      // Use adjusted threshold for DP calculation
      const maxThreshold = threshold + 5000;

      // Optimize array creation
      const dp: number[][] = [];
      const itemTracking: number[][][] = [];

      // Initialize first row
      dp[0] = Array(maxThreshold + 1).fill(Infinity);
      dp[0][0] = 0;
      itemTracking[0] = Array(maxThreshold + 1)
        .fill(null)
        .map(() => []);

      // Build DP table with optimized loops
      for (let c = 1; c <= maxItems; c++) {
        dp[c] = Array(maxThreshold + 1).fill(Infinity);
        itemTracking[c] = Array(maxThreshold + 1)
          .fill(null)
          .map(() => []);

        // Copy values from previous row where no item is added
        for (let v = 0; v <= maxThreshold; v++) {
          dp[c][v] = dp[c - 1][v];
          if (dp[c - 1][v] !== Infinity) {
            itemTracking[c][v] = [...itemTracking[c - 1][v]];
          }
        }

        for (let i = 0; i < adjustedItems.length; i++) {
          const item = adjustedItems[i];
          const basePrice = item.adjustedBasePrice;
          const fleaPrice = item.fleaPrice;

          // Skip items with zero or negative base price, undefined/invalid flea price, or insufficient market offers
          if (
            basePrice <= 0 ||
            typeof fleaPrice !== "number" ||
            fleaPrice < 0 ||
            (useLastOfferCountFilter &&
              typeof item.lastOfferCount === "number" &&
              item.lastOfferCount < 5)
          ) {
            continue;
          }

          // Optimize inner loop - start from basePrice
          for (let v = basePrice; v <= maxThreshold; v++) {
            if (
              dp[c - 1][v - basePrice] !== Infinity &&
              dp[c - 1][v - basePrice] + fleaPrice < dp[c][v]
            ) {
              dp[c][v] = dp[c - 1][v - basePrice] + fleaPrice;
              itemTracking[c][v] = [...itemTracking[c - 1][v - basePrice], i];
            }
          }
        }
      }

      // Optimize valid combinations collection
      const validCombinations: { c: number; v: number; cost: number }[] = [];

      // Start from the highest number of items for better combinations
      for (let c = maxItems; c >= 1; c--) {
        let foundForThisC = false;

        // Check values from threshold to maxThreshold
        for (let v = threshold; v <= maxThreshold; v++) {
          if (dp[c][v] !== Infinity) {
            validCombinations.push({ c, v, cost: dp[c][v] });
            foundForThisC = true;

            // Optimization: Once we've found some valid combinations for this c,
            // we can limit how many we collect to avoid excessive processing
            if (validCombinations.length >= 20 && foundForThisC) {
              break;
            }
          }
        }

        // If we already have enough combinations, stop searching
        if (validCombinations.length >= 50) {
          break;
        }
      }

      // Optimize sorting - only sort if we have combinations
      if (validCombinations.length > 0) {
        // Sort by cost (most efficient first)
        validCombinations.sort((a, b) => a.cost - b.cost);

        // Take only top 5 for random selection
        const topCombinations = validCombinations.slice(
          0,
          Math.min(5, validCombinations.length)
        );

        // Select one randomly from top combinations
        const selectedCombination =
          topCombinations[Math.floor(Math.random() * topCombinations.length)];

        if (!selectedCombination) {
          return { selected: [], totalFleaCost: 0 };
        }

        const selectedIndices =
          itemTracking[selectedCombination.c][selectedCombination.v];
        const selectedItems = selectedIndices.map((index) => validItems[index]);

        return {
          selected: selectedItems,
          totalFleaCost: selectedCombination.cost,
        };
      } else {
        // No valid combinations found
        return { selected: [], totalFleaCost: 0 };
      }
    },
    [itemBonus, fleaPriceType, useLastOfferCountFilter]
  );

  // Memoized total and flea costs
  const total = useMemo(() => {
    // Apply the bonus from ItemSocket to increase the baseValue of each item
    return selectedItems.reduce((sum, item) => {
      if (!item) return sum;
      // Apply the bonus percentage to the item's basePrice
      const bonusMultiplier = 1 + itemBonus / 100;
      return sum + item.basePrice * bonusMultiplier;
    }, 0);
  }, [selectedItems, itemBonus]);

  const fleaCosts = useMemo(() => {
    return selectedItems.map((item) =>
      item ? overriddenPrices[item.id] ?? item[fleaPriceType] : 0
    );
  }, [selectedItems, overriddenPrices, fleaPriceType]);

  // Memoized total flea cost
  const totalFleaCost = useMemo(() => {
    return fleaCosts.reduce((sum, cost) => sum! + cost!, 0);
  }, [fleaCosts]);

  const isThresholdMet: boolean = total >= threshold;

  // check if selected items fit in the cultist circle box (9x6) and collect debug info
  const itemsFitInBox = useMemo(() => {
    return doItemsFitInBox(selectedItems.filter(Boolean) as SimplifiedItem[]);
  }, [selectedItems]);

  // Handler to update selected item
  const handleItemSelect = useCallback(
    (
      index: number,
      item: SimplifiedItem | null,
      overriddenPrice?: number | null
    ) => {
      setLoadingSlots((prev) => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });

      setTimeout(() => {
        setSelectedItems((prev) => {
          const newItems = [...prev];
          newItems[index] = item;
          return newItems;
        });
        setLoadingSlots((prev) => {
          const newState = [...prev];
          newState[index] = false;
          return newState;
        });

        // Handle price overrides
        if (item && overriddenPrice !== undefined) {
          if (overriddenPrice !== null) {
            setOverriddenPrices((prev) => ({
              ...prev,
              [item.id]: overriddenPrice,
            }));
          } else {
            setOverriddenPrices((prev) => {
              const newOverriddenPrices = { ...prev };
              delete newOverriddenPrices[item.id];
              return newOverriddenPrices;
            });
          }
        } else if (!item) {
          setOverriddenPrices((prev) => {
            const newOverriddenPrices = { ...prev };
            const id = selectedItems[index]?.id;
            if (id) {
              delete newOverriddenPrices[id];
            }
            return newOverriddenPrices;
          });
        }
      }, 150);
    },
    [selectedItems]
  );

  const updateSelectedItem = (
    item: SimplifiedItem | null,
    index: number,
    overriddenPrice?: number | null
  ) => {
    setHasAutoSelected(false); // Reset Auto Select when user changes selection
    handleItemSelect(index, item, overriddenPrice);
  };

  // Handler to pin/unpin items
  const handlePinItem = (index: number) => {
    const newPinnedItems = [...pinnedItems];
    newPinnedItems[index] = !newPinnedItems[index];
    setPinnedItems(newPinnedItems);
  };

  // Function to handle auto-select and reroll
  const handleAutoPick = useCallback(async (): Promise<void> => {
    // Perform Auto Select or Reroll regardless of hasAutoSelected state
    setIsCalculating(true);

    try {
      // Single-pass filter with all conditions, then sort and limit
      const validItems = items
        .map((item) => ({
          item,
          price: item[fleaPriceType],
          efficiency: item.basePrice / (item[fleaPriceType] || 1), // Avoid division by zero
        }))
        .filter(
          ({ item, price }) =>
            price !== undefined &&
            price > 0 &&
            item.basePrice >= threshold * 0.1 &&
            !excludedItems.has(item.name.toLowerCase())
        )
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 100)
        .map(({ item }) => item); // Map back to just the items

      // Small delay to prevent UI freezing
      await new Promise((resolve) => setTimeout(resolve, 50));

      const pinnedTotal = selectedItems.reduce(
        (sum, item, index) =>
          sum + (pinnedItems[index] && item ? item.basePrice : 0),
        0
      );

      const remainingThreshold = Math.max(0, threshold - pinnedTotal);

      const filteredItems = validItems.filter(
        (item) =>
          !selectedItems.some(
            (selected, index) => pinnedItems[index] && selected?.id === item.id
          )
      );

      // Adjust prices in filteredItems to use overridden prices where applicable
      const adjustedItems = filteredItems.map((item) => {
        const overriddenPrice = overriddenPrices[item.id];
        if (overriddenPrice !== undefined) {
          return {
            ...item,
            [fleaPriceType]: overriddenPrice,
          };
        }
        return item;
      });

      // Shuffle the adjusted items to increase randomness
      const shuffledAdjustedItems = [...adjustedItems].sort(
        () => Math.random() - 0.5
      );

      const bestCombination = findBestCombination(
        shuffledAdjustedItems,
        remainingThreshold,
        5 - pinnedItems.filter(Boolean).length
      );

      if (bestCombination.selected.length === 0 && remainingThreshold > 0) {
        alert("No combination of items meets the remaining threshold.");
        return;
      }

      const newSelectedItems: Array<SimplifiedItem | null> = [...selectedItems];
      let combinationIndex = 0;
      for (let i = 0; i < 5; i++) {
        if (!pinnedItems[i]) {
          newSelectedItems[i] =
            bestCombination.selected[combinationIndex] || null;
          combinationIndex++;
        }
      }

      // Preserve overridden prices for items that remain selected
      const newOverriddenPrices = { ...overriddenPrices };
      for (let i = 0; i < 5; i++) {
        const item = newSelectedItems[i];
        if (item && overriddenPrices[item.id]) {
          newOverriddenPrices[item.id] = overriddenPrices[item.id];
        }
        // Do not delete overridden prices for other items
      }

      setSelectedItems(newSelectedItems);
      setOverriddenPrices(newOverriddenPrices);
      setHasAutoSelected(true); // Set to true after successful auto-select
    } catch (error) {
      console.error("Auto Select Error:", error);
      setHasAutoSelected(false); // Reset if any error occurs
    } finally {
      setIsCalculating(false);
    }
  }, [
    items,
    threshold,
    excludedItems,
    pinnedItems,
    selectedItems,
    overriddenPrices,
    findBestCombination,
    fleaPriceType,
  ]);

  // Handle mode toggle with simplified caching approach
  const handleModeToggle = useCallback((checked: boolean): void => {
    // Mode switching is now handled by SWR cache in use-items-data.ts
    // We just need to update the UI state
    console.log(`Switching to ${checked ? "PVE" : "PVP"} mode`);

    // Update the mode state
    setIsPVE(checked);

    // Reset UI state
    setSelectedItems(Array(5).fill(null));
    setPinnedItems(Array(5).fill(false));
    setOverriddenPrices({});
    setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
    setHasAutoSelected(false);
    toastShownRef.current = false;
  }, []);

  // Handler to copy item name to clipboard
  const handleCopyToClipboard = (index: number): void => {
    const item = selectedItems[index];
    if (item) {
      const textToCopy = `${item.name}`;
      navigator.clipboard.writeText(textToCopy).then(
        () => {
          console.log(`Copied ${item.name} to clipboard.`);
          setTimeout(() => console.log("Clipboard reset."), 500); // Reset after 0.5 seconds
        },
        (err) => {
          console.error("Failed to copy text: ", err);
        }
      );
    }
  };

  // useEffect to trigger toast when threshold is met
  useEffect(() => {
    if (isThresholdMet && !toastShownRef.current) {
      const title = `Threshold Met - ${threshold.toLocaleString()}!`;
      let description = "";

      if (threshold >= 400000) {
        description =
          "25% chance for 6-hour cooldown otherwise 14-hour cooldown for high-value items.";
      } else if (threshold >= 350000) {
        // Adjusted to 350000 to match initial state
        description = "14-hour cooldown for high-value items.";
      } else {
        description =
          "You have met the threshold. A cooldown has been triggered.";
      }

      toast({
        title,
        description,
      });

      toastShownRef.current = true;
    }

    // Reset the toastShownRef if threshold is not met
    if (!isThresholdMet) {
      toastShownRef.current = false;
    }
  }, [isThresholdMet, threshold, toast]);

  // Check if the app version has changed since the user last used it
  useEffect(() => {
    // Get the version that is currently stored in local storage
    const storedVersion = localStorage.getItem("appVersion");
    // If the stored version is different from the one we define in the code
    if (storedVersion !== CURRENT_VERSION) {
      // Print a message to the console to let us know that the version has changed
      console.log(
        `App version changed from ${
          storedVersion || "none"
        } to ${CURRENT_VERSION}`
      );
      // If the version has changed, we want to clear out most of the items in local storage
      // We don't want to clear out the cookie consent, as that is a user preference
      Object.keys(localStorage).forEach((key) => {
        // If the key is not "cookieConsent", remove the item from local storage
        if (key !== "cookieConsent") {
          localStorage.removeItem(key);
        }
      });
      // Now that we have cleared out the old data, update the version in local storage
      localStorage.setItem("appVersion", CURRENT_VERSION);

      // Reset all state to defaults to prevent immediate re-saving to localStorage
      setSortOption("az");
      setExcludedCategories(DEFAULT_EXCLUDED_CATEGORIES);
      setExcludeIncompatible(true);
      setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
      setOverriddenPrices({});

      // Force a page reload to ensure all state is properly reset
      window.location.reload();
    }
  }, []);

  // Move these useMemo hooks here, right after the state declarations
  const isClearButtonDisabled = useMemo(() => {
    return (
      selectedItems.every((item) => item === null) &&
      Object.keys(overriddenPrices).length === 0 &&
      excludedItems.size === Array.from(DEFAULT_EXCLUDED_ITEMS).length
    );
  }, [selectedItems, overriddenPrices, excludedItems]);

  const isResetOverridesButtonDisabled = useMemo(() => {
    return (
      Object.keys(overriddenPrices).length === 0 &&
      excludedItems.size === Array.from(DEFAULT_EXCLUDED_ITEMS).length
    );
  }, [overriddenPrices, excludedItems]);

  const clearItemFields = useCallback(() => {
    setSelectedItems(Array(5).fill(null));
    setPinnedItems(Array(5).fill(false));
    setHasAutoSelected(false);
    toastShownRef.current = false;

    toast({
      title: "Cleared Items",
      description: "All item fields have been cleared.",
    });
  }, [toast]);

  // Add loading state
  const [loadingSlots, setLoadingSlots] = useState<boolean[]>(
    Array(5).fill(false)
  );

  // Reset overrides and exclusions
  const resetOverridesAndExclusions = useCallback(() => {
    const clearedOverridesCount = Object.keys(overriddenPrices).length;
    const clearedExcludedItemsCount = excludedItems.size;

    setOverriddenPrices({});
    setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
    setHasAutoSelected(false); // Reset Auto Select button
    toastShownRef.current = false; // Reset toast shown flag when resetting

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(OVERRIDDEN_PRICES_KEY);
        localStorage.removeItem("excludedItems");
      } catch (e) {
        console.error("Error removing data from localStorage", e);
      }
    }

    toast({
      title: "Reset Successful",
      description: `${clearedOverridesCount} overrides and ${clearedExcludedItemsCount} excluded items have been cleared.`,
    });
  }, [excludedItems, overriddenPrices, toast]);

  // Handler to toggle excluded items
  const toggleExcludedItem = useCallback((uid: string) => {
    setExcludedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
    setHasAutoSelected(false); // Reset Auto Select on exclusion change
  }, []);

  const handleFleaPriceTypeChange = useCallback((newType: FleaPriceType) => {
    setFleaPriceType(newType);
  }, []);

  const handleUseLastOfferCountFilterChange = useCallback(
    (newState: boolean) => {
      setUseLastOfferCountFilter(newState);
    },
    []
  );

  // Update the refresh button UI
  return (
    <>
      <div className="min-h-screen bg-my_bg_image bg-no-repeat bg-cover bg-fixed text-gray-100 p-4 overflow-auto">
        <div className="min-h-screen flex items-center justify-center">
          <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700 shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto transition-all duration-300 hover:shadow-xl">
            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 right-0 flex w-full bg-gray-900/80 rounded-t-lg">
              <div className="flex w-full">
                <InstructionsDialog />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex-1 hover:bg-gray-700/50 rounded-none border-r border-gray-700"
                    >
                      <span className="flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          className="h-4 w-4 mr-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                        Tools
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 ring-1 ring-gray-700 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 hover:ring-gray-700 hover:ring-1 hover:ring-offset-1"
                    align="start"
                  >
                    <DropdownMenuItem asChild>
                      <Link href="/recipes" className="cursor-pointer">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          className="h-4 w-4 mr-2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        Recipes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/base-values" className="cursor-pointer">
                        <Table className="h-4 w-4 mr-2" />
                        Base Values
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  className="flex-1 hover:bg-gray-700/50 rounded-none rounded-tr-lg ml-auto"
                  onClick={() => setIsSettingsPaneVisible(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Title and Version Info */}
            <div className="pt-2">
              <h1 className="sm:text-3xl text-xl font-bold mb-4 text-center text-red-500 text-nowrap flex items-center justify-center w-full">
                <Image
                  src="/images/Cultist-Calulator.webp"
                  alt="Cultist calculator logo"
                  width={400}
                  height={128}
                  priority={true}
                />
              </h1>
            </div>
            <div className="flex items-center justify-center pb-4">
              <a
                href="https://discord.com/invite/3dFmr5qaJK"
                rel="nofollow"
                target="_blank"
                className="flex items-center"
                >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.shields.io/discord/1298971881776611470?color=7289DA&label=Discord&logo=discord&logoColor=white"
                  alt="Discord"
                  style={{ maxWidth: "100%" }}
                  className="h-6"
                />
              </a>
            </div>

            {/* New Price Types Alert */}
            <div className="flex items-center justify-center">
              <Alert
                variant="default"
                className="mb-2 border-yellow-400/70 bg-yellow-50 dark:bg-yellow-900/10 animate-fade-in rounded shadow"
              >
                <AlertTitle className="text-sm font-bold text-yellow-700 dark:text-yellow-200 text-center">
                  New Base Value Lookup Table and Help!
                </AlertTitle>
                <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-100 text-center">
                  Quickly check the base value of any item. Try it out here{" "}
                  <Link
                    href="/base-values"
                    className="underline font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 focus:outline-none"
                  >
                    Base Values
                  </Link>
                  .
                  <br />
                  Also check out the improved Help!
                </AlertDescription>
              </Alert>
            </div>

            <div className="text-center text-gray-400 text-sm mb-4">
              <VersionInfo version={CURRENT_VERSION} />
            </div>

            <CardContent className="p-2">
              {/* Mode Toggle with improved animation */}
              <div className="transition-all duration-300">
                <ModeToggle isPVE={isPVE} onToggle={handleModeToggle} />
              </div>

              {/* Threshold selector with improved visual feedback */}
              <div className="mt-4 transition-all duration-300">
                <ThresholdSelectorWithHelper
                  threshold={threshold}
                  onThresholdChange={handleThresholdChange}
                  onHelperOpen={() => true}
                />
              </div>

              {/* Item Socket Component */}
              <div className="mt-6">
                <ItemSocket onBonusChange={setItemBonus} />
              </div>

              {/* Auto select button with loading animation */}
              <div className="mt-4 transition-all duration-300">
                <AutoSelectButton
                  isCalculating={isCalculating}
                  hasAutoSelected={hasAutoSelected}
                  handleAutoPick={handleAutoPick}
                />
              </div>

              <ShareCodeDialog
                selectedItems={selectedItems}
                isPVE={isPVE}
                rawItemsData={rawItemsData}
                onItemsLoaded={(items, newIsPVE) => {
                  setSelectedItems(items);
                  if (newIsPVE !== null) {
                    setIsPVE(newIsPVE);
                  }
                }}
              />
              {/* Placement Preview Button/Modal */}
              <PlacementPreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                fitDebug={fitDebug}
                selectedItems={selectedItems}
              />
              {/* show alert if items do not fit in the 9x6 box */}
              {!itemsFitInBox && (
                <div className="mt-2 mb-2 text-center w-full">
                  <Alert>
                    <MessageSquareWarning className="h-4 w-4" />
                    <AlertTitle className="text-white">
                      Items do not fit!
                    </AlertTitle>
                    <AlertDescription className="text-white">
                      {selectedItems.filter(Boolean).map((item, idx) => (
                        <div key={`${item?.id ?? "no-id"}-${idx}`}>
                          {item?.name} - {item?.width ?? "?"}w ×{" "}
                          {item?.height ?? "?"}h
                        </div>
                      ))}
                      <div className="mt-1">
                        The selected items cannot be arranged in the Cultist
                        Circle box (9×6).
                      </div>
                      <PlacementPreviewInline
                        fitDebug={fitDebug}
                        selectedItems={selectedItems}
                      />
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              {/* Item Selection Components with improved loading states */}
              <div className="w-full">
                <div id="search-items" className="space-y-0">
                  {loading ? (
                    <div className="space-y-0">
                      {Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <div
                            key={`skeleton-${index}`}
                            className="animate-pulse"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <Skeleton className="h-10 w-full bg-gray-700/50" />
                          </div>
                        ))}
                    </div>
                  ) : hasError ? (
                    <div className="text-red-500 text-center p-4">
                      Failed to load items. Please refresh the page.
                    </div>
                  ) : rawItemsData.length === 0 ? (
                    <div className="text-gray-400 text-center p-4 flex flex-col items-center space-y-2">
                      {needsManualRetry ? (
                        <>
                          <AlertCircle className="h-8 w-8 text-amber-500" />
                          <span>Failed to fetch items after multiple attempts.</span>
                          <Button 
                            onClick={() => {
                              resetRetryCount();
                              mutate();
                            }}
                            variant="outline"
                            className="mt-2"
                          >
                            Try Again
                          </Button>
                        </>
                      ) : (
                        <>
                          <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
                          <span>Fetching items, please wait...</span>
                        </>
                      )}
                    </div>
                  ) : (
                    selectedItems.map((item, index) => (
                      <div
                        key={`selector-${index}`}
                        className={`animate-fade-in transition-all duration-200 ${
                          loadingSlots[index] ? "opacity-50" : ""
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <React.Fragment>
                          <Suspense fallback={<div>Loading...</div>}>
                            <DynamicItemSelector
                              items={items}
                              selectedItem={item}
                              onSelect={(selectedItem, overriddenPrice) =>
                                updateSelectedItem(
                                  selectedItem,
                                  index,
                                  overriddenPrice
                                )
                              }
                              onCopy={() => handleCopyToClipboard(index)}
                              onPin={() => handlePinItem(index)}
                              isPinned={pinnedItems[index]}
                              overriddenPrice={
                                item ? overriddenPrices[item.id] : undefined
                              }
                              isAutoPickActive={hasAutoSelected}
                              overriddenPrices={overriddenPrices}
                              isExcluded={
                                item ? excludedItems.has(item.name) : false
                              }
                              onToggleExclude={() =>
                                item && toggleExcludedItem(item.name)
                              }
                              excludedItems={excludedItems}
                              fleaPriceType={fleaPriceType}
                            />
                          </Suspense>
                        </React.Fragment>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Preview Button */}
              <TooltipProvider>
                <div className="flex space-x-2 mt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        className="rounded bg-green-700 hover:bg-green-600 text-white w-1/4"
                        onClick={() => setPreviewModalOpen(true)}
                      >
                        Preview
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Show visual grid preview</TooltipContent>
                  </Tooltip>
                  {/* Clear Selected Items Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id="clear-item-fields"
                        className={`bg-red-500 hover:bg-red-600 text-white w-2/4 rounded
                          transition-all duration-300 active:scale-95
                          ${
                            isClearButtonDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        onClick={clearItemFields}
                        disabled={isClearButtonDisabled}
                      >
                        <span className="hidden sm:inline">
                          Clear Selected Items
                        </span>
                        <span className="sm:hidden">Clear Selected</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clears ALL item fields</TooltipContent>
                  </Tooltip>
                  {/* Reset Overrides Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id="reset-overrides"
                        className={`bg-red-500 hover:bg-red-600 text-white w-1/4 rounded
                          transition-all duration-300 active:scale-95
                          ${
                            isResetOverridesButtonDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        onClick={resetOverridesAndExclusions}
                        disabled={isResetOverridesButtonDisabled}
                      >
                        <span className="hidden sm:inline">
                          Reset Overrides
                        </span>
                        <span className="sm:hidden">Reset</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Reset overrides and exclusions
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              {/* Status text with improved styling */}
              <div className="text-center text-sm text-gray-400 mt-4 p-2 rounded-md bg-gray-700/30">
                <span className="font-medium">
                  {Object.keys(overriddenPrices).length}
                </span>{" "}
                overrides and{" "}
                <span className="font-medium">{excludedItems.size}</span>{" "}
                exclusions currently active
              </div>

              {/* Sacrifice Value Display with improved animation */}
              <div id="sacrifice-value" className="mt-6 text-center w-full">
                <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-white to-gray-100 animate-gradient">
                  Sacrifice BaseValue Total
                </h2>
                {loading ? (
                  <Skeleton className="h-16 w-3/4 mx-auto" />
                ) : (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="text-5xl font-extrabold text-green-500">
                        ₽{total.toLocaleString()}
                      </div>
                      {itemBonus > 0 && (
                        <div className="text-sm text-gray-400 mt-1">
                          (Base: ₽{Math.round(total / (1 + itemBonus / 100)).toLocaleString()} + {itemBonus}% bonus)
                        </div>
                      )}
                    </div>
                    {!isThresholdMet && (
                      <div className="text-red-500 mt-2 text-lg">
                        ₽{(threshold - total).toLocaleString()} needed to meet threshold
                      </div>
                    )}
                  </>
                )}
                <div className="mt-1">
                  <div className="text-sm font-semibold text-gray-400">
                    Total flea Cost ≈{" "}
                    <span
                      className={
                        Object.keys(overriddenPrices).length > 0
                          ? "font-bold"
                          : ""
                      }
                    >
                      ₽{totalFleaCost?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <Separator className="my-1" />
              {/* **11. Footer with Credits and Links** */}
              <footer className="mt-4 text-center text-gray-400 text-sm w-full">
                <div className="text-center mt-1">
                  Prices provided by{" "}
                  <a
                    href="https://tarkov.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Tarkov.dev
                  </a>
                </div>
                <div className="text-center mt-1">
                  Research provided by{" "}
                  <a
                    href="https://bio.link/verybadscav"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    VeryBadSCAV
                  </a>
                </div>
                <div className="text-center mt-1">
                  {/* maker with cool icons */}
                  Made by Wilsman77
                </div>
                <div className="flex justify-center mt-4 space-x-4">
                  <a
                    href="https://www.buymeacoffee.com/wilsman77"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
                      alt="Buy Me A Coffee"
                      width={120}
                      height={34}
                      priority={true}
                      className="w-[180px] h-[36px] sm:h-auto sm:w-auto"
                    />
                  </a>
                  <Button
                    onClick={() => setIsFeedbackFormVisible(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded shadow-md transition duration-300 ease-in-out"
                  >
                    Feedback
                  </Button>
                </div>
              </footer>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="background-credit">Background by Zombiee</div>

      {isFeedbackFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <FeedbackForm onClose={() => setIsFeedbackFormVisible(false)} />
        </div>
      )}

      {isSettingsPaneVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <SettingsPane
            isOpen={isSettingsPaneVisible}
            onClose={() => setIsSettingsPaneVisible(false)}
            onHardReset={handleReset}
            onClearLocalStorage={() => {
              // Clear localStorage
              localStorage.clear();

              // Reset all state to defaults
              setSelectedItems(Array(5).fill(null));
              setPinnedItems(Array(5).fill(false));
              setExcludedCategories(DEFAULT_EXCLUDED_CATEGORIES);
              setSortOption("az");
              setThreshold(400000);
              setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
              setOverriddenPrices({});

              toast({
                title: "Data Cleared",
                description:
                  "All data has been cleared. The app has been reset to its initial state.",
              });
            }}
            onExportData={() => {
              const data = {
                selectedItems,
                pinnedItems,
                sortOption,
                excludedCategories: Array.from(excludedCategories),
                excludeIncompatible,
                excludedItems: Array.from(excludedItems),
                fleaPriceType,
                useLastOfferCountFilter,
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "cultist-circle-settings.json";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            onImportData={(data) => {
              try {
                const parsed = JSON.parse(data);
                if (parsed.selectedItems)
                  setSelectedItems(parsed.selectedItems);
                if (parsed.pinnedItems) setPinnedItems(parsed.pinnedItems);
                if (parsed.sortOption) setSortOption(parsed.sortOption);
                if (parsed.excludedCategories)
                  setExcludedCategories(new Set(parsed.excludedCategories));
                if (parsed.excludeIncompatible !== undefined)
                  setExcludeIncompatible(parsed.excludeIncompatible);
                if (parsed.excludedItems)
                  setExcludedItems(new Set(parsed.excludedItems));
                if (parsed.fleaPriceType)
                  setFleaPriceType(parsed.fleaPriceType);
                if (parsed.useLastOfferCountFilter !== undefined)
                  setUseLastOfferCountFilter(parsed.useLastOfferCountFilter);
              } catch (e) {
                console.error("Failed to parse imported data:", e);
              }
            }}
            onSortChange={handleSortChange}
            currentSortOption={sortOption}
            fleaPriceType={fleaPriceType}
            onFleaPriceTypeChange={handleFleaPriceTypeChange}
            excludedCategories={Array.from(excludedCategories)}
            onCategoryChange={handleCategoryChange}
            allCategories={ALL_ITEM_CATEGORIES}
            excludeIncompatible={excludeIncompatible}
            onExcludeIncompatibleChange={setExcludeIncompatible}
            excludedItems={excludedItems}
            onExcludedItemsChange={setExcludedItems}
            useLastOfferCountFilter={useLastOfferCountFilter}
            onUseLastOfferCountFilterChange={
              handleUseLastOfferCountFilterChange
            }
          />
        </div>
      )}
    </>
  );
}

export default AppContent;

export function App() {
  return <AppContent />;
}
