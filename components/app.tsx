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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SettingsPane from "@/components/settings-pane";
import { ModeThreshold } from "@/components/mode-threshold";
import { AutoSelectButton } from "@/components/AutoSelectButton";
import { VersionInfo } from "@/components/version-info";
import { ShareCodeDialog } from "@/components/share-code-component";
import {
  ALL_ITEM_CATEGORIES,
  DEFAULT_EXCLUDED_CATEGORY_IDS,
  CATEGORY_BY_ID,
  CATEGORY_ID_BY_NAME,
  type ItemCategory,
} from "@/config/item-categories";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { doItemsFitInBox } from "../lib/fit-items-in-box";
import {
  TraderLevels,
  DEFAULT_TRADER_LEVELS,
} from "@/components/ui/trader-level-selector";
import { PlacementPreviewModal } from "./placement-preview-modal";
import { PlacementPreviewInline } from "./placement-preview-inline";
import TopAlerts from "./top-alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { resetUserData } from "@/utils/resetUserData";
import { FeedbackForm } from "./feedback-form";
import { useItemsData } from "@/hooks/use-items-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast as sonnerToast } from "sonner";
import ThresholdProgress from "@/components/threshold-progress";
import NextItemHints from "@/components/next-item-hints";
import ShareCardButton from "@/components/share-card-button";
import { CURRENT_VERSION } from "@/config/changelog";
import { useToastNotifications } from "@/hooks/use-toast-notifications";

const OVERRIDDEN_PRICES_KEY = "overriddenPrices";
const FLEA_PRICE_TYPE_KEY = "fleaPriceType";
const USE_LAST_OFFER_COUNT_FILTER_KEY = "useLastOfferCountFilter";
const PRICE_MODE_KEY = "priceMode";
const TRADER_LEVELS_KEY = "traderLevels";

const DynamicItemSelector = dynamic(() => import("@/components/ItemSelector"), {
  ssr: false,
});

