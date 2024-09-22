// app.tsx
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
import { X, HelpCircle, FlameKindling, Edit, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import BetaBadge from "./ui/beta-badge";
import Fuse from "fuse.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SimplifiedItem } from "@/types/SimplifiedItem"; // Newly added SimplifiedItem interface
import { FeedbackForm } from "./feedback-form";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const PVE_CACHE_KEY = "pveItemsCache";
const PVP_CACHE_KEY = "pvpItemsCache";

export function App() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isPVE, setIsPVE] = useState<boolean>(false); // Toggle between PVE and PVP
  const [selectedItems, setSelectedItems] = useState<
    Array<SimplifiedItem | null>
  >(Array(5).fill(null));
  const [total, setTotal] = useState<number>(0);
  const [fleaCosts, setFleaCosts] = useState<Array<number>>(Array(5).fill(0));
  const [isCalculating, setIsCalculating] = useState<boolean>(false); // Calculating state
  const [progressValue, setProgressValue] = useState<number>(0); // Progress value
  const [searchQueries, setSearchQueries] = useState<string[]>(
    Array(5).fill("")
  );
  const [isFeedbackFormVisible, setIsFeedbackFormVisible] =
    useState<boolean>(false);

  // **1. Threshold as State**
  const [threshold, setThreshold] = useState<number>(350001);
  const [tempThreshold, setTempThreshold] = useState<string>(
    threshold.toLocaleString()
  );
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] =
    useState<boolean>(false);

  // **2. State for Fetched Data**
  const [itemsDataPVP, setItemsDataPVP] = useState<SimplifiedItem[]>([]);
  const [itemsDataPVE, setItemsDataPVE] = useState<SimplifiedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dataFetchedRef = useRef(false);

  // **3. Fetch Data from Internal API Routes**
  const fetchData = useCallback(async () => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    try {
      setLoading(true);
      const [pveData, pvpData] = await Promise.all([
        fetchCachedData("/api/pve-items", PVE_CACHE_KEY),
        fetchCachedData("/api/pvp-items", PVP_CACHE_KEY),
      ]);

      setItemsDataPVE(pveData);
      setItemsDataPVP(pvpData);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? `Fetch Error: ${err.message}`
          : "An error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // **4. Choose Data Based on Mode**
  const itemsData: SimplifiedItem[] = isPVE ? itemsDataPVE : itemsDataPVP;

  // **5. Remove Client-Side Filtering**
  const items: SimplifiedItem[] = useMemo(() => {
    return [...itemsData].sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsData]);

  // Initialize Fuse.js for each search input
  const fuseInstances: Fuse<SimplifiedItem>[] = useMemo(() => {
    return searchQueries.map(
      () =>
        new Fuse(items, {
          keys: ["name"],
          threshold: 0.3,
        })
    );
  }, [items, searchQueries]);

  // **6. Effect to Recalculate Total and Flea Costs**
  useEffect(() => {
    // Calculate total ritual value
    setTotal(
      selectedItems.reduce((sum, item) => sum + (item?.basePrice || 0), 0)
    );
    // Calculate total flea costs
    setFleaCosts(selectedItems.map((item) => (item ? item.price : 0)));
  }, [selectedItems, threshold]); // Added threshold as a dependency

  const updateSelectedItem = (itemId: string, index: number): void => {
    const selectedItem = items.find((item) => item.uid === itemId) || null;
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = selectedItem;
    setSelectedItems(newSelectedItems);
    // Flea costs are updated via useEffect
  };

  const handleResetItem = (index: number): void => {
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = null;
    setSelectedItems(newSelectedItems);
    // Flea costs are updated via useEffect
  };

  const handleAutoSelect = async (): Promise<void> => {
    setIsCalculating(true); // Start calculating
    setProgressValue(0); // Reset progress

    const validItems: SimplifiedItem[] = items.filter((item) => item.price > 0);

    // Simulate calculation progress
    const interval = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10; // Increment progress
      });
    }, 100); // Every 100ms

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate calculation time

    const bestCombination = findBestCombination(validItems, threshold, 5);

    if (bestCombination.selected.length === 0) {
      alert("No combination of items meets the threshold.");
      setIsCalculating(false);
      clearInterval(interval);
      return;
    }

    // Populate selectedItems with the best combination
    const newSelectedItems: Array<SimplifiedItem | null> = Array(5).fill(null);
    bestCombination.selected.forEach((item, idx) => {
      if (idx < 5) {
        newSelectedItems[idx] = item;
      }
    });
    setSelectedItems(newSelectedItems);
    setSearchQueries(Array(5).fill("")); // Reset search queries to empty strings
    setIsCalculating(false); // End calculating
    clearInterval(interval); // Clear progress interval
  };

  /**
   * **findBestCombination Function**
   * Finds the best combination of items that meets or exceeds the threshold with minimal flea cost.
   *
   * @param validItems - Array of items with price > 0
   * @param threshold - Current threshold value
   * @param maxItems - Maximum number of items to select
   * @returns An object containing the selected items and the total flea cost
   */
  const findBestCombination = (
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
  };

  const isThresholdMet: boolean = total >= threshold;
  const totalFleaCost: number = fleaCosts.reduce((sum, cost) => sum + cost, 0);

  // Refs for search inputs
  const searchInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // **7. Handle Threshold Change Submission**
  const handleThresholdSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const parsed = parseInt(tempThreshold.replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setThreshold(parsed);
      setIsThresholdDialogOpen(false);
    } else {
      alert("Please enter a valid positive number.");
    }
  };

  // **8. Handle Mode Toggle Reset**
  const handleModeToggle = (checked: boolean): void => {
    setIsPVE(checked);
    setSelectedItems(Array(5).fill(null)); // Reset selected items
    setSearchQueries(Array(5).fill("")); // Reset search queries
  };

  // **9. Render Loading and Error States**
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-my_bg_image text-gray-100">
        <div className="text-center">
          <Progress className="mb-4" value={50} />
          <p>Loading data...</p>
        </div>
        <div className="flex justify-center mt-4">
          <a href="https://www.buymeacoffee.com/wilsman77" target="_blank">
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

  function timeAgo(date: Date): React.ReactNode {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return `${interval} year${interval > 1 ? "s" : ""} ago`;
    }
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return `${interval} month${interval > 1 ? "s" : ""} ago`;
    }
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return `${interval} day${interval > 1 ? "s" : ""} ago`;
    }
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return `${interval} hour${interval > 1 ? "s" : ""} ago`;
    }
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      if (interval < 60) {
        return `${interval} min${interval > 1 ? "s" : ""} ago`;
      }
      return `${Math.floor(interval / 60)} hour${
        Math.floor(interval / 60) > 1 ? "s" : ""
      } ago`;
    }
    return `${Math.floor(seconds)} second${seconds > 1 ? "s" : ""} ago`;
  }


  function handleCopytoClipboard(index: number): void {
    const item = selectedItems[index];
    if (item) {
      const textToCopy = `${item.name}`;
      navigator.clipboard.writeText(textToCopy).then(
        () => {
          setCopiedIndex(index);
          setTimeout(() => setCopiedIndex(null), 500); // Reset after 0.5 seconds
        },
        (err) => {
          console.error("Failed to copy text: ", err);
        }
      );
    }
  }

  return (
    // layout fills the screen height so there is no scrolling outside of the Card
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
                    🔵 Toggle between PVE and PVP modes to use correct flea
                    prices.
                  </li>
                  <li>
                    🔵 Select items from the dropdown to calculate the total
                    sacrifice value.
                  </li>
                  <li>
                    🔵 Ensure the total value meets the cultist threshold of
                    350,001 (base value).
                  </li>
                  <li>
                    🔵 Use the Auto Pick button to find the cheapest costing
                    combination that meets the threshold.
                  </li>
                  <li>
                    🔵 If the threshold is met, sacrifice the items to receive a
                    14-hour countdown.
                  </li>
                  <li>
                    🔵 Ability to edit the threshold value through the
                    interface.
                  </li>
                  <li>
                    🔴 BUG: 14-hour result has known bug which can result in an
                    empty reward.
                  </li>
                  <li>🟢 Note: 14 HR Highest Value Outcome {">"}= 350,001</li>
                  <li>
                    🟢 Note: 6 HR | Quest / Hideout item = 400,000 (Not Fully
                    Confirmed)
                  </li>
                  <li>
                    🟢 Note: Flea prices are live prices provided by
                    tarko-market.
                  </li>
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
            <Switch
              checked={isPVE}
              onCheckedChange={handleModeToggle}
              className="mr-2"
            />
            <span className="text-gray-300">
              {isPVE ? "PVE Mode" : "PVP Mode"}
            </span>
          </div>

          {/* **7. Display Current Threshold and Edit Button** */}
          <div className="flex items-center justify-center mb-4 w-full">
            <span className="text-gray-500 mr-2">Threshold:</span>
            <span className="text-xl font-semibold text-gray-300">
              ₽{threshold.toLocaleString()}
            </span>
            <Dialog
              open={isThresholdDialogOpen}
              onOpenChange={setIsThresholdDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-1 p-0 bg-transparent hover:bg-transparent"
                >
                  <Edit className="h-5 w-5 text-gray-400 hover:text-gray-200" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] bg-gray-800 w-full mx-auto">
                <DialogHeader>
                  <DialogTitle>Edit Threshold</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleThresholdSubmit} className="space-y-4">
                  <Input
                    type="text"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(e.target.value)}
                    placeholder="Enter a new threshold"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsThresholdDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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

            {/* **9. Item Selection Dropdowns** */}
            {selectedItems.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center space-y-1 flex-grow w-full"
              >
                <div className="flex items-center space-x-2 w-full justify-center">
                  <Select
                    onValueChange={(value: string) =>
                      updateSelectedItem(value, index)
                    }
                    value={item?.uid.toString() || ""}
                  >
                    <SelectTrigger
                      className={`w-full max-w-[400px] bg-gray-700 border-gray-600 text-gray-100 text-xs transition-all duration-300 ${
                        item ? "border-2 border-blue-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 max-h-60 overflow-auto w-full">
                      {/* Search Input */}
                      <div className="px-2 py-1">
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQueries[index]}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            const newQueries = [...searchQueries];
                            newQueries[index] = e.target.value;
                            setSearchQueries(newQueries);
                          }}
                          onKeyDown={(e) => e.stopPropagation()} // Prevent Select from handling key events
                          ref={(el) => {
                            searchInputRefs.current[index] = el;
                          }}
                          className="w-full px-2 py-1 bg-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {/* Filtered Items */}
                      {(() => {
                        const query = searchQueries[index];
                        const fuse = fuseInstances[index];
                        const filteredItems = query
                          ? fuse.search(query).map((result) => result.item)
                          : items
                              .filter((item) => item.price > 0)
                              .sort(
                                (a, b) =>
                                  a.price / a.basePrice - b.price / b.basePrice
                              );

                        return filteredItems
                          .map((item) => ({
                            ...item,
                            delta: item.price / item.basePrice, // Calculate delta as price per value
                          }))
                          .sort((a, b) => a.delta - b.delta) // Sort by delta low to high
                          .map((item) => (
                            <SelectItem
                              key={item.uid}
                              value={item.uid.toString()}
                              className="text-gray-100 px-2 py-1"
                            >
                              {item.name} (₽{item.basePrice.toLocaleString()})
                            </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopytoClipboard(index)}
                    className={`bg-gray-700 hover:bg-gray-600 flex-shrink-0 hidden sm:flex items-center justify-center w-8 h-8 transition-colors duration-300 ${
                      copiedIndex === index ? 'bg-green-500' : ''
                    }`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleResetItem(index)}
                    className="bg-gray-700 hover:bg-gray-600 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* Display basePrice | flea cost and last updated */}
                {selectedItems[index] && fleaCosts[index] > 0 && (
                  <div className="text-gray-500 text-xs">
                    Value: ₽{selectedItems[index].basePrice.toLocaleString()} |
                    Flea ≈ ₽{fleaCosts[index].toLocaleString()} |{" "}
                    {timeAgo(new Date(selectedItems[index].updated))}
                  </div>
                )}
              </div>
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
          <div className="flex justify-center mt-4 space-x-4">
            <a href="https://www.buymeacoffee.com/wilsman77" target="_blank">
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
      <div className="background-creator">Created by Wilsman77</div>
      {isFeedbackFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <FeedbackForm onClose={() => setIsFeedbackFormVisible(false)} />
        </div>
      )}
    </div>
  );
}
