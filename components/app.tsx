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
import SettingsPane from "@/components/settings-pane";
import { ThresholdHelperPopup } from "@/components/ThresholdHelperPopup";
import { InstructionsDialog } from "@/components/InstructionsDialog";
import { ModeToggle } from "@/components/ModeToggle";
import { ThresholdSelectorWithHelper } from "@/components/ThresholdSelectorWithHelper";
import { AutoSelectButton } from "@/components/AutoSelectButton";
import { VersionInfo } from "@/components/version-info";
import {
  ALL_ITEM_CATEGORIES,
  DEFAULT_EXCLUDED_CATEGORIES,
} from "@/config/item-categories";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import Cookies from "js-cookie";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { resetUserData } from "@/utils/resetUserData";
import { FeedbackForm } from "./feedback-form";
import Link from "next/link";
import { useItemsData } from "@/hooks/use-items-data";

const CURRENT_VERSION = "1.0.6.1"; //* Increment this when you want to trigger a cache clear
const OVERRIDDEN_PRICES_KEY = "overriddenPrices";

const DynamicItemSelector = dynamic(() => import("@/components/ItemSelector"), {
  ssr: false,
});

function AppContent() {
  // Define state variables and hooks
  const [isPVE, setIsPVE] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<
    Array<SimplifiedItem | null>
  >(Array(5).fill(null));
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isFeedbackFormVisible, setIsFeedbackFormVisible] =
    useState<boolean>(false);
  const [pinnedItems, setPinnedItems] = useState<boolean[]>(
    Array(5).fill(false)
  );
  const [isSettingsPaneVisible, setIsSettingsPaneVisible] =
    useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>("az");
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(
    new Set()
  );
  const [threshold, setThreshold] = useState<number>(400000);
  const [excludeIncompatible, setExcludeIncompatible] = useState<boolean>(true);
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set());
  const [overriddenPrices, setOverriddenPrices] = useState<
    Record<string, number>
  >({});
  const [hasAutoSelected, setHasAutoSelected] = useState<boolean>(false);

  // Import hooks
  const { toast } = useToast();
  const toastShownRef = useRef<boolean>(false);

  // Use the items data hook
  const { data: rawItemsData, error, mutate } = useItemsData(isPVE);

  const loading = !rawItemsData && !error;

  // Initialize client-side state
  useEffect(() => {
    // Load sort option
    const savedSort = localStorage.getItem("sortOption");
    if (savedSort) setSortOption(savedSort);

    // Load excluded categories
    try {
      const saved = localStorage.getItem("excludedCategories");
      if (saved) {
        const parsedCategories = JSON.parse(saved);
        if (Array.isArray(parsedCategories)) {
          console.log("Loading saved categories:", parsedCategories);
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
  }, []);

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
        console.log(
          "Saved categories to localStorage via effect:",
          Array.from(excludedCategories)
        );
      } catch (e) {
        console.error("Error saving excludedCategories to localStorage", e);
      }
    }
  }, [excludedCategories]);

  // Save threshold to cookies
  useEffect(() => {
    Cookies.set("userThreshold", threshold.toString(), { expires: 365 });
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
  const handleReset = async () => {
    await resetUserData(
      setSelectedItems,
      setPinnedItems,
      setExcludedCategories,
      setSortOption,
      setThreshold,
      setExcludedItems,
      setOverriddenPrices,
      async () => {
        await mutate();
        return;
      },
      DEFAULT_EXCLUDED_CATEGORIES,
      toast
    );
  };

  // Handler for threshold changes
  const handleThresholdChange = (newValue: number) => {
    setThreshold(newValue);
    Cookies.set("userThreshold", newValue.toString(), { expires: 365 });
    toastShownRef.current = false; // Reset toast shown flag when threshold changes
  };

  // Memoized computation of items based on categories, sort option, and excluded items
  const items: SimplifiedItem[] = useMemo(() => {
    if (!rawItemsData || !Array.isArray(rawItemsData)) return [];

    // First filter by excluded categories
    const categoryFiltered = rawItemsData.filter(
      (item: SimplifiedItem) =>
        !item.tags?.some((tag: string) => excludedCategories.has(tag))
    );

    // Then filter out individually excluded items
    const excludedFiltered = excludeIncompatible
      ? categoryFiltered.filter(
          (item: SimplifiedItem) => !excludedItems.has(item.name)
        )
      : categoryFiltered;

    // Sorting logic...
    const sortedItems = [...excludedFiltered];
    if (sortOption === "az") {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "base-value") {
      sortedItems.sort((a, b) => a.basePrice - b.price);
    } else if (sortOption === "ratio") {
      sortedItems.sort((a, b) => b.basePrice / b.price - a.basePrice / b.price);
    }

    return sortedItems;
  }, [
    rawItemsData,
    sortOption,
    excludedCategories,
    excludeIncompatible,
    excludedItems,
  ]);

  // Update items when mode or excluded items change
  useEffect(() => {
    mutate();
  }, [isPVE, excludedItems, excludeIncompatible, mutate]);

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
              [item.uid]: overriddenPrice,
            }));
          } else {
            setOverriddenPrices((prev) => {
              const newOverriddenPrices = { ...prev };
              delete newOverriddenPrices[item.uid];
              return newOverriddenPrices;
            });
          }
        } else if (!item) {
          setOverriddenPrices((prev) => {
            const newOverriddenPrices = { ...prev };
            const uid = selectedItems[index]?.uid;
            if (uid) {
              delete newOverriddenPrices[uid];
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

  useEffect(() => {
    const storedVersion = localStorage.getItem("appVersion");
    if (storedVersion !== CURRENT_VERSION) {
      handleReset(); // TODO: CHECK THIS WORKS
      localStorage.setItem("appVersion", CURRENT_VERSION);
    }
  }, []);

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

  // Update the refresh button UI
  return (
    <>
      <div className="min-h-screen bg-my_bg_image bg-no-repeat bg-cover bg-fixed text-gray-100 p-4 overflow-auto">
        <div className="min-h-screen flex items-center justify-center">
          <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700 shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto transition-all duration-300 hover:shadow-xl">
            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 right-0 flex w-full bg-gray-900/80 rounded-t-lg">
              <div className="flex w-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InstructionsDialog />
                    </TooltipTrigger>
                    <TooltipContent>Help & Instructions</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex-1 hover:bg-gray-700/50 rounded-none border-r border-gray-700"
                        asChild
                      >
                        <Link href="/recipes">
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
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            Recipes
                          </span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View barter recipes</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex-1 hover:bg-gray-700/50 rounded-none rounded-tr-lg"
                        onClick={() => setIsSettingsPaneVisible(true)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configure app settings</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Title and Version Info */}
            <div className="pt-14 sm:pt-14">
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

            <CardContent className="p-6">
              {/* Mode Toggle with improved animation */}
              <div className="transition-all duration-300 transform hover:scale-[1.02]">
                <ModeToggle isPVE={isPVE} onToggle={handleModeToggle} />
              </div>

              {/* Threshold selector with improved visual feedback */}
              <div className="mt-4 transition-all duration-300 transform hover:scale-[1.02]">
                <ThresholdSelectorWithHelper
                  threshold={threshold}
                  onThresholdChange={handleThresholdChange}
                  onHelperOpen={() => setIsThresholdHelperOpen(true)}
                />
              </div>

              {/* Auto select button with loading animation */}
              <div className="mt-4 transition-all duration-300 transform hover:scale-[1.02]">
                <AutoSelectButton
                  isCalculating={isCalculating}
                  hasAutoSelected={hasAutoSelected}
                  handleAutoPick={handleAutoPick}
                />
              </div>

              {/* Item Selection Components with improved loading states */}
              <div className="space-y-2 w-full mt-4">
                <div id="search-items">
                  {loading ? (
                    <div className="space-y-2">
                      {Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <div
                            key={`skeleton-${index}`}
                            className="animate-pulse"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <Skeleton className="h-10 w-full mb-2 bg-gray-700/50" />
                          </div>
                        ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center text-gray-400 mt-4 p-4 border-2 border-dashed border-gray-600 rounded-lg">
                      <p className="mb-2">No items available at this time.</p>
                      <p className="text-sm">
                        If you think this may be an issue, please try resetting
                        the app in the settings.
                      </p>
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
                            <div
                              className={`relative ${
                                pinnedItems[index]
                                  ? "border-2 border-yellow-500 dark:border-yellow-600 rounded-lg p-1"
                                  : ""
                              }`}
                            >
                              {pinnedItems[index] && (
                                <div className="absolute -top-2 -right-2 z-10">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="w-4 h-4 bg-yellow-500 dark:bg-yellow-600 rounded-full" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>This item is pinned</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
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
                                isAutoPickActive={hasAutoSelected}
                                overriddenPrices={overriddenPrices}
                                isExcluded={excludedItems.has(item?.uid || "")}
                                onToggleExclude={() =>
                                  item && toggleExcludedItem(item.uid)
                                }
                                excludedItems={excludedItems}
                              />
                            </div>
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
                        className={`bg-red-500 hover:bg-red-600 text-white w-1/2 
                          transition-all duration-300 transform hover:scale-[1.02] active:scale-95
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        id="reset-overrides"
                        className={`bg-red-500 hover:bg-red-600 text-white w-1/2
                          transition-all duration-300 transform hover:scale-[1.02] active:scale-95
                          ${
                            isResetOverridesButtonDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
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
                  <div
                    className={`text-6xl font-extrabold ${
                      isThresholdMet
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
            onSettingsReset={() => {
              setSelectedItems(Array(5).fill(null));
              setPinnedItems(Array(5).fill(false));
              setExcludedCategories(DEFAULT_EXCLUDED_CATEGORIES);
              setSortOption("az");
              setThreshold(400000);
              setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
              setOverriddenPrices({});
              setHasAutoSelected(false);

              toast({
                title: "Reset Complete",
                description:
                  "All settings have been reset to their default values.",
              });
            }}
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
              setHasAutoSelected(false);

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
              } catch (e) {
                console.error("Failed to parse imported data:", e);
              }
            }}
            onSortChange={handleSortChange}
            currentSortOption={sortOption}
            excludedCategories={Array.from(excludedCategories)}
            onCategoryChange={handleCategoryChange}
            allCategories={ALL_ITEM_CATEGORIES}
            excludeIncompatible={excludeIncompatible}
            onExcludeIncompatibleChange={setExcludeIncompatible}
            excludedItems={excludedItems}
            onExcludedItemsChange={setExcludedItems}
          />
        </div>
      )}

      {isThresholdHelperOpen && (
        <ThresholdHelperPopup
          isOpen={isThresholdHelperOpen}
          onClose={() => setIsThresholdHelperOpen(false)}
          onSetThreshold={handleThresholdChange}
        />
      )}
    </>
  );
}

export function App() {
  return <AppContent />;
}
