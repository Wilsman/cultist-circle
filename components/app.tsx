// components/app.tsx
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import BetaBadge from "./ui/beta-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FeedbackForm } from "./feedback-form";
import ItemSelector from "@/components/ui/ItemSelector"; // Ensure correct path
import { SimplifiedItem } from "@/types/SimplifiedItem";
import ThresholdSelector from "@/components/ui/threshold-selector";
import Cookies from "js-cookie";
import { SettingsPane } from "@/components/settings-pane";
import { Skeleton } from "@/components/ui/skeleton";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const PVE_CACHE_KEY = "pveItemsCache";
const PVP_CACHE_KEY = "pvpItemsCache";

export function App() {
  const [isPVE, setIsPVE] = useState<boolean>(false); // Toggle between PVE and PVP
  const [selectedItems, setSelectedItems] = useState<
    Array<SimplifiedItem | null>
  >(Array(5).fill(null));
  const [total, setTotal] = useState<number>(0);
  const [fleaCosts, setFleaCosts] = useState<Array<number>>(Array(5).fill(0));
  const [isCalculating, setIsCalculating] = useState<boolean>(false); // Calculating state
  const [isFeedbackFormVisible, setIsFeedbackFormVisible] =
    useState<boolean>(false);
  const [pinnedItems, setPinnedItems] = useState<boolean[]>(
    Array(5).fill(false)
  );
  const [isSettingsPaneVisible, setIsSettingsPaneVisible] =
    useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sortOption") || "az"; // Default sort option
    }
    return "az";
  });
  const allItemCategories = [
    "Ammo",
    "Ammo_boxes",
    "Barter",
    "Containers",
    "Crates",
    "Currency",
    "Gear",
    "Keys",
    "Magazines",
    "Maps",
    "Meds",
    "Provisions",
    "Quest_items",
    "Repair",
    "Sights",
    "Special_equipment",
    "Suppressors",
    "Tactical_devices",
    "Weapon",
    "Weapon_parts",
  ];
  const defaultItemCategories = [
    "Barter",
    "Provisions",
    "Containers",
    "Maps",
    "Suppressors",
    // Add any other categories you want as defaults
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCategories = localStorage.getItem("selectedCategories");
        if (savedCategories) {
          return JSON.parse(savedCategories);
        }
      } catch (e) {
        console.error("Error parsing selectedCategories from localStorage", e);
      }
    }
    return defaultItemCategories;
  });

  const handleCategoryChange = useCallback((categories: string[]) => {
    setSelectedCategories(categories);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCategories", JSON.stringify(categories));
    }
  }, []);

  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(
    null
  );

  const handleSortChange = useCallback((newSortOption: string) => {
    setSortOption(newSortOption);
    if (typeof window !== "undefined") {
      localStorage.setItem("sortOption", newSortOption);
    }
  }, []);

  // Initialize threshold state with a function
  const [threshold, setThreshold] = useState<number>(() => {
    // Use a default value that will be consistent on both server and client
    return 350001;
  });

  // Use useEffect to update the threshold from the cookie after initial render
  useEffect(() => {
    const savedThreshold = Cookies.get("userThreshold");
    if (savedThreshold) {
      setThreshold(Number(savedThreshold));
    }
  }, []);

  // State to manage the threshold value for the ritual
  const handleThresholdChange = (newValue: number) => {
    setThreshold(newValue);
    Cookies.set("userThreshold", newValue.toString(), { expires: 365 });
    // You might want to trigger any calculations that depend on the threshold here
  };

  // State for storing fetched items data, loading status, and error messages
  const [itemsData, setItemsData] = useState<SimplifiedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dataFetchedRef = useRef(false);

  // Fetch data from internal API routes based on the selected mode (PVE or PVP)
  const fetchData = useCallback(async () => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    const cacheKey = isPVE ? PVE_CACHE_KEY : PVP_CACHE_KEY;
    const apiUrl = isPVE ? "/api/pve-items" : "/api/pvp-items";

    try {
      setLoading(true);
      const { data, timestamp } = await fetchCachedData(apiUrl, cacheKey);
      setItemsData(data);
      setLastFetchTimestamp(timestamp); // Use the server's timestamp
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? `Fetch Error: ${err.message}`
          : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isPVE]);

  const [nextFetchTime, setNextFetchTime] = useState<string>("N/A");

  useEffect(() => {
    if (lastFetchTimestamp) {
      const interval = setInterval(() => {
        const remainingTime = lastFetchTimestamp + CACHE_DURATION - Date.now();
        if (remainingTime <= 0) {
          setNextFetchTime("Refresh Available");
          clearInterval(interval);
        } else {
          const minutes = Math.floor(
            (remainingTime % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
          setNextFetchTime(`${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lastFetchTimestamp]);

  useEffect(() => {
    fetchData();
  }, [fetchData, isPVE]);

  const fetchCachedData = async (
    url: string,
    cacheKey: string
  ): Promise<{ data: SimplifiedItem[]; timestamp: number }> => {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        if (now - timestamp < CACHE_DURATION) {
          console.log(`Using cached data for ${cacheKey}`);
          return { data, timestamp };
        }
      }

      console.log(`Fetching fresh data for ${cacheKey}`);
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to fetch data for ${cacheKey}`
        );
      }
      const result = await response.json();
      const { data, timestamp } = result;

      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp }));
      return { data, timestamp };
    } catch (error) {
      console.error(`Error in fetchCachedData for ${cacheKey}:`, error);
      throw error;
    }
  };

  // Precompute and sort items based on the sortOption
  const items: SimplifiedItem[] = useMemo(() => {
    const filteredItems = itemsData.filter(
      (item) =>
        selectedCategories.length === 0 ||
        (Array.isArray(item.tags)
          ? item.tags.some((tag) => selectedCategories.includes(tag))
          : selectedCategories.includes(item.tags || ""))
    );

    // Sort the items based on the selected sort option
    const sortedItems = [...filteredItems];
    if (sortOption === "az") {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "base-value") {
      sortedItems.sort((a, b) => a.basePrice - b.basePrice);
    }

    return sortedItems;
  }, [itemsData, sortOption, selectedCategories]);

  // Function to find the best combination of items that meets the threshold with the minimum flea cost
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

  const [overriddenPrices, setOverriddenPrices] = useState<
    Record<string, number>
  >({});

  // Effect to recalculate the total ritual value and flea costs whenever selected items or threshold changes
  useEffect(() => {
    // Calculate total ritual value
    setTotal(
      selectedItems.reduce((sum, item) => sum + (item?.basePrice || 0), 0)
    );
    // Calculate total flea costs
    setFleaCosts(
      selectedItems.map((item) =>
        item ? overriddenPrices[item.uid] || item.price : 0
      )
    );
  }, [selectedItems, threshold, overriddenPrices]);

  // Update the selected item in the list
  const updateSelectedItem = (
    item: SimplifiedItem | null,
    index: number,
    overriddenPrice?: number | null
  ): void => {
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = item;
    setSelectedItems(newSelectedItems);

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

  // **11. Handle Auto Select**
  const handlePinItem = (index: number) => {
    const newPinnedItems = [...pinnedItems];
    newPinnedItems[index] = !newPinnedItems[index];
    setPinnedItems(newPinnedItems);
  };

  const [isAutoPickActive, setIsAutoPickActive] = useState(false);

  const handleAutoSelect = async (): Promise<void> => {
    setIsAutoPickActive(true);
    setIsCalculating(true);

    // Filter validItems based on heuristics
    let validItems: SimplifiedItem[] = items.filter((item) => item.price > 0);

    // Apply filtering heuristics
    validItems = validItems
      .filter((item) => item.basePrice >= threshold * 0.1) // Example: Only items contributing at least 10% to the threshold
      .filter((item) => !item.bannedOnFlea) // Filter out items that are banned on the flea market
      .filter(
        (item) =>
          new Date(item.updated).getTime() >
          Date.now() - 1000 * 60 * 60 * 24 * 7
      ) // Filter out items that haven't been updated in the last week
      .sort((a, b) => b.basePrice / b.price - a.basePrice / a.price) // Sort by value-to-cost ratio
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
          (selected, index) => pinnedItems[index] && selected?.uid === item.uid
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
      setIsCalculating(false);
      setIsAutoPickActive(false);
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
      } else if (item) {
        delete newOverriddenPrices[item.uid];
      }
    }

    setSelectedItems(newSelectedItems);
    setOverriddenPrices(newOverriddenPrices);
    setIsCalculating(false);
    setIsAutoPickActive(false);
  };

  // **13. Handle Mode Toggle Reset**
  const handleModeToggle = (checked: boolean): void => {
    setIsPVE(checked);
    setSelectedItems(Array(5).fill(null)); // Reset selected items
    setPinnedItems(Array(5).fill(false)); // Reset pinned items
    setOverriddenPrices({}); // Reset overridden prices
    dataFetchedRef.current = false; // Reset data fetch flag
  };

  // **14. Handle Copy to Clipboard**
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

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  // **17. Sacrifice Value Calculations**
  const isThresholdMet: boolean = total >= threshold;
  const totalFleaCost: number = fleaCosts.reduce((sum, cost) => sum + cost, 0);

  return (
    // Layout fills the screen height so there is no scrolling outside of the Card
    <div className="min-h-screen grid place-items-center bg-my_bg_image bg-no-repeat bg-cover text-gray-100 p-4 overflow-auto ">
      <Card className="bg-gray-800 border-gray-700 shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto bg-opacity-50 ">
        <div className="mt-4 text-center text-gray-400 text-sm">
          <div>Next Update: {nextFetchTime}</div>
        </div>
        {/* **4. Dialog for Instructions** */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="absolute top-6 left-4 animate-float hover:text-green-300 text-yellow-500 flex-row items-center justify-center">
              <HelpCircle className="h-10 w-10" />
              <div className="text-yellow-500 text-sm text-center">Help</div>
            </div>
          </DialogTrigger>
          <DialogContent className="flex bg-gray-800 sm:max-w-[600px] sm:max-h-[90vh] max-h-[90vh] w-full mx-auto">
            <DialogHeader>
              <DialogTitle>How to Use</DialogTitle>
              <DialogDescription className="text-left">
                <ul>
                  <li>
                    1️⃣ Toggle between PVE and PVP modes to use correct flea
                    prices.
                  </li>
                  <li>2️⃣ Edit threshold (see below for suggestions)</li>
                  <li>
                    3️⃣ Select items from the dropdown to calculate the total
                    sacrifice value.
                  </li>
                  <li>
                    4️⃣ Use Auto Pick to find the cheapest combination meeting
                    the threshold.
                  </li>
                  <li>
                    5️⃣ Ensure the total value meets the cultist threshold (base
                    value).
                  </li>
                  <li>6️⃣ If the threshold is met, sacrifice the items.</li>
                  <Separator className="mt-3 mb-3" />
                  <li>
                    🔴 BUG: 14-hour result has known bug which can result in an
                    empty reward.
                  </li>
                  <li>
                    🟢 Note: ≥400k base value = 6h (25% success) | Active
                    tasks/hideout item
                  </li>
                  <li>🟢 Note: ≥350,001 base value = 14h | High-Value item</li>
                  <li>
                    🟢 Note: Flea prices are latest prices provided by
                    tarkov-market.
                  </li>
                  <Separator className="mt-3 mb-1" />
                  <li>💖 Thank you for checking out the app - Wilsman77</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          className="absolute top-8 right-2 hover:text-green-300 text-yellow-500 flex-col justify-center items-center text-2xl"
          onClick={() => setIsSettingsPaneVisible(true)}
          style={{ backgroundColor: "transparent" }}
        >
          <div className="flex items-center">
            <Settings className="h-10 w-10" />
          </div>
          <div className="text-orange-500 text-sm text-center">Settings</div>
        </Button>

        <CardContent className="p-6">
          {/* **5. Header with Title and Beta Badge** */}
          <h1 className="sm:text-3xl text-xl font-bold mb-2 text-center text-red-500 text-nowrap flex items-center justify-center w-full">
            <Image
              src="/images/Cultist-Calulator.webp"
              alt="Cultist calulator logo"
              width={400}
              height={128}
            />
            <div className="ml-2">
              <BetaBadge />
            </div>
          </h1>

          {/* **6. Mode Toggle (PVE/PVP)** */}
          <div className="flex items-center justify-center mb-6 w-full">
            <span className="text-gray-300">PVP</span>
            <Switch
              checked={isPVE}
              onCheckedChange={handleModeToggle}
              className="mx-2 data-[state=checked]:bg-white data-[state=unchecked]:bg-white"
            />
            <span className="text-gray-300">PVE</span>
          </div>

          {/* **7. Display Current Threshold and Edit Button** */}
          <div className="flex items-center justify-center mb-4 w-full">
            <ThresholdSelector
              value={threshold}
              onChange={handleThresholdChange}
            />
          </div>

          {/* **8. Auto Select Button and Progress Bar** */}
          <div className="h-full w-full flex flex-col justify-center items-center">
            {isCalculating ? (
              <div className="text-center">
                <p className="text-gray-300 mb-2">
                  Calculating best combination...
                </p>
                <div className="lds-ellipsis">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col justify-center items-center">
                      <div className="flex justify-center mb-4">
                        <Button
                          onClick={handleAutoSelect}
                          disabled={isCalculating}
                          className="bg-blue-500 hover:bg-blue-700 md:min-w-[300px] sm:min-w-[300px] mr-2"
                        >
                          Auto Select
                        </Button>

                        <Link href="/recipes">
                          <Button className="bg-red-500 hover:bg-red-700">
                            Recipes
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Automatically select best items
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* **9. Item Selection Components** */}
            <div className="space-y-2 w-full">
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
                  No items available at this time. Please wait for the next
                  update in {nextFetchTime}.
                </div>
              ) : (
                // Show actual item selectors when loaded and items are available
                selectedItems.map((item, index) => (
                  <React.Fragment key={`selector-${index}`}>
                    <ItemSelector
                      items={items}
                      selectedItem={item}
                      onSelect={(selectedItem, overriddenPrice) =>
                        updateSelectedItem(selectedItem, index, overriddenPrice)
                      }
                      onCopy={() => handleCopyToClipboard(index)}
                      onPin={() => handlePinItem(index)}
                      isPinned={pinnedItems[index]}
                      overriddenPrice={
                        item ? overriddenPrices[item.uid] : undefined
                      }
                      isAutoPickActive={isAutoPickActive}
                      overriddenPrices={overriddenPrices}
                    />
                    {index < selectedItems.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>

          {/* **10. Sacrifice Value Display** */}
          <div className="mt-6 text-center w-full">
            <h2 className="text-3xl font-bold mb-2 text-gray-300">
              Sacrifice Value
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
                Remaining Value Needed: ₽{(threshold - total).toLocaleString()}
              </div>
            )}
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-400">
                Flea Cost ≈{" "}
                <span
                  className={
                    Object.keys(overriddenPrices).length > 0 ? "font-bold" : ""
                  }
                >
                  ₽{totalFleaCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <Separator className="my-1" />

        {/* **11. Footer with Credits and Links** */}
        <footer className="mt-4 text-center text-gray-400 text-sm w-full">
          <a
            href="https://tarkov-market.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors"
          >
            Data provided by Tarkov Market
          </a>
          <div className="text-center mt-1">
            Credit to{" "}
            <a
              href="https://bio.link/verybadscav"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              VeryBadSCAV
            </a>{" "}
            for helping with this tool.
          </div>
          <div className="text-center mt-1">
            {/* maker with cool icons */}
            🔥 Made by Wilsman77 🔥
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
                height={30}
                priority={true}
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
      </Card>
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
            allCategories={allItemCategories} // Pass all categories
          />
        </div>
      )}
    </div>
  );
}