type FleaPriceType = "lastLowPrice" | "avg24hPrice";
type PriceMode = "flea" | "trader";

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
  const [priceMode, setPriceMode] = useState<PriceMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PRICE_MODE_KEY) as PriceMode | null;
      if (saved === "flea" || saved === "trader") return saved;
    }
    return "flea";
  });
  const [traderLevels, setTraderLevels] = useState<TraderLevels>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TRADER_LEVELS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<TraderLevels>;
          return { ...DEFAULT_TRADER_LEVELS, ...parsed } as TraderLevels;
        }
      } catch (e) {
        console.error("Failed to parse traderLevels from localStorage", e);
      }
    }
    return DEFAULT_TRADER_LEVELS;
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

  // Toast state
  const toastShownRef = useRef<boolean>(false);
  // One-time init guard for localStorage/state hydration
  const didInitStateRef = useRef<boolean>(false);

  // Use the items data hook
  const {
    data: rawItemsData,
    isLoading: loading,
    hasError,
    mutate,
    needsManualRetry,
    resetRetryCount
  } = useItemsData(isPVE);

  // Initialize toast notifications
  const { triggerNewNotifications } = useToastNotifications();

  // Check if onboarding is complete
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Monitor onboarding completion
  useEffect(() => {
    const checkOnboarding = () => {
      try {
        const seen = typeof window !== "undefined" &&
          window.localStorage.getItem("cc_onboarding_seen_v1");
        setOnboardingComplete(!!seen);
      } catch {
        // If storage fails, assume not complete for safety
        setOnboardingComplete(false);
      }
    };

    checkOnboarding();
    // Listen for changes (in case onboarding happens in another tab)
    const handleStorageChange = () => checkOnboarding();
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Build localized category list (ID -> localized name) from current items
  const allCategoriesLocalized: ItemCategory[] = useMemo(() => {
    if (!rawItemsData || rawItemsData.length === 0) return ALL_ITEM_CATEGORIES;
    const byId = new Map<string, string>();
    for (const item of rawItemsData) {
      const cats = item.categories_display ?? [];
      for (const c of cats) {
        const id = c.id ?? (c.name ? CATEGORY_ID_BY_NAME.get(c.name) ?? undefined : undefined);
        if (!id) continue;
        // Prefer first-seen localized name for this language
        if (!byId.has(id)) byId.set(id, c.name);
      }
    }
    if (byId.size === 0) return ALL_ITEM_CATEGORIES;
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawItemsData]);

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

  // Save priceMode to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(PRICE_MODE_KEY, priceMode);
    }
  }, [priceMode]);

  // Save traderLevels to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TRADER_LEVELS_KEY, JSON.stringify(traderLevels));
      } catch (e) {
        console.error("Failed to save traderLevels", e);
      }
    }
  }, [traderLevels]);

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
      sonnerToast("Error Loading Items", {
        description: "Failed to load items. Please refresh the page.",
      });
    }
  }, [hasError]);

  // Initialize client-side state (run once after data is available)
  useEffect(() => {
    if (didInitStateRef.current) return;
    // Only initialize if we have data
    if (!rawItemsData || rawItemsData.length === 0) return;

    // No URL-based initialization needed anymore
    // We'll use the ShareCodeDialog component for sharing items

    // Load sort option
    const savedSort = localStorage.getItem("sortOption");
    if (savedSort) setSortOption(savedSort);

    // Load excluded categories (IDs)
    try {
      const saved = localStorage.getItem("excludedCategories");
      if (saved) {
        const parsedCategories = JSON.parse(saved) as unknown;
        if (Array.isArray(parsedCategories)) {
          // Back-compat: convert any legacy names to IDs
          const ids = (parsedCategories as string[])
            .map((val) => {
              if (CATEGORY_BY_ID.has(val)) return val; // already an ID
              const id = CATEGORY_ID_BY_NAME.get(val);
              return id ?? null;
            })
            .filter((x): x is string => Boolean(x));
          setExcludedCategories(new Set(ids));
        } else {
          console.error(
            "Saved excludedCategories is not an array:",
            parsedCategories
          );
          setExcludedCategories(DEFAULT_EXCLUDED_CATEGORY_IDS);
        }
      } else {
        console.log("No saved categories found, using defaults");
        setExcludedCategories(DEFAULT_EXCLUDED_CATEGORY_IDS);
      }
    } catch (e) {
      console.error("Error parsing excludedCategories from localStorage", e);
      setExcludedCategories(DEFAULT_EXCLUDED_CATEGORY_IDS);
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

    // Mark initialization complete
    didInitStateRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawItemsData]);

  // Auto-trigger notifications after onboarding completion and data load
  useEffect(() => {
    // Only trigger notifications once the app is fully loaded, initialized, AND onboarding is complete
    if (didInitStateRef.current && !loading && rawItemsData && rawItemsData.length > 0 && onboardingComplete) {
      // Delay to let user settle after completing onboarding
      const timeoutId = setTimeout(() => {
        triggerNewNotifications();
      }, 2000); // 2 second delay after onboarding and data loads

      return () => clearTimeout(timeoutId);
    }
  }, [rawItemsData, loading, onboardingComplete, triggerNewNotifications]);

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
      DEFAULT_EXCLUDED_CATEGORY_IDS
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

    // First filter by excluded categories (by category ID)
    const categoryFiltered = rawItemsData.filter((item: SimplifiedItem) => {
      if (item.name.toLowerCase() === "pestily plague mask") return true; // TEMP FIX
      const ids = (item.categories && item.categories.length > 0)
        ? item.categories
        : (item.categories_display_en ?? [])
            .map((c) => c.id ?? CATEGORY_ID_BY_NAME.get(c.name) ?? null)
            .filter((x): x is string => Boolean(x));
      return !ids.some((id) => excludedCategories.has(id));
    });

    // Then filter out individually excluded items (case-insensitive, language-agnostic)
    const excludedItemNames = new Set(
      Array.from(excludedItems, (name) => name.toLowerCase())
    );
    const excludedFiltered = excludeIncompatible
      ? categoryFiltered.filter((item: SimplifiedItem) => {
          const candidates = [
            item.name,
            item.shortName,
            item.englishName,
            item.englishShortName,
          ].filter(Boolean) as string[];
          return !candidates.some((n) => excludedItemNames.has(n.toLowerCase()));
        })
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

  // Helper: compute effective price for an item given current mode and overrides
  const getEffectivePrice = useCallback(
    (item: SimplifiedItem): number | undefined => {
      // Override takes precedence
      const overridden = overriddenPrices[item.id];
      if (typeof overridden === "number") return overridden;

      if (priceMode === "flea") {
        const val = item[fleaPriceType as keyof SimplifiedItem];
        return typeof val === "number" ? (val as number) : undefined;
      }

      // Trader mode: pick the best eligible trader offer based on levels
      if (!item.buyFor || item.buyFor.length === 0) return undefined;
      let best: number | undefined = undefined;
      for (const offer of item.buyFor) {
        const vendor = offer.vendor?.normalizedName as keyof TraderLevels | undefined;
        if (!vendor) continue;
        const minLvl = offer.vendor?.minTraderLevel ?? 1;
        const userLvl = traderLevels[vendor];
        if (userLvl && userLvl >= minLvl) {
          if (typeof offer.priceRUB === "number") {
            if (best === undefined || offer.priceRUB > best) best = offer.priceRUB;
          }
        }
      }
      return best;
    },
    [fleaPriceType, overriddenPrices, priceMode, traderLevels]
  );

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
        effectivePrice: getEffectivePrice(item),
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
          const fleaPrice = item.effectivePrice;

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
    [itemBonus, useLastOfferCountFilter, getEffectivePrice]
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
    return selectedItems.map((item) => (item ? getEffectivePrice(item) ?? 0 : 0));
  }, [selectedItems, getEffectivePrice]);

  // Memoized total flea cost
  const totalFleaCost = useMemo(() => {
    return fleaCosts.reduce((sum, cost) => sum! + cost!, 0);
  }, [fleaCosts]);

  const isThresholdMet: boolean = total >= threshold;

  // Expected outcome text based on current total base value
  function getExpectedOutcome(val: number): { short: string; full: string } {
    if (val >= 400_000) {
      return {
        short: `quest/hideout items or high value items`,
        full:
          "quest/hideout items or high value items",
      };
    }
    if (val >= 350_001) {
      return { short: "High value items", full: "High value items" };
    }
    return { short: "Normal value items", full: "Normal value item" };
  }

  // Show hint pills only when at least one item is selected AND threshold not met, or when all empty
  const showHintPills = useMemo(
    () => (selectedItems.some(Boolean) && total < threshold) || selectedItems.every((it) => !it),
    [selectedItems, total, threshold]
  );

  // check if selected items fit in the cultist circle box (9x6) and collect debug info
  const itemsFitInBox = useMemo(() => {
    return doItemsFitInBox(selectedItems.filter(Boolean) as SimplifiedItem[]);
  }, [selectedItems]);

  // Compute per-slot suggestions:
  // - First: cheapest single item that alone meets the need (if any)
  // - Then: up to two items from a minimal-cost multi-pick plan that collectively meet the need, bounded by remaining empty slots
  const nextItemSuggestions = useMemo(() => {
    const bonusMultiplier = 1 + itemBonus / 100;
    const candidates = items
      .map((item) => ({ item, price: getEffectivePrice(item) as number, adjBase: item.basePrice * bonusMultiplier }))
      .filter(({ item, price }) => Number.isFinite(price) && price > 0 && item.basePrice > 0)
      .sort((a, b) => a.price - b.price);

    // Deterministic seeded randomness helpers (stable for same selection/threshold/slot)
    const selKey = selectedItems.map((s) => (s ? s.id : "-")).join("|") + `:${threshold}`;
    function hashString(s: string): number {
      let h = 2166136261 >>> 0; // FNV-1a
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }
    function rng(seed: number) {
      return function () {
        seed += 0x6D2B79F5;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function seededShuffle<T>(arr: T[], seed: number): T[] {
      const a = arr.slice();
      const rnd = rng(seed);
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Helper: build a cheap plan of up to k items that covers need by greedy on price,
    // prioritizing items that each contribute at least an even share towards the need.
    function buildPlan(need: number, k: number, perItemMin: number) {
      const eligible = candidates.filter((c) => c.adjBase >= perItemMin);
      const source = eligible.length > 0 ? eligible : candidates;
      const plan: typeof candidates = [];
      let acc = 0;
      // Add slight randomness within the top window
      const windowed = seededShuffle(source.slice(0, Math.min(12, source.length)), hashString(selKey))
        .concat(source.slice(12));
      for (const c of windowed) {
        if (plan.length >= k) break;
        if (acc >= need) break;
        plan.push(c);
        acc += c.adjBase;
      }
      if (acc < need && source === eligible) {
        // eligible too strict, try again with all candidates but prefer larger base contributors
        const byBaseDesc = [...candidates].sort((a, b) => b.adjBase - a.adjBase);
        plan.length = 0;
        acc = 0;
        for (const c of byBaseDesc) {
          if (plan.length >= k) break;
          if (acc >= need) break;
          plan.push(c);
          acc += c.adjBase;
        }
      }
      return plan;
    }

    const totalEmpty = selectedItems.filter((x) => !x).length;

    return selectedItems.map((slotItem, idx) => {
      if (slotItem) return [] as SimplifiedItem[];
      const subtotalExSlot = selectedItems.reduce((s, it, i) => (i === idx || !it ? s : s + it.basePrice * bonusMultiplier), 0);
      const need = Math.max(0, threshold - subtotalExSlot);
      if (need <= 0) {
        // Any cheap items ok; pick 3 from top 8 with a seeded shuffle per slot
        const seed = hashString(selKey + `:${idx}`);
        return seededShuffle(candidates.slice(0, Math.min(8, candidates.length)), seed)
          .slice(0, 3)
          .map((c) => c.item);
      }

      const remainingSlots = Math.max(1, totalEmpty); // number of empties available overall

      // Single that meets
      const seedSingle = hashString(selKey + `:single:${idx}`);
      const meetPool = candidates.filter((c) => c.adjBase >= need).slice(0, 5);
      const single = (meetPool.length > 0
        ? seededShuffle(meetPool, seedSingle)[0]
        : undefined)?.item;

      // Multi-pick plan up to remainingSlots items; enforce meaningful per-item contribution when possible
      const perItemMin = Math.ceil(need / remainingSlots);
      const plan = buildPlan(need, remainingSlots, perItemMin).map((c) => c.item);

      const out: SimplifiedItem[] = [];
      if (single) out.push(single);
      for (const it of plan) {
        if (out.length >= 3) break;
        if (single && it.id === single.id) continue; // avoid duplicate
        out.push(it);
      }
      // Fallback if nothing found: suggest cheapest few
      if (out.length === 0) return candidates.slice(0, 3).map((c) => c.item);
      return out;
    });
  }, [items, selectedItems, threshold, itemBonus, getEffectivePrice]);

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
    const willPin = !pinnedItems[index];
    if (willPin) {
      const newPinnedCount = pinnedItems.filter(Boolean).length + 1;
      // Guardrail: prevent pinning all 5 when threshold is not met (would make auto-select impossible)
      if (newPinnedCount === 5 && total < threshold) {
        sonnerToast.error("Cannot pin all 5 items", {
          description:
            `Current total ${Math.floor(total).toLocaleString()} is below threshold ${threshold.toLocaleString()}. Unpin one item or increase item values.`,
        });
        return;
      }
    }

    const newPinnedItems = [...pinnedItems];
    newPinnedItems[index] = !newPinnedItems[index];
    setPinnedItems(newPinnedItems);
  };

  // Function to handle auto-select and reroll
  const handleAutoPick = useCallback(async (): Promise<void> => {
    // Perform Auto Select or Reroll regardless of hasAutoSelected state
    setIsCalculating(true);

    try {
      // Determine remaining slots before heavy work
      const slotsLeft = 5 - pinnedItems.filter(Boolean).length;

      // Single-pass filter with all conditions, then sort; only cap to top-100 when more than one slot left
      let ranked = items
        .map((item) => ({
          item,
          price: getEffectivePrice(item),
          efficiency: item.basePrice / ((getEffectivePrice(item) || 1)), // Avoid division by zero
        }))
        .filter(
          ({ item, price }) =>
            price !== undefined &&
            price > 0 &&
            item.basePrice >= threshold * 0.1 &&
            !excludedItems.has(item.name.toLowerCase())
        )
        .sort((a, b) => b.efficiency - a.efficiency);

      if (slotsLeft > 1) ranked = ranked.slice(0, 100);

      const validItems = ranked.map(({ item }) => item); // Map back to just the items

      // Small delay to prevent UI freezing
      await new Promise((resolve) => setTimeout(resolve, 50));

      const pinnedTotal = selectedItems.reduce(
        (sum, item, index) =>
          sum + (pinnedItems[index] && item ? item.basePrice : 0),
        0
      );

      const remainingThreshold = Math.max(0, threshold - pinnedTotal);

      // If there's nothing left to fulfill, keep current unpinned items as-is and mark success
      if (remainingThreshold === 0) {
        setHasAutoSelected(true);
        return;
      }

      const filteredItems = validItems.filter(
        (item) =>
          !selectedItems.some(
            (selected, index) => pinnedItems[index] && selected?.id === item.id
          )
      );

      // Adjust prices in filteredItems to use overridden prices where applicable
      const adjustedItems = filteredItems;

      // Shuffle the adjusted items to increase randomness
      const shuffledAdjustedItems = [...adjustedItems].sort(
        () => Math.random() - 0.5
      );

      // If only one slot is left, run a deterministic single-slot resolver
      if (slotsLeft === 1) {
        // Build a deterministic candidate list sorted by lowest effective price first.
        const buildCandidates = (window: number) =>
          [...adjustedItems]
            .filter(
              (it) =>
                it.basePrice >= remainingThreshold && it.basePrice <= remainingThreshold + window
            )
            .map((it) => ({ it, price: getEffectivePrice(it) }))
            .filter(({ price }) => typeof price === "number" && (price as number) > 0)
            .sort((a, b) => (a.price as number) - (b.price as number))
            .map(({ it }) => it);

        let candidates: SimplifiedItem[] = buildCandidates(5000);
        if (candidates.length === 0) candidates = buildCandidates(15000);

        if (candidates.length === 0) {
          sonnerToast.error("Auto Select", {
            description: `No single item meets remaining base value of ${remainingThreshold.toLocaleString()} within +5k (+15k after relax). Unpin one item or lower threshold.`,
          });
          return;
        }

        const newSelectedItems: Array<SimplifiedItem | null> = [...selectedItems];
        const targetIndex = pinnedItems.findIndex((p) => !p);
        const currentId = targetIndex !== -1 ? newSelectedItems[targetIndex]?.id : undefined;
        const currentIdxInList = currentId
          ? candidates.findIndex((c) => c.id === currentId)
          : -1;
        const nextIdx = currentIdxInList >= 0
          ? (currentIdxInList + 1) % candidates.length
          : 0;
        if (targetIndex !== -1) newSelectedItems[targetIndex] = candidates[nextIdx] || candidates[0];

        // Preserve overridden prices for items that remain selected
        const newOverriddenPrices = { ...overriddenPrices };
        for (let i = 0; i < 5; i++) {
          const item = newSelectedItems[i];
          if (item && overriddenPrices[item.id]) {
            newOverriddenPrices[item.id] = overriddenPrices[item.id];
          }
        }

        setSelectedItems(newSelectedItems);
        setOverriddenPrices(newOverriddenPrices);
        setHasAutoSelected(true);
        return;
      }

      const bestCombination = findBestCombination(
        shuffledAdjustedItems,
        remainingThreshold,
        slotsLeft
      );

      if (bestCombination.selected.length === 0 && remainingThreshold > 0) {
        if (!isPVE && priceMode === "flea") {
          sonnerToast.error("Auto Select", {
            description:
              "No valid combo using Flea prices in PvP. Switch to Trader prices?",
            action: {
              label: "Use Traders",
              onClick: () => setPriceMode("trader"),
            },
          });
        } else {
          sonnerToast.error("Auto Select", {
            description:
              `Failed to find a valid combo for remaining ${remainingThreshold.toLocaleString()}. Try Trader prices, relax filters, or unpin one item.`,
          });
        }
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
    getEffectivePrice,
    isPVE,
    priceMode,
    setPriceMode,
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

      sonnerToast(title, {
        description,
      });

      toastShownRef.current = true;
    }

    // Reset the toastShownRef if threshold is not met
    if (!isThresholdMet) {
      toastShownRef.current = false;
    }
  }, [isThresholdMet, threshold]);

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
      setExcludedCategories(DEFAULT_EXCLUDED_CATEGORY_IDS);
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

    sonnerToast("Cleared Items", {
      description: "All item fields have been cleared.",
    });
  }, []);

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

    sonnerToast("Reset Successful", {
      description: `${clearedOverridesCount} overrides and ${clearedExcludedItemsCount} excluded items have been cleared.`,
    });
  }, [excludedItems, overriddenPrices]);

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

  const handlePriceModeChange = useCallback((newMode: PriceMode) => {
    setPriceMode(newMode);
  }, []);

  const handleTraderLevelsChange = useCallback((levels: TraderLevels) => {
    setTraderLevels(levels);
  }, []);

  const handleUseLastOfferCountFilterChange = useCallback(
    (newState: boolean) => {
      setUseLastOfferCountFilter(newState);
    },
    []
  );

  // Listen for global nav events to open settings from SiteNav
  useEffect(() => {
    function openSettings() {
      setIsSettingsPaneVisible(true);
    }
    document.addEventListener("cc:open-settings", openSettings as EventListener);
    return () =>
      document.removeEventListener(
        "cc:open-settings",
        openSettings as EventListener
      );
  }, []);

  // Update the refresh button UI
  return (
    <>
      <div className="min-h-screen bg-my_bg_image bg-no-repeat bg-cover bg-fixed text-gray-100 px-4 pb-4 pt-0 sm:pt-1 overflow-auto">
        <div className="min-h-screen flex items-center justify-center">
          <Card className="bg-gray-800/95 backdrop-blur-sm border-gray-700 shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto transition-all duration-300 hover:shadow-xl rounded-t-none -mt-px border-t-0">
            {/* App-specific toolbar removed; now in global nav */}

            {/* Title and Version Info */}
            <div className="pt-2">
              <h1 className="sm:text-3xl text-xl font-bold mb-4 text-center text-red-500 text-nowrap flex items-center justify-center w-full">
                <Image
                  src="https://assets.cultistcircle.com/Cultist-Calulator.webp"
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
            
            <div className="text-center text-gray-400 text-sm mb-4">
              <VersionInfo version={CURRENT_VERSION} />
            </div>

            {/* Combined compact alerts */}
            <TopAlerts isPVE={isPVE} />

            <CardContent className="p-2">
              {/* Unified controls */}
              <div className="mt-1 flex items-center justify-center">
                <ModeThreshold
                  isPVE={isPVE}
                  onModeToggle={handleModeToggle}
                  threshold={threshold}
                  onThresholdChange={handleThresholdChange}
                />
              </div>
              <div className="mt-2 flex items-center justify-center">
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
                  <Alert className="border-red-500/50 bg-red-900/20 text-white animate-pulse">
                    <AlertTitle className="flex items-center justify-center gap-2 text-xl font-bold bg-red-600/30 border border-red-500/80 rounded-md p-2">
                      <span className="text-2xl">❌</span>
                      <span>ITEMS DO NOT FIT!</span>
                      <span className="text-2xl">❌</span>
                    </AlertTitle>
                    <AlertDescription className="mt-3 space-y-3">
                      <div className="text-left bg-gray-800/50 border border-gray-700 rounded-md p-3">
                        <p className="font-semibold mb-2 text-yellow-400">The following items could not be placed:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          {selectedItems.filter(Boolean).map((item, idx) => (
                            <li key={`${item?.id ?? "no-id"}-${idx}`}>
                              {item?.name} -{" "}
                              <span className="font-mono">{item?.width ?? "?"}w × {item?.height ?? "?"}h</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <p className="font-bold text-lg text-yellow-300">
                        The selected items cannot be arranged in the Cultist Circle box (9×6).
                      </p>

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
                              priceMode={priceMode}
                              traderLevels={traderLevels}
                            />
                          </Suspense>
                          {showHintPills && !item && nextItemSuggestions[index] && nextItemSuggestions[index].length > 0 && (
                            index === selectedItems.findIndex((it) => !it) ||
                            (selectedItems.every((it) => !it) && index === 0)
                          ) ? (
                            <NextItemHints
                              items={
                                selectedItems.every((it) => !it) && index === 0
                                  ? (() => {
                                      const divisorOptions = [5, 4, 3, 2];
                                      let filteredSuggestions: SimplifiedItem[] = [];
                                      for (const divisor of divisorOptions) {
                                        filteredSuggestions = nextItemSuggestions[index].filter((it) => it.basePrice >= threshold / divisor);
                                        if (filteredSuggestions.length >= 3) break;
                                      }
                                      return filteredSuggestions
                                        .sort((a, b) => (getEffectivePrice(a) ?? 0) - (getEffectivePrice(b) ?? 0))
                                        .slice(0, 3);
                                    })()
                                  : nextItemSuggestions[index]
                              }
                              prevItem={index > 0 ? selectedItems[index - 1] : null}
                              onPick={(it) => updateSelectedItem(it, index)}
                            />
                          ) : null}
                        </React.Fragment>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Preview / Clear / Reset Buttons */}
              <div className="flex space-x-2 mt-2">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewModalOpen(true)}
                      className="inline-flex w-1/4"
                    >
                      <Button
                        variant="secondary"
                        className="rounded bg-green-700 hover:bg-green-600 text-white w-full"
                      >
                        Preview
                      </Button>
                    </span>
                {/* Clear Selected Items Button */}
                    <span
                      role="button"
                      tabIndex={isClearButtonDisabled ? -1 : 0}
                      aria-disabled={isClearButtonDisabled}
                      onClick={() => {
                        if (!isClearButtonDisabled) clearItemFields()
                      }}
                      className={`inline-flex w-2/4 ${
                        isClearButtonDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Button
                        id="clear-item-fields"
                        className={`bg-red-500 hover:bg-red-600 text-white w-full rounded transition-all duration-300 active:scale-95`}
                        disabled={isClearButtonDisabled}
                      >
                        <span className="hidden sm:inline">Clear Selected Items</span>
                        <span className="sm:hidden">Clear Selected</span>
                      </Button>
                    </span>
                {/* Reset Overrides Button */}
                    <span
                      role="button"
                      tabIndex={isResetOverridesButtonDisabled ? -1 : 0}
                      aria-disabled={isResetOverridesButtonDisabled}
                      onClick={() => {
                        if (!isResetOverridesButtonDisabled) resetOverridesAndExclusions()
                      }}
                      className={`inline-flex w-1/4 ${
                        isResetOverridesButtonDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Button
                        id="reset-overrides"
                        className={`bg-red-500 hover:bg-red-600 text-white w-full rounded transition-all duration-300 active:scale-95`}
                        disabled={isResetOverridesButtonDisabled}
                      >
                        <span className="hidden sm:inline">Reset Overrides</span>
                        <span className="sm:hidden">Reset</span>
                      </Button>
                    </span>
              </div>

              {/* Status text with improved styling */}
              <div className="text-center text-sm text-gray-400 mt-4 p-2 rounded-md bg-gray-700/30">
                <span className="font-medium">
                  {Object.keys(overriddenPrices).length}
                </span>{" "}
                overrides and{" "}
                <span className="font-medium">{excludedItems.size}</span>{" "}
                exclusions currently active
              </div>

              {/* Sacrifice + Flea costs (revamped) */}
              <div id="sacrifice-value" className="mt-6 w-full">
                <div className="mx-auto max-w-2xl rounded-2xl bg-slate-700/40 border border-slate-600/30 backdrop-blur-sm px-4 py-4">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-white to-gray-100 animate-gradient">
                    Sacrifice BaseValue Total
                  </h2>
                  {loading ? (
                    <Skeleton className="h-20 w-4/5 mx-auto" />
                  ) : (
                    <>
                      {/* Primary summary layout */}
                      <div className="mt-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-6">
                          {/* Left: total, base text, threshold, est. cost */}
                          <div className="flex-1">
                            <div className="text-5xl md:text-6xl font-extrabold text-green-500 leading-tight">
                              ₽{total.toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs md:text-sm text-gray-400">
                              {itemBonus > 0 ? (
                                <>
                                  Base: ₽{Math.round(total / (1 + itemBonus / 100)).toLocaleString()} + {itemBonus}% bonus
                                </>
                              ) : (
                                <>Current total basevalue</>
                              )}
                            </div>
                            <div className="mt-1 text-[11px] md:text-xs">
                              {isThresholdMet ? (
                                <span className="text-green-400">Threshold Met</span>
                              ) : (
                                <span className="text-red-400">Remaining to threshold ₽{(threshold - total).toLocaleString()}</span>
                              )}
                            </div>
                            <div className="mt-2">
                              <div className="text-[11px] md:text-xs uppercase tracking-wide text-gray-400">EST. COST</div>
                              <div className={`text-base md:text-lg font-semibold ${Object.keys(overriddenPrices).length > 0 ? "text-white" : "text-gray-200"}`}>
                                ₽{totalFleaCost?.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Right: expected rewards card */}
                          <div className="md:ml-2 rounded-xl bg-slate-800/30 border border-slate-700/70 px-4 py-3 w-full md:w-auto md:max-w-xs">
                            <div className="text-[11px] md:text-xs uppercase tracking-wide text-gray-400">EXPECTED REWARDS</div>
                            <div className="text-sm md:text-base text-slate-200" title={getExpectedOutcome(total).full}>
                              {getExpectedOutcome(total).short}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <ThresholdProgress total={Math.floor(total)} />
                      </div>
                      <div className="mt-4 flex justify-center">
                        <ShareCardButton
                          items={selectedItems}
                          total={Math.floor(total)}
                          totalFlea={Math.floor(totalFleaCost || 0)}
                          modeLabel={isPVE ? "PVE" : "PVP"}
                          sacred={itemBonus > 0}
                        />
                      </div>
                    </>
                  )}
                </div>
                <footer className="mt-3 text-center text-gray-300 text-[12px] md:text-sm w-full">
                  <div className="mx-auto max-w-2xl rounded-full bg-slate-700/30 border border-slate-600/30 backdrop-blur-sm px-3 py-2">
                    <span>Prices provided by </span>
                    <a
                      href="https://tarkov.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Tarkov.dev
                    </a>
                    <span className="mx-2">·</span>
                    <span>Research provided by </span>
                    <a
                      href="https://bio.link/verybadscav"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      VeryBadSCAV
                    </a>
                    <span className="mx-2">·</span>
                    <span>Made by Wilsman77</span>
                  </div>
                  <div className="flex justify-center mt-3 gap-3 sm:gap-4">
                    <a
                      href="https://www.buymeacoffee.com/wilsman77"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Buy me a coffee"
                      title="Buy me a coffee"
                      className="inline-flex items-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
                        alt="Buy Me a Coffee"
                        width="180"
                        height="36"
                        loading="lazy"
                        decoding="async"
                        className="h-9 w-auto select-none"
                      />
                    </a>
                    <Button
                      onClick={() => setIsFeedbackFormVisible(true)}
                      aria-label="Open feedback form"
                      className="h-9 px-4 rounded-full bg-red-800/60 hover:bg-red-800/80 text-slate-100 border border-slate-600/30 shadow-sm backdrop-blur-sm"
                    >
                      Feedback
                    </Button>
                  </div>
                </footer>
              </div>
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
              setExcludedCategories(DEFAULT_EXCLUDED_CATEGORY_IDS);
              setSortOption("az");
              setThreshold(400000);
              setExcludedItems(new Set(DEFAULT_EXCLUDED_ITEMS));
              setOverriddenPrices({});

              sonnerToast("Data Cleared", {
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
                priceMode,
                traderLevels,
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
                if (parsed.priceMode) setPriceMode(parsed.priceMode);
                if (parsed.traderLevels) setTraderLevels(parsed.traderLevels);
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
            priceMode={priceMode}
            onPriceModeChange={handlePriceModeChange}
            traderLevels={traderLevels}
            onTraderLevelsChange={handleTraderLevelsChange}
            excludedCategories={Array.from(excludedCategories)}
            onCategoryChange={handleCategoryChange}
            allCategories={allCategoriesLocalized}
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
