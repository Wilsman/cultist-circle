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
import useSWR from "swr";
import Image from "next/image";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import ItemSocket from "@/components/item-socket";
import { SettingsPane } from "@/components/settings-pane";
import { ThresholdHelperPopup } from "@/components/ThresholdHelperPopup";
import { InstructionsDialog } from "@/components/InstructionsDialog";
import { ModeToggle } from "@/components/ModeToggle";
import { ThresholdSelectorWithHelper } from "@/components/ThresholdSelectorWithHelper";
import { AutoSelectButton } from "@/components/AutoSelectButton";
import CookieConsent from "@/components/CookieConsent";
import { VersionInfo } from "@/components/version-info";
import { ALL_ITEM_CATEGORIES, DEFAULT_ITEM_CATEGORIES } from "@/config/item-categories";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import Cookies from "js-cookie";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { resetUserData } from "@/utils/resetUserData";
import ErrorBoundary from "./ErrorBoundary";
import { FeedbackForm } from "./feedback-form";
import type { SWRConfiguration, RevalidatorOptions, Revalidator } from "swr";

const AdBanner = dynamic(() => import("@/components/AdBanner"), {
  ssr: false,
});

const CURRENT_VERSION = "1.0.5"; //* Increment this when you want to trigger a cache clear
const OVERRIDDEN_PRICES_KEY = "overriddenPrices"; // Add this line
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const ITEMS_CACHE_KEY = "itemsCache";

// Cache structure type
type ItemsCache = {
  timestamp: number;
  version: string;
  mode: string;
  data: SimplifiedItem[];
};
const DynamicItemSelector = dynamic(() => import("@/components/ItemSelector"), {
  ssr: false,
});
// Update the SWR configuration object
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: CACHE_DURATION,
  onErrorRetry: (
    error: unknown,
    key: string,
    config: Readonly<SWRConfiguration>,
    revalidate: Revalidator,
    revalidateOpts: Required<RevalidatorOptions>
  ) => {
    const { retryCount } = revalidateOpts;

    function hasStatusCode(err: unknown): err is { status: number } {
      return typeof err === "object" && err !== null && "status" in err;
    }

    if (retryCount >= 3 || (hasStatusCode(error) && error.status === 404))
      return;

    setTimeout(() => revalidate(), 5000);
  },
};

