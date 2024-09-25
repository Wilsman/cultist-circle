// components/app.tsx
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, FlameKindling } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
import { FeedbackForm } from "./feedback-form";
import ItemSelector from "@/components/ui/ItemSelector"; // Ensure correct path
import { SimplifiedItem } from "@/types/SimplifiedItem";
import ThresholdSelector from "@/components/ui/threshold-selector";
import Cookies from 'js-cookie';

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
  const [progressValue, setProgressValue] = useState<number>(0); // Progress value
  const [isFeedbackFormVisible, setIsFeedbackFormVisible] =
    useState<boolean>(false);
  const [pinnedItems, setPinnedItems] = useState<boolean[]>(
    Array(5).fill(false)
  );

  // Initialize threshold state with cookie value or default
  const [threshold, setThreshold] = useState<number>(() => {
    const savedThreshold = Cookies.get('userThreshold');
    return savedThreshold ? Number(savedThreshold) : 350001;
  });

  // State to manage the threshold value for the ritual
  const handleThresholdChange = (newValue: number) => {
    setThreshold(newValue);
    Cookies.set('userThreshold', newValue.toString(), { expires: 365 });
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
      const data = await fetchCachedData(apiUrl, cacheKey);
      setItemsData(data);
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

  useEffect(() => {
    fetchData();
  }, [fetchData, isPVE]);

  const fetchCachedData = async (
    url: string,
    cacheKey: string
  ): Promise<SimplifiedItem[]> => {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { timestamp, data } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log(`Using cached data for ${cacheKey}`);
          return data;
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
      const data: SimplifiedItem[] = await response.json();
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ timestamp: Date.now(), data })
      );
      return data;
    } catch (error) {
      console.error(`Error in fetchCachedData for ${cacheKey}:`, error);
      throw error;
    }
  };

  // Precompute and sort items alphabetically by name
  const items: SimplifiedItem[] = useMemo(() => {
    return [...itemsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsData]);

  // Function to find the best combination of items that meets the threshold with the minimum flea cost
  const findBestCombination = useCallback(
    (
      validItems: SimplifiedItem[],
      threshold: number,
      maxItems: number
    ): { selected: SimplifiedItem[]; totalFleaCost: number } => {
      // Initialize DP table
      const dp: Array<Array<number>> = Array(maxItems + 1)
        .fill(null)
        .map(() => Array(threshold + 1001).fill(Infinity));
      const itemTracking: Array<Array<Array<number>>> = Array(maxItems + 1)
        .fill(null)
        .map(() =>
          Array(threshold + 1001)
            .fill(null)
            .map(() => [])
        );

      dp[0][0] = 0; // Base case

      // Populate DP table
      for (let c = 1; c <= maxItems; c++) {
        for (let i = 0; i < validItems.length; i++) {
          const { basePrice, price } = validItems[i];
          for (let v = basePrice; v <= threshold + 1000; v++) {
            if (dp[c - 1][v - basePrice] + price < dp[c][v]) {
              dp[c][v] = dp[c - 1][v - basePrice] + price;
              itemTracking[c][v] = [...itemTracking[c - 1][v - basePrice], i];
            }
          }
        }
      }

      // Find the best combination
      let minFleaCost = Infinity;
      let bestC = -1;
      let bestV = -1;

      for (let c = 1; c <= maxItems; c++) {
        for (let v = threshold; v <= threshold + 1000; v++) {
          if (dp[c][v] < minFleaCost) {
            minFleaCost = dp[c][v];
            bestC = c;
            bestV = v;
          }
        }
      }

      if (bestC === -1) {
        return { selected: [], totalFleaCost: 0 };
      }

      const selectedIndices = itemTracking[bestC][bestV];
      const selectedItems = selectedIndices.map((index) => validItems[index]);

      return { selected: selectedItems, totalFleaCost: minFleaCost };
    },
    []
  );

  // Effect to recalculate the total ritual value and flea costs whenever selected items or threshold changes
  useEffect(() => {
    // Calculate total ritual value
    setTotal(
      selectedItems.reduce((sum, item) => sum + (item?.basePrice || 0), 0)
    );
    // Calculate total flea costs
    setFleaCosts(selectedItems.map((item) => (item ? item.price : 0)));
  }, [selectedItems, threshold]);

  // Update the selected item in the list
  const updateSelectedItem = (
    item: SimplifiedItem | null,
    index: number
  ): void => {
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = item;
    setSelectedItems(newSelectedItems);
    // Flea costs are updated via useEffect
  };

  // **11. Handle Auto Select**
  const handlePinItem = (index: number) => {
    const newPinnedItems = [...pinnedItems];
    newPinnedItems[index] = !newPinnedItems[index];
    setPinnedItems(newPinnedItems);
  };

  const handleAutoSelect = async (): Promise<void> => {
    setIsCalculating(true);
    setProgressValue(0);

    const validItems: SimplifiedItem[] = items.filter((item) => item.price > 0);

    // Simulate calculation progress
    const interval = setInterval(() => {
      setProgressValue((prev) => (prev >= 100 ? 100 : prev + 10));
    }, 100);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pinnedTotal = selectedItems.reduce(
      (sum, item, index) =>
        sum + (pinnedItems[index] && item ? item.basePrice : 0),
      0
    );

    const remainingThreshold = Math.max(0, threshold - pinnedTotal);

    const bestCombination = findBestCombination(
      validItems.filter(
        (item) =>
          !selectedItems.some(
            (selected, index) =>
              pinnedItems[index] && selected?.uid === item.uid
          )
      ),
      remainingThreshold,
      5 - pinnedItems.filter(Boolean).length
    );

    if (bestCombination.selected.length === 0 && remainingThreshold > 0) {
      alert("No combination of items meets the remaining threshold.");
      setIsCalculating(false);
      clearInterval(interval);
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
    setSelectedItems(newSelectedItems);
    setIsCalculating(false);
    clearInterval(interval);
  };

  // **13. Handle Mode Toggle Reset**
  const handleModeToggle = (checked: boolean): void => {
    setIsPVE(checked);
    setSelectedItems(Array(5).fill(null)); // Reset selected items
    setPinnedItems(Array(5).fill(false)); // Reset pinned items
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

  // **15. Render Loading and Error States**
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-my_bg_image text-gray-100">
        <div className="text-center">
          <Progress className="mb-4" value={50} />
          <p>Loading data...</p>
        </div>
        <div className="flex justify-center mt-4">
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
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen grid place-items-center bg-my_bg_image text-gray-100 p-4 overflow-auto ">
      <Card className="bg-gray-800 border-gray-700 shadow-lg max-h-fit overflow-auto py-8 px-6 relative w-full max-w-2xl mx-auto bg-opacity-50 ">
        {/* **4. Dialog for Instructions** */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="absolute top-4 left-2 animate-float hover:text-green-300 text-yellow-500">
              <HelpCircle className="h-10 w-10" />
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

        <CardContent className="p-6">
          {/* **5. Header with Title and Beta Badge** */}
          <h1 className="sm:text-4xl text-2xl font-bold mb-2 text-center text-red-500 text-nowrap flex items-center justify-center w-full">
            <FlameKindling className="mr-2 text-red-450 animate-pulse" />
            Cultist Calculator
            <FlameKindling className="ml-2 text-red-450 animate-pulse" />
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
          <div className="space-y-2 w-full">
            {isCalculating ? (
              <Progress
                className="mx-auto mt-4 mb-4 w-full"
                value={progressValue}
              /> // Show progress
            ) : (
              <Button
                variant="default"
                onClick={handleAutoSelect}
                className="flex mt-4 mx-auto text-gray-200 bg-gray-500 hover:bg-gray-900"
              >
                Auto Pick
              </Button>
            )}

            {/* **9. Item Selection Components** */}
            {selectedItems.map((item, index) => (
              <ItemSelector
                key={index}
                items={items}
                selectedItem={item}
                onSelect={(selectedItem) =>
                  updateSelectedItem(selectedItem, index)
                }
                onCopy={() => handleCopyToClipboard(index)}
                onPin={() => handlePinItem(index)}
                isPinned={pinnedItems[index]}
              />
            ))}
          </div>

          {/* **10. Sacrifice Value Display** */}
          <div className="mt-6 text-center w-full">
            <h2 className="text-3xl font-bold mb-2 text-gray-300">
              Sacrifice Value
            </h2>
            <div
              className={`text-6xl font-extrabold ${
                isThresholdMet
                  ? "text-green-500 animate-pulse"
                  : "text-red-500 animate-pulse"
              }`}
            >
              ₽{total.toLocaleString()}
            </div>
            {!isThresholdMet && (
              <div className="text-red-500 mt-2">
                Remaining Value Needed: ₽{(threshold - total).toLocaleString()}
              </div>
            )}
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-400">
                Flea Cost ≈ ₽{totalFleaCost.toLocaleString()}
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
    </div>
  );
}
