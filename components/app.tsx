"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import itemsDataPVE from "../public/all_items_PVE.json";
import itemsDataPVP from "../public/all_items_PVP.json";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import BetaBadge from "./ui/beta-badge";

const THRESHOLD = 350001;

const IGNORED_ITEMS = ["Metal fuel tank (0/100)"]; // List of items to ignore

interface Item {
  id: string;
  name: string;
  value: number;
  avg24hPrice: number;
}

export function App() {
  const [isPVE, setIsPVE] = useState(true); // State to toggle between PVE and PVP
  const [selectedItems, setSelectedItems] = useState<Array<Item | null>>(
    Array(5).fill(null)
  );
  const [total, setTotal] = useState<number>(0);
  const [fleaCosts, setFleaCosts] = useState<Array<number>>(Array(5).fill(0));
  const [isCalculating, setIsCalculating] = useState(false); // State for calculating
  const [progressValue, setProgressValue] = useState(0); // State for progress value

  const itemsData = isPVE ? itemsDataPVE : itemsDataPVP; // Choose data based on toggle

  const items = useMemo(() => {
    return itemsData
      .filter(
        (item) =>
          item.tags.includes("Barter") && !IGNORED_ITEMS.includes(item.name)
      ) // Exclude ignored items
      .map(({ uid, name, basePrice, avg24hPrice }) => ({
        id: uid,
        name,
        value: basePrice,
        avg24hPrice,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsData]); // Depend on itemsData

  useEffect(() => {
    // Calculate total ritual value
    setTotal(selectedItems.reduce((sum, item) => sum + (item?.value || 0), 0));
    // Calculate total flea costs
    setFleaCosts(selectedItems.map((item) => (item ? item.avg24hPrice : 0)));
  }, [selectedItems]);

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
    setIsCalculating(true); // Set calculating state
    setProgressValue(0); // Reset progress value

    const validItems = items.filter((item) => item.avg24hPrice > 0);

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
      return;
    }

    // Fill selectedItems with the best combination, allowing duplicates
    const newSelectedItems: Array<Item | null> = Array(5).fill(null);
    bestCombination.selected.forEach((item, idx) => {
      if (idx < 5) {
        newSelectedItems[idx] = item;
      }
    });
    setSelectedItems(newSelectedItems);
    setIsCalculating(false); // Reset calculating state
    clearInterval(interval); // Clear interval after calculation
  };

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

    dp[0][0] = 0; // Base case: 0 value with 0 items costs nothing

    // Populate DP table
    for (let c = 1; c <= maxItems; c++) {
      for (let i = 0; i < validItems.length; i++) {
        const { value, avg24hPrice } = validItems[i];
        for (let v = 0; v <= threshold + 1000; v++) {
          if (v - value >= 0 && dp[c - 1][v - value] + avg24hPrice < dp[c][v]) {
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

  const isThresholdMet = total >= THRESHOLD;
  const totalFleaCost = fleaCosts.reduce((sum, cost) => sum + cost, 0);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4 overflow-auto">
      {" "}
      <Card className="bg-gray-800 border-gray-700 shadow-lg w-full max-w-md max-h-[90vh] overflow-auto py-8 px-4 relative">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="absolute top-3 left-2 animate-float text-white hover:text-green-300">
              <HelpCircle className="h-5 w-5" />
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>How to Use</AlertDialogTitle>
              <AlertDialogDescription>
                Explore the Cultist Calculator to optimize your ritual rewards.
                Select items from the dropdown to calculate the total ritual
                value, ensuring it meets the cultist threshold. Use the
                auto-select button to find the best combination of items. Note:
                Flea prices are based on 24h average (As of September 18, 2024).
                Tip: Toggle between PVE and PVP modes to adjust your strategy.
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
              <BetaBadge />
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
            />
            <span className="text-gray-300">
              {isPVE ? "PVE Mode" : "PVP Mode"}
            </span>
          </div>
          <div className="space-y-4 w-full">
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
                      className={`w-full bg-gray-700 border-gray-600 text-gray-100 transition-all duration-300 ${
                        item ? "border-2 border-blue-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 max-h-60 overflow-auto">
                      {items
                        .filter((item) => item.avg24hPrice > 0) // Exclude items with 0 avg24hPrice
                        .map((item) => ({
                          ...item,
                          delta: item.avg24hPrice / item.value, // Calculate delta as avg24hPrice per value
                        }))
                        .sort((a, b) => a.delta - b.delta) // Sort by delta low to high (cheapest avg24hPrice per value)
                        .map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id.toString()}
                            className="text-gray-100 px-2 py-1"
                          >
                            {item.name} (₽{item.value.toLocaleString()})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleResetItem(index)}
                    className="bg-gray-700 hover:bg-gray-600"
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
          <div className="mt-6 text-center">
            <h2 className="text-3xl font-bold mb-2 text-gray-300">
              Sacrifice Value
            </h2>
            <div
              className={`text-7xl font-extrabold ${
                isThresholdMet
                  ? "text-green-500 animate-pulse"
                  : "text-red-500 animate-pulse"
              }`}
            >
              ₽{total.toLocaleString()}
            </div>
            {!isThresholdMet && (
              <div className="text-red-500 mt-2">
                Remaining Value Needed: ₽{(THRESHOLD - total).toLocaleString()}
              </div>
            )}
            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-400">
                Flea Cost ≈ ₽{totalFleaCost.toLocaleString()}
              </div>
            </div>
          </div>
          {isCalculating ? (
            <Progress className="mt-4" value={progressValue} /> // Show progress component while calculating
          ) : (
            <Button
              variant="default"
              onClick={handleAutoSelect}
              className="flex mt-4 mx-auto text-pink-500"
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
