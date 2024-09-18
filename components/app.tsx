// app.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, HelpCircle, FlameKindling } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import dynamic from 'next/dynamic';
import Spinner from '@/components/Spinner';
import SkeletonSelect from '@/components/SkeletonSelect';

// Lazy load BetaBadge with Suspense
const BetaBadge = dynamic(() => import('./ui/beta-badge'), {
  suspense: true,
  loading: () => <div className="animate-pulse bg-yellow-500 h-4 w-12 rounded-full"></div>,
});

const THRESHOLD = 350001;

const IGNORED_ITEMS = ["Metal fuel tank (0/100)"]; // List of items to ignore

export function App() {
  const [isPVE, setIsPVE] = useState(false); // State to toggle between PVE and PVP
  const [selectedItems, setSelectedItems] = useState<Array<Item | null>>(Array(5).fill(null));
  const [total, setTotal] = useState<number>(0);
  const [fleaCosts, setFleaCosts] = useState<Array<number>>(Array(5).fill(0));
  const [isCalculating, setIsCalculating] = useState(false); // State for calculating
  const [progressValue, setProgressValue] = useState(0); // State for progress value
  const [itemsData, setItemsData] = useState<Array<Item>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define the item type
  interface Item {
    uid: string;
    name: string;
    basePrice: number;
    price: number;
    tags: string[];
  }

  // Memoize the items array
  const items = useMemo(() => {
    return itemsData
      .filter(
        (item: Item) =>
          item.tags.includes("Barter") &&
          !IGNORED_ITEMS.includes(item.name) &&
          item.uid // Ensure item.uid exists
      )
      .map(({ uid, name, basePrice, price, tags }: Item) => ({
        uid,
        name,
        basePrice, // Include basePrice
        value: basePrice, // Map basePrice to value
        price,
        tags,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsData]);

  // Handler to update selected item
  const updateSelectedItem = useCallback((itemUid: string, index: number) => {
    const selectedItem = items.find((item) => item.uid === itemUid) || null;
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = selectedItem ? { ...selectedItem } : null; // Ensure selectedItem is valid
    setSelectedItems(newSelectedItems);
    // Flea costs are updated via useEffect
  }, [items, selectedItems]);

  // Handler to reset selected item
  const handleResetItem = useCallback((index: number) => {
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = null;
    setSelectedItems(newSelectedItems);
    // Flea costs are updated via useEffect
  }, [selectedItems]);

  const findBestCombination = useCallback(
    (
      validItems: Array<Item>,
      threshold: number,
      maxItems: number
    ) => {
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
  
      dp[0][0] = 0; // Base case: 0 value with 0 items costs nothing
  
      // Populate DP table
      for (let c = 1; c <= maxItems; c++) {
        for (let i = 0; i < validItems.length; i++) {
          const { basePrice, price } = validItems[i]; // Use basePrice instead of value
          for (let v = basePrice; v <= threshold + 1000; v++) {
            // Start from value to avoid negative indices
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
      const selectedItems = selectedIndices.map((index: number) => validItems[index]);
  
      return { selected: selectedItems, totalFleaCost: minFleaCost };
    },
    []
  );

  // Handler for auto-selecting items
  const handleAutoSelect = async () => {
    setIsCalculating(true); // Set calculating state
    setProgressValue(0); // Reset progress value

    const validItems = items.filter((item) => item.price > 0);

    // Simulate a delay for the calculation (if needed)
    const interval = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10; // Increment progress value
      });
    }, 100); // Update every 100ms

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate calculation time

    const bestCombination = findBestCombination(validItems, THRESHOLD, 5);

    if (bestCombination.selected.length === 0) {
      alert("No combination of items meets the threshold.");
      setIsCalculating(false); // Ensure calculating state is reset
      clearInterval(interval); // Clear interval
      return;
    }

    // Fill selectedItems with the best combination, allowing duplicates
    const newSelectedItems: Array<Item | null> = Array(5).fill(null);
    bestCombination.selected.forEach((item: Item, idx: number) => {
      if (idx < 5) {
        newSelectedItems[idx] = item;
      }
    });
    setSelectedItems(newSelectedItems);
    setIsCalculating(false); // Reset calculating state
    clearInterval(interval); // Clear interval after calculation
  };

  const isDataStale = (timestamp: number) => {
    const thirtyMinutes = 10 * 60 * 1000; // 10 minutes
    return Date.now() - timestamp > thirtyMinutes;
  };

    useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null); // Reset error state
      const mode = isPVE ? "pve" : "pvp";
      const storageKey = `itemsData_${mode}`;
      const storedData = localStorage.getItem(storageKey);
      const storedTimestamp = localStorage.getItem(`${storageKey}_timestamp`);
  
      if (storedData && storedTimestamp && !isDataStale(Number(storedTimestamp))) {
        setItemsData(JSON.parse(storedData));
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/items?mode=${mode}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error fetching items:", response.status, errorText);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
        const data: Item[] = await response.json(); // Use the defined Item type
      
        // Validate data structure
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format received from server.");
        }
      
        setItemsData(data);
        localStorage.setItem(storageKey, JSON.stringify(data));
        localStorage.setItem(`${storageKey}_timestamp`, Date.now().toString());
      } catch (error: unknown) {
        console.error("Error fetching items:", error);
      
        // Use type guard to check if error is an instance of Error
        if (error instanceof Error) {
          setError(error.message || "Failed to fetch items.");
        } else {
          setError("An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }};
    
    fetchItems();
  }, [isPVE]);

  // Calculate totals when selectedItems change
  useEffect(() => {
    // Calculate total ritual value
    setTotal(selectedItems.reduce((sum, item) => sum + (item?.basePrice || 0), 0));
    // Calculate total flea costs
    setFleaCosts(selectedItems.map((item) => (item ? item.price : 0)));
  }, [selectedItems]);

  const isThresholdMet = total >= THRESHOLD;
  const totalFleaCost = fleaCosts.reduce((sum, cost) => sum + cost, 0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4 overflow-auto">
      {error ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <p className="text-red-500">Failed to load items: {error}</p>
          <Button onClick={() => setIsPVE(!isPVE)}>Retry</Button>
        </div>
      ) : (
        <Card className="bg-gray-800 border-gray-700 shadow-lg w-full max-w-lg sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-auto py-8 px-4 relative">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="absolute top-3 left-2 animate-float text-white hover:text-green-300 cursor-pointer"
                aria-label="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>How to Use</AlertDialogTitle>
                <AlertDialogDescription>
                  Explore the Cultist Calculator to optimize your ritual
                  rewards. Select items from the dropdown to calculate the total
                  ritual value, ensuring it meets the cultist threshold. Use the
                  auto-select button to find the best combination of items.
                  Note: Flea prices are based on live prices. Tip: Toggle between PVE and PVP modes for specific mode prices.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-center text-red-500 flex items-center justify-center">
              <FlameKindling className="mr-2 text-red-450 animate-pulse" />{" "}
              Cultist Calculator{" "}
              <FlameKindling className="ml-2 text-red-450 animate-pulse" />
              <div className="ml-2">
                <Suspense fallback={<Spinner />}>
                  <BetaBadge />
                </Suspense>
              </div>
            </h1>
            <div className="flex items-center justify-center mb-4">
              <Switch
                checked={isPVE}
                onCheckedChange={(checked) => {
                  setIsPVE(checked);
                  setSelectedItems(Array(5).fill(null)); // Reset selected items on toggle
                }}
                className="mr-2"
                aria-label="Toggle PVE/PVP mode"
              />
              <span className="text-gray-300">
                {isPVE ? "PVE Mode" : "PVP Mode"}
              </span>
            </div>
            <div className="space-y-4 w-full">
              {loading ? (
                <div className="flex flex-col items-center space-y-4">
                  <Spinner />
                  <span className="text-gray-300">Loading items...</span>
                  {Array(5).fill(0).map((_, idx) => (
                    <SkeletonSelect key={idx} />
                  ))}
                </div>
              ) : (
                selectedItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-start space-y-1 w-full"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <Select
                        onValueChange={(value) =>
                          updateSelectedItem(value, index)
                        }
                        value={item?.uid || ""}
                        aria-label={`Select item ${index + 1}`}
                      >
                        <SelectTrigger
                          className={`w-full bg-gray-700 border-gray-600 text-gray-100 transition-all duration-300 ${
                            item ? "border-2 border-blue-500" : ""
                          }`}
                        >
                          <SelectValue placeholder="Choose an item" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600 max-h-60 overflow-auto" role="listbox">
                          {items
                            .filter((item) => item.price > 0)
                            .map((item) => ({
                              ...item,
                              delta: item.price / item.value,
                            }))
                            .sort((a, b) => a.delta - b.delta)
                            .map((item) => (
                              <SelectItem
                                key={item.uid}
                                value={item.uid}
                                className="text-gray-100 px-2 py-1"
                              >
                                {item.name} (₽{item.value})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResetItem(index)}
                        className="bg-gray-700 hover:bg-gray-600"
                        aria-label={`Reset selection ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {fleaCosts[index] > 0 && (
                      <div className="text-gray-500 text-xs">
                        Flea cost ≈ ₽{fleaCosts[index].toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-3xl font-bold mb-2 text-gray-300">
                Sacrifice Value
              </h2>
              <div
                className={`text-7xl font-extrabold ${
                  isThresholdMet
                    ? "text-green-500 animate-pulse"
                    : "text-red-500 animate-pulse"
                } overflow-hidden text-ellipsis whitespace-nowrap`}
                aria-live="polite"
                style={{ maxWidth: '100%', fontSize: 'clamp(3rem, 5vw, 4rem)' }}
              >
                ₽{total.toLocaleString()}
              </div>
              {!isThresholdMet && (
                <div className="text-red-500 mt-2">
                  Remaining Value Needed: ₽
                  {(THRESHOLD - total).toLocaleString()}
                </div>
              )}
              <div className="mt-6">
                <div className="text-sm font-semibold text-gray-400">
                  Flea Cost ≈ ₽{totalFleaCost.toLocaleString()}
                </div>
              </div>
            </div>
            {isCalculating ? (
              <Progress className="mt-4" value={progressValue} aria-label="Calculation progress" />
            ) : (
              <Button
                variant="default"
                onClick={handleAutoSelect}
                className="flex mt-4 mx-auto text-pink-500 px-4 py-2 sm:px-6 sm:py-3"
                aria-label="Auto Select Items"
              >
                Auto Select
              </Button>
            )}
          </CardContent>
          <Separator className="my-1" />
          <footer className="mt-4 text-center text-gray-400 text-sm">
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
            <div className="flex justify-center mt-4">
              <a href="https://www.buymeacoffee.com/wilsman77" target="_blank" rel="noopener noreferrer">
                <Image
                  src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png"
                  alt="Buy Me A Coffee"
                  width={120}
                  height={30}
                  priority={false}
                  loading="lazy"
                  style={{ width: "auto", height: "auto" }}
                />
              </a>
            </div>
          </footer>
        </Card>
      )}
    </div>
  );
}