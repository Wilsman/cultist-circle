// app.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { X, HelpCircle, FlameKindling, Edit } from "lucide-react";
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
import itemsDataPVE from "../public/all_items_PVE.json";
import itemsDataPVP from "../public/all_items_PVP.json";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const IGNORED_ITEMS = ["Metal fuel tank (0/100)"]; // List of items to ignore

interface Item {
  id: string;
  name: string;
  value: number;
  avg24hPrice: number;
}

export function App() {
  const [isPVE, setIsPVE] = useState(true); // Toggle between PVE and PVP
  const [selectedItems, setSelectedItems] = useState<Array<Item | null>>(
    Array(5).fill(null)
  );
  const [total, setTotal] = useState<number>(0);
  const [fleaCosts, setFleaCosts] = useState<Array<number>>(Array(5).fill(0));
  const [isCalculating, setIsCalculating] = useState(false); // Calculating state
  const [progressValue, setProgressValue] = useState(0); // Progress value
  const [searchQueries, setSearchQueries] = useState<string[]>(Array(5).fill(""));

  // **1. Threshold as State**
  const [threshold, setThreshold] = useState<number>(350001);
  const [tempThreshold, setTempThreshold] = useState<string>(threshold.toLocaleString());
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] = useState(false);

  const itemsData = isPVE ? itemsDataPVE : itemsDataPVP; // Choose data based on mode

  const FILTER_TAGS = useMemo(() => ["Barter", "Provisions", "Repair", "Keys"], []);

  const items: Item[] = useMemo(() => {
    return itemsData
      .filter(
        (item: { uid: string; name: string; basePrice: number; avg24hPrice: number; tags: string[] }) =>
          FILTER_TAGS.some(tag => item.tags.includes(tag)) &&
          !IGNORED_ITEMS.includes(item.name)
      )
      .map(({ uid, name, basePrice, avg24hPrice }: { uid: string; name: string; basePrice: number; avg24hPrice: number }) => ({
        id: uid,
        name,
        value: basePrice,
        avg24hPrice,
      }))
      .sort((a: Item, b: Item) => a.name.localeCompare(b.name));
  }, [itemsData, FILTER_TAGS]);

  // Initialize Fuse.js for each search input
  const fuseInstances = useMemo(() => {
    return searchQueries.map(() =>
      new Fuse(items, {
        keys: ["name"],
        threshold: 0.3,
      })
    );
  }, [items, searchQueries]);

  // **2. Effect to Recalculate Total and Flea Costs**
  useEffect(() => {
    // Calculate total ritual value
    setTotal(selectedItems.reduce((sum, item) => sum + (item?.value || 0), 0));
    // Calculate total flea costs
    setFleaCosts(selectedItems.map((item) => (item ? item.avg24hPrice : 0)));
  }, [selectedItems, threshold]); // Added threshold as a dependency

  const updateSelectedItem = (itemId: string, index: number) => {
    const selectedItem = items.find((item) => item.id === itemId) || null;
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = selectedItem;
    setSelectedItems(newSelectedItems);
    // Flea costs are updated via useEffect
  };

  const handleResetItem = (index: number) => {
    const newSelectedItems = [...selectedItems];
    newSelectedItems[index] = null;
    setSelectedItems(newSelectedItems);
    // Flea costs are updated via useEffect
  };

  const handleAutoSelect = async () => {
    setIsCalculating(true); // Start calculating
    setProgressValue(0); // Reset progress

    const validItems = items.filter((item) => item.avg24hPrice > 0);

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
    const newSelectedItems: Array<Item | null> = Array(5).fill(null);
    bestCombination.selected.forEach((item, idx) => {
      if (idx < 5) {
        newSelectedItems[idx] = item;
      }
    });
    setSelectedItems(newSelectedItems);
    setIsCalculating(false); // End calculating
    clearInterval(interval); // Clear progress interval
  };

  /**
   * **findBestCombination Function**
   * Finds the best combination of items that meets or exceeds the threshold with minimal flea cost.
   *
   * @param validItems - Array of items with avg24hPrice > 0
   * @param threshold - Current threshold value
   * @param maxItems - Maximum number of items to select
   * @returns An object containing the selected items and the total flea cost
   */
  const findBestCombination = (
    validItems: Item[],
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

    dp[0][0] = 0; // Base case

    // Populate DP table
    for (let c = 1; c <= maxItems; c++) {
      for (let i = 0; i < validItems.length; i++) {
        const { value, avg24hPrice } = validItems[i];
        for (let v = value; v <= threshold + 1000; v++) {
          if (dp[c - 1][v - value] + avg24hPrice < dp[c][v]) {
            dp[c][v] = dp[c - 1][v - value] + avg24hPrice;
            itemTracking[c][v] = [...itemTracking[c - 1][v - value], i];
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

  const isThresholdMet = total >= threshold;
  const totalFleaCost = fleaCosts.reduce((sum, cost) => sum + cost, 0);

  // Refs for search inputs
  const searchInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // **3. Handle Threshold Change Submission**
  const handleThresholdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(tempThreshold.replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setThreshold(parsed);
      setIsThresholdDialogOpen(false);
    } else {
      alert("Please enter a valid positive number.");
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4 overflow-auto">
      <Card className="bg-gray-800 border-gray-700 shadow-lg w-full max-w-md max-h-[90vh] overflow-auto py-8 px-4 relative">
        {/* **4. Alert Dialog for Instructions** */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="absolute top-4 left-2 animate-float hover:text-green-300 text-yellow-500">
              <HelpCircle className="h-10 w-10" />
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>How to Use</AlertDialogTitle>
              <AlertDialogDescription>
                <h3>How to Use the App:</h3>
                <ul>
                  <li>🔵 Toggle between PVE and PVP modes to use correct flea prices.</li>
                  <li>🔵 Select items from the dropdown to calculate the total ritual value.</li>
                  <li>🔵 Ensure the total value meets the cultist threshold of 350,001 roubles.</li>
                  <li>🔵 Use the auto-select button to find the best combination of items.</li>
                  <li>🔵 If the threshold is met, sacrifice the items to receive a 14-hour countdown.</li>
                  <li>🔴 14-hour result has known bug which can outcome empty.</li>
                  <li>🔵 Ability to edit the threshold value through the interface.</li>
                  <li>🟢 Note: Flea prices are based on 24h average (As of September 18, 2024).</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CardContent className="p-6">
          {/* **5. Header with Title and Beta Badge** */}
          <h1 className="text-3xl font-bold mb-1 text-center text-red-500 flex items-center justify-center">
            <FlameKindling className="mr-2 text-red-450 animate-pulse" /> 
            Cultist Calculator 
            <FlameKindling className="ml-2 text-red-450 animate-pulse" />
            <div className="ml-2">
              <BetaBadge />
            </div>
          </h1>

          {/* **6. Mode Toggle (PVE/PVP)** */}
          <div className="flex items-center justify-center mb-6">
            <Switch
              checked={isPVE}
              onCheckedChange={(checked) => {
                setIsPVE(checked);
                setSelectedItems(Array(5).fill(null)); // Reset selected items
                setSearchQueries(Array(5).fill("")); // Reset search queries
              }}
              className="mr-2"
            />
            <span className="text-gray-300">
              {isPVE ? "PVE Mode" : "PVP Mode"}
            </span>
          </div>

          {/* **7. Display Current Threshold and Edit Button** */}
          <div className="flex items-center justify-center mb-4">
            <span className="text-gray-500 mr-2">Threshold:</span>
            <span className="text-xl font-semibold text-gray-300">
              ₽{threshold.toLocaleString()}
            </span>
            <Dialog open={isThresholdDialogOpen} onOpenChange={setIsThresholdDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1 p-0 bg-transparent hover:bg-transparent">
                  <Edit className="h-5 w-5 text-gray-400 hover:text-gray-200" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] bg-gray-800">
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
                    <Button type="button" variant="ghost" onClick={() => setIsThresholdDialogOpen(false)}>
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
              <Progress className="mt-4 w-full" value={progressValue} /> // Show progress
            ) : (
              <Button
                variant="default"
                onClick={handleAutoSelect}
                className="flex mt-4 mx-auto text-gray-200 bg-gray-500 hover:bg-gray-900"
              >
                Auto Select
              </Button>
            )}

            {/* **9. Item Selection Dropdowns** */}
            {selectedItems.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-start space-y-1 w-full"
              >
                <div className="flex items-center space-x-2 w-full">
                  <Select
                    onValueChange={(value) => updateSelectedItem(value, index)}
                    value={item?.id.toString() || ""}
                  >
                    <SelectTrigger
                      className={`w-full max-w-[300px] bg-gray-700 border-gray-600 text-gray-100 text-xs transition-all duration-300 ${
                        item ? "border-2 border-blue-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 max-h-60 overflow-auto">
                      {/* Search Input */}
                      <div className="px-2 py-1">
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQueries[index]}
                          onChange={(e) => {
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
                          : items.filter((item) => item.avg24hPrice > 0)
                              .sort(
                                (a, b) =>
                                  a.avg24hPrice / a.value - b.avg24hPrice / b.value
                              );

                        return filteredItems
                          .map((item) => ({
                            ...item,
                            delta: item.avg24hPrice / item.value, // Calculate delta as avg24hPrice per value
                          }))
                          .sort((a, b) => a.delta - b.delta) // Sort by delta low to high
                          .map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id.toString()}
                              className="text-gray-100 px-2 py-1"
                            >
                              {item.name} (₽{item.value.toLocaleString()})
                            </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleResetItem(index)}
                    className="bg-gray-700 hover:bg-gray-600 flex-shrink-0"
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
            ))}
          </div>

          {/* **10. Sacrifice Value Display** */}
          <div className="mt-6 text-center">
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
        </footer>
      </Card>
    </div>
  );
}