function AppContent() {
  // Mode state
  const [isPVE, setIsPVE] = useState<boolean>(false);

  // Selected items state
  const [selectedItems, setSelectedItems] = useState<Array<SimplifiedItem | null>>(
    Array(5).fill(null)
  );

  // Settings and UI states
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isFeedbackFormVisible, setIsFeedbackFormVisible] =
    useState<boolean>(false);
  const [pinnedItems, setPinnedItems] = useState<boolean[]>(Array(5).fill(false));
  const [isSettingsPaneVisible, setIsSettingsPaneVisible] =
    useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>("az");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_ITEM_CATEGORIES);
  const [threshold, setThreshold] = useState<number>(400000);
  const [excludeIncompatible, setExcludeIncompatible] = useState<boolean>(true);
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set(DEFAULT_EXCLUDED_ITEMS));
  const [overriddenPrices, setOverriddenPrices] = useState<Record<string, number>>({});

  // Initialize client-side state
  useEffect(() => {
    // Load sort option
    const savedSort = localStorage.getItem("sortOption");
    if (savedSort) setSortOption(savedSort);

    // Load selected categories
    try {
      const savedCategories = localStorage.getItem("selectedCategories");
      if (savedCategories) {
        setSelectedCategories(JSON.parse(savedCategories));
      }
    } catch (e) {
      console.error("Error parsing selectedCategories from localStorage", e);
    }

    // Load threshold
    const savedThreshold = Cookies.get("userThreshold");
    if (savedThreshold) {
      setThreshold(Number(savedThreshold));
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

    // Load excluded items, merging with defaults if none saved
    try {
      const saved = localStorage.getItem("excludedItems");
      if (saved) {
        const savedItems = new Set<string>(JSON.parse(saved) as string[]);
        // Merge with defaults to ensure defaults are always included
        Array.from(DEFAULT_EXCLUDED_ITEMS).forEach(item => savedItems.add(item));
        setExcludedItems(savedItems);
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
  }, []);

  // Save sort option to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sortOption", sortOption);
    }
  }, [sortOption]);

  // Save selected categories to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCategories", JSON.stringify(selectedCategories));
    }
  }, [selectedCategories]);

  // Save threshold to cookies
  useEffect(() => {
    Cookies.set("userThreshold", threshold.toString(), { expires: 365 });
  }, [threshold]);

  // Save excludeIncompatible to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("excludeIncompatible", JSON.stringify(excludeIncompatible));
    }
  }, [excludeIncompatible]);

  // Save excludedItems to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("excludedItems", JSON.stringify(Array.from(excludedItems)));
    }
  }, [excludedItems]);

  // Save overriddenPrices to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(OVERRIDDEN_PRICES_KEY, JSON.stringify(overriddenPrices));
      } catch (e) {
        console.error("Error saving overriddenPrices to localStorage", e);
      }
    }
  }, [overriddenPrices]);

  // Define the hasAutoSelected state variable
  const [hasAutoSelected, setHasAutoSelected] = useState<boolean>(false);

  // Handler for category changes
  const handleCategoryChange = useCallback((categories: string[]) => {
    setSelectedCategories(categories);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCategories", JSON.stringify(categories));
    }
  }, []);

  // Sort option handler
  const handleSortChange = useCallback((newSortOption: string) => {
    setSortOption(newSortOption);
    if (typeof window !== "undefined") {
      localStorage.setItem("sortOption", newSortOption);
    }
  }, []);

  // Handler to toggle excluded items
  const toggleExcludedItem = (uid: string) => {
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
  };

  // Reset overrides and exclusions
  const resetOverridesAndExclusions = () => {
    const clearedOverridesCount = Object.keys(overriddenPrices).length;
    const clearedExcludedItemsCount = excludedItems.size;

    setOverriddenPrices({});
    setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
    setHasAutoSelected(false); // Reset Auto Select button
    toastShownRef.current = false; // Reset toast shown flag when resetting

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(OVERRIDDEN_PRICES_KEY);
      } catch (e) {
        console.error("Error removing overriddenPrices from localStorage", e);
      }
    }

    toast({
      title: "Reset Successful",
      description: `${clearedOverridesCount} overrides and ${clearedExcludedItemsCount} excluded items have been cleared.`,
    });
  };

  // Calls resetOverridesAndExclusions and also clears the users cookies and local storage
  const handleResetUserData = async () => {
    await resetUserData(
      setSelectedItems,
      setPinnedItems,
      setSelectedCategories,
      setSortOption,
      setThreshold,
      setExcludedItems,
      setOverriddenPrices,
      async () => {
        await mutate();
        return;
      },
      DEFAULT_ITEM_CATEGORIES,
      toast
    );
  };

  // Handler for threshold changes
  const handleThresholdChange = (newValue: number) => {
    setThreshold(newValue);
    Cookies.set("userThreshold", newValue.toString(), { expires: 365 });
    toastShownRef.current = false; // Reset toast shown flag when threshold changes
  };

  const fetcher = async (url: string) => {
    const mode = url.includes("pve") ? "pve" : "pvp";

    // Try to get data from localStorage first
    try {
      const cached = localStorage.getItem(ITEMS_CACHE_KEY);
      if (cached) {
        const cacheData = JSON.parse(cached) as ItemsCache;
        const now = Date.now();

        // Check if cache is still valid (not expired, same version and mode)
        if (
          now - cacheData.timestamp < CACHE_DURATION &&
          cacheData.version === CURRENT_VERSION &&
          cacheData.mode === mode
        ) {
          console.log("Using cached items data");
          return cacheData.data;
        }
      }
    } catch (e) {
      console.error("Error reading from cache:", e);
    }

    // If no valid cache, fetch from API
    console.log("Fetching fresh items data");
    const res = await fetch(`/api/v2/items?mode=${mode}`);
    if (!res.ok) throw new Error(`Failed to fetch data for ${url}`);
    const result = await res.json();

    // Update cache
    try {
      const cacheData: ItemsCache = {
        timestamp: Date.now(),
        version: CURRENT_VERSION,
        mode: mode,
        data: result.data
      };
      localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error("Error updating cache:", e);
    }

    return result.data;
  };

  // Fetch data based on mode (PVE/PVP)
  const apiUrl = isPVE
    ? `/api/v2/items?mode=pve&v=${CURRENT_VERSION}`
    : `/api/v2/items?mode=pvp&v=${CURRENT_VERSION}`;

  const {
    data: rawItemsData,
    error,
    mutate,
  } = useSWR<SimplifiedItem[]>(apiUrl, fetcher, {
    ...SWR_CONFIG,
    revalidateOnMount: false, // Don't revalidate on mount since we handle that in fetcher
    dedupingInterval: CACHE_DURATION
  } as SWRConfiguration);

  const loading = !rawItemsData && !error;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        mutate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mutate]);

  // Memoized computation of items based on categories, sort option, and excluded items
  const items: SimplifiedItem[] = useMemo(() => {
    if (!rawItemsData || !Array.isArray(rawItemsData)) return [];

    // First filter by excluded items if enabled
    const excludedFiltered = excludeIncompatible
      ? rawItemsData.filter((item: SimplifiedItem) => !excludedItems.has(item.name))
      : rawItemsData;

    // Then filter by categories
    const filteredItems = excludedFiltered.filter(
      (item: SimplifiedItem) =>
        selectedCategories.length === 0 ||
        (Array.isArray(item.tags)
          ? item.tags.some((tag: string) => selectedCategories.includes(tag))
          : selectedCategories.includes(item.tags || ""))
    );

    // Sorting logic...
    const sortedItems = [...filteredItems];
    if (sortOption === "az") {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "base-value") {
      sortedItems.sort((a, b) => a.basePrice - b.price);
    } else if (sortOption === "ratio") {
      sortedItems.sort((a, b) => b.basePrice / b.price - a.basePrice / b.price);
    }

    return sortedItems;
  }, [rawItemsData, sortOption, selectedCategories, excludeIncompatible, excludedItems]);

  // Only update items when mode changes
  useEffect(() => {
    mutate();
  }, [isPVE]);

  // Function to find the best combination of items
  const findBestCombination = useCallback(
    (
      validItems: SimplifiedItem[],
      threshold: number,
      maxItems: number
    ): { selected: SimplifiedItem[]; totalFleaCost: number } => {
      const maxThreshold = threshold + 5000;
      const dp: Array<Array<number>> = Array(maxItems + 1)
        .fill(null)
        .map(() => Array(maxThreshold + 1).fill(Infinity));
      const itemTracking: Array<Array<Array<number>>> = Array(maxItems + 1)
        .fill(null)
        .map(() =>
          Array(maxThreshold + 1)
            .fill(null)
            .map(() => [])
        );

      dp[0][0] = 0;

      for (let c = 1; c <= maxItems; c++) {
        for (let i = 0; i < validItems.length; i++) {
          const { basePrice, price } = validItems[i];
          for (let v = basePrice; v <= maxThreshold; v++) {
            if (dp[c - 1][v - basePrice] + price < dp[c][v]) {
              dp[c][v] = dp[c - 1][v - basePrice] + price;
              itemTracking[c][v] = [...itemTracking[c - 1][v - basePrice], i];
            }
          }
        }
      }

      const validCombinations: { c: number; v: number; cost: number }[] = [];
      for (let c = 1; c <= maxItems; c++) {
        for (let v = threshold; v <= maxThreshold; v++) {
          if (dp[c][v] !== Infinity) {
            validCombinations.push({ c, v, cost: dp[c][v] });
          }
        }
      }

      // Sort by cost and then randomly select one of the top 5 combinations
      validCombinations.sort((a, b) => a.cost - b.cost);
      const topCombinations = validCombinations.slice(
        0,
        Math.min(5, validCombinations.length)
      );
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
    },
    []
  );

  // Memoized total and flea costs
  const total = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item?.basePrice || 0), 0);
  }, [selectedItems]);

  const fleaCosts = useMemo(() => {
    return selectedItems.map((item) =>
      item ? overriddenPrices[item.uid] || item.price : 0
    );
  }, [selectedItems, overriddenPrices]);

  // Memoized total flea cost
  const totalFleaCost = useMemo(() => {
    return fleaCosts.reduce((sum, cost) => sum + cost, 0);
  }, [fleaCosts]);

  const isThresholdMet: boolean = total >= threshold;

  // Handler to update selected item
  const updateSelectedItem = (
    item: SimplifiedItem | null,
    index: number,
    overriddenPrice?: number | null
  ): void => {
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = item;
    setSelectedItems(newSelectedItems);

    setHasAutoSelected(false); // Reset Auto Select when user changes selection

    if (item && overriddenPrice !== undefined) {
      if (overriddenPrice !== null) {
        // Update overridden price
        setOverriddenPrices((prev) => ({
          ...prev,
          [item.uid]: overriddenPrice,
        }));
      } else {
        // Remove overridden price for this item
        setOverriddenPrices((prev) => {
          const newOverriddenPrices = { ...prev };
          delete newOverriddenPrices[item.uid];
          return newOverriddenPrices;
        });
      }
    } else if (!item) {
      // Item is null, remove any overridden price for previous item at this index
      const newOverriddenPrices = { ...overriddenPrices };
      const uid = selectedItems[index]?.uid;
      if (uid) {
        delete newOverriddenPrices[uid];
      }
      setOverriddenPrices(newOverriddenPrices);
    }
    // Do not delete overridden price if overriddenPrice is undefined
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
      // Filter validItems based on heuristics
      let validItems: SimplifiedItem[] = items.filter((item) => item.price > 0);

      // Apply filtering heuristics
      validItems = validItems
        .filter((item) => item.basePrice >= threshold * 0.1) // Only items contributing at least 10% to the threshold
        .filter((item) => !item.bannedOnFlea) // Filter out items that are banned on the flea market
        .filter((item) => !excludedItems.has(item.uid)) // Exclude user-excluded items
        .sort((a, b) => b.basePrice / b.price - a.basePrice / b.price) // Sort by value-to-cost ratio
        .slice(0, 100); // Limit to top 100 items

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pinnedTotal = selectedItems.reduce(
        (sum, item, index) =>
          sum + (pinnedItems[index] && item ? item.basePrice : 0),
        0
      );

      const remainingThreshold = Math.max(0, threshold - pinnedTotal);

      const filteredItems = validItems.filter(
        (item) =>
          !selectedItems.some(
            (selected, index) =>
              pinnedItems[index] && selected?.uid === item.uid
          )
      );

      // Adjust prices in filteredItems to use overridden prices where applicable
      const adjustedItems = filteredItems.map((item) => {
        const overriddenPrice = overriddenPrices[item.uid];
        if (overriddenPrice !== undefined) {
          return { ...item, price: overriddenPrice };
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
        if (item && overriddenPrices[item.uid]) {
          newOverriddenPrices[item.uid] = overriddenPrices[item.uid];
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
  ]);

  // Handler for mode toggle (PVE/PVP)
  const handleModeToggle = (checked: boolean): void => {
    setIsPVE(checked);
    setSelectedItems(Array(5).fill(null));
    setPinnedItems(Array(5).fill(false));
    setOverriddenPrices({});
    setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
    setHasAutoSelected(false);
    toastShownRef.current = false;
  };

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

  // Import the useToast hook
  const { toast } = useToast();

  // Ref to track if toast has been shown
  const toastShownRef = useRef<boolean>(false);

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

  // useEffect(() => {
  //   const storedVersion = localStorage.getItem("appVersion");
  //   if (storedVersion !== CURRENT_VERSION) {
  //     clearUserData();
  //     localStorage.setItem("appVersion", CURRENT_VERSION);
  //   }
  // }, []);

  const [isThresholdHelperOpen, setIsThresholdHelperOpen] = useState(false);

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
      Object.keys(overriddenPrices).length === 0 && excludedItems.size === Array.from(DEFAULT_EXCLUDED_ITEMS).length
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

  // Update the refresh button UI
  return (
    <>
      <div className="min-h-screen bg-my_bg_image bg-no-repeat bg-cover bg-fixed text-gray-100 p-4 overflow-auto">
        <div className="min-h-screen flex items-center justify-center">
          <Card className="bg-gray-800 border-gray-700 shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto bg-opacity-50">
            {/* Render the TourOverlay component */}
            {/* {!loading && <TourOverlay />} */}{" "}
            {/*! Removed the intro Tour */}
            {/* Title and Version Info */}
            <div className="pt-8 sm:pt-4">
              {" "}
              {/* Add padding-top on mobile */}
              <h1 className="sm:text-3xl text-xl font-bold mb-4 text-center text-red-500 text-nowrap flex items-center justify-center w-full">
                <Image
                  src="/images/Cultist-Calulator.webp"
                  alt="Cultist calculator logo"
                  width={400}
                  height={128}
                  priority
                  className="hover:scale-105 transition-transform duration-300"
                />
              </h1>
            </div>
            <div className="text-center text-gray-400 text-sm mb-1">
              <VersionInfo version={CURRENT_VERSION} />
            </div>
            {/* Help icon */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex flex-col items-center justify-center hover:scale-115 transition-transform duration-300">
              <InstructionsDialog />
            </div>
            {/* Settings icon */}
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col items-center justify-center">
              <Settings
                id="settings"
                className="h-6 w-6 sm:h-8 sm:w-8 hover:text-green-300 text-yellow-500 cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => setIsSettingsPaneVisible(true)}
              />
              <div className="text-yellow-500 text-xs text-center mt-1">
                Settings
              </div>
            </div>
            <CardContent className="p-6">
              {/* Replace the old Mode Toggle with the new ModeToggle component */}
              <ModeToggle isPVE={isPVE} onToggle={handleModeToggle} />

              {/* Replace the old Threshold Selector with the new ThresholdSelectorWithHelper component */}
              <ThresholdSelectorWithHelper
                threshold={threshold}
                onThresholdChange={handleThresholdChange}
                onHelperOpen={() => setIsThresholdHelperOpen(true)}
              />

              {/* Replace the old Auto Select / Reroll button with the new AutoSelectButton component */}
              <AutoSelectButton
                isCalculating={isCalculating}
                hasAutoSelected={hasAutoSelected}
                handleAutoPick={handleAutoPick}
              />

              {/* **9. Item Selection Components** */}
              <div className="space-y-2 w-full">
                <div id="search-items">
                  {" "}
                  {/* Added ID for TourOverlay */}
                  {loading ? (
                    // Show skeletons while loading
                    Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <Skeleton
                          key={`skeleton-${index}`}
                          className="h-10 w-full mb-2 bg-slate-500"
                        />
                      ))
                  ) : items.length === 0 ? (
                    // Display message if item list is empty
                    <div className="text-center text-gray-400 mt-4">
                      No items available at this time. If you think this may be
                      an issue, please try resetting the app in the settings.
                    </div>
                  ) : (
                    // Show actual item selectors when loaded and items are available
                    selectedItems.map((item, index) => (
                      <div
                        key={`selector-${index}`}
                        className="animate-fade-in"
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
                                item ? overriddenPrices[item.uid] : undefined
                              }
                              isAutoPickActive={hasAutoSelected} // Added prop
                              overriddenPrices={overriddenPrices} // Added prop
                              isExcluded={excludedItems.has(item?.uid || "")}
                              onToggleExclude={() =>
                                item && toggleExcludedItem(item.uid)
                              }
                              excludedItems={excludedItems} // Ensure this prop is passed
                            />
                          </Suspense>
                          {index < selectedItems.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </React.Fragment>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <TooltipProvider>
                <div className="flex space-x-2 mt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id="clear-item-fields"
                        className="bg-red-500 hover:bg-red-700 text-secondary hover:text-primary w-1/2 
                          transition-all duration-300 hover:scale-105 active:scale-95"
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id="reset-overrides"
                        className="bg-red-500 hover:bg-red-700 text-secondary hover:text-primary w-1/2"
                        onClick={resetOverridesAndExclusions}
                        disabled={isResetOverridesButtonDisabled}
                      >
                        Reset Overrides
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Reset overrides and exclusions
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </CardContent>
            {/* // simple text saying number overrides & exclusions */}
            <div className="text-center text-sm text-gray-400">
              {Object.keys(overriddenPrices).length} overrides and{" "}
              {excludedItems.size} exclusions currently active
            </div>
            {/* Item Socket Component */}
            <div className="mt-6">
              <ItemSocket />
            </div>
            {/* **10. Sacrifice Value Display** */}
            <div id="sacrifice-value" className="mt-6 text-center w-full">
              <h2
                className="text-3xl font-bold mb-2 text-gray-300 
                bg-gradient-to-r from-gray-300 via-white to-gray-300 
                bg-clip-text text-transparent 
                bg-[length:200%] 
                animate-shine"
              >
                Sacrifice BaseValue Total
              </h2>
              {loading ? (
                <Skeleton className="h-16 w-3/4 mx-auto" />
              ) : (
                <div
                  className={`text-6xl font-extrabold ${isThresholdMet
                    ? "text-green-500 animate-pulse"
                    : "text-red-500 animate-pulse"
                    }`}
                >
                  ₽{total.toLocaleString()}
                </div>
              )}
              {!isThresholdMet && (
                <div className="text-red-500 mt-2">
                  ₽{(threshold - total).toLocaleString()} Needed to meet
                  threshold
                </div>
              )}
              <div className="mt-6">
                <div className="text-sm font-semibold text-gray-400">
                  Total flea Cost ≈{" "}
                  <span
                    className={
                      Object.keys(overriddenPrices).length > 0
                        ? "font-bold"
                        : ""
                    }
                  >
                    ₽{totalFleaCost.toLocaleString()}
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
                Made by Wilsman77 🔥
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
                    style={{ height: "auto" }}
                  />
                </a>
                <Button
                  onClick={() => setIsFeedbackFormVisible(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Feedback
                </Button>
              </div>
              <div className="mt-4 w-full">
                <ErrorBoundary fallback={<div>Error loading ad.</div>}>
                  <AdBanner
                    dataAdFormat="auto"
                    dataFullWidthResponsive={true}
                    dataAdSlot="1022212363"
                  />
                </ErrorBoundary>
              </div>
            </footer>
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <SettingsPane
            onClose={() => setIsSettingsPaneVisible(false)}
            onSortChange={handleSortChange}
            currentSortOption={sortOption}
            selectedCategories={selectedCategories}
            onCategoryChange={handleCategoryChange}
            allCategories={ALL_ITEM_CATEGORIES}
            excludeIncompatible={excludeIncompatible}
            onExcludeIncompatibleChange={setExcludeIncompatible}
            onHardReset={handleResetUserData}
            excludedItems={excludedItems}
            onExcludedItemsChange={setExcludedItems}
          />
        </div>
      )}

      {/* Threshold Helper Popup */}
      <ThresholdHelperPopup
        isOpen={isThresholdHelperOpen}
        onClose={() => setIsThresholdHelperOpen(false)}
        onSetThreshold={handleThresholdChange}
      />

      {/* Add the CookieConsent component */}
      <CookieConsent variant="small" />
    </>
  );
}

export function App() {
  return <AppContent />;
}
