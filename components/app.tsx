'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skull, X, HelpCircle } from 'lucide-react'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog"
import itemsData from '../public/all_items_PVE.json'

const THRESHOLD = 350001

interface Item {
  id: string;
  name: string;
  value: number;
  avg24hPrice: number;
}

export function App() {
  const [selectedItems, setSelectedItems] = useState<Array<Item | null>>(Array(5).fill(null))
  const [total, setTotal] = useState<number>(0)
  const [fleaCosts, setFleaCosts] = useState<Array<number>>(Array(5).fill(0))

  const items = useMemo(() => {
    return itemsData
      .filter(item => item.tags.includes("Barter"))
      .map(({ uid, name, basePrice, avg24hPrice }) => ({ id: uid, name, value: basePrice, avg24hPrice }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  useEffect(() => {
    setTotal(selectedItems.reduce((sum, item) => sum + (item?.value || 0), 0))
  }, [selectedItems])

  const updateSelectedItem = (itemId: string, index: number) => {
    const selectedItem = items.find(item => item.id === itemId) || null
    const newSelectedItems = [...selectedItems]
    newSelectedItems[index] = selectedItem
    setSelectedItems(newSelectedItems)
    updateFleaCosts(newSelectedItems, index, selectedItem)
  }

  const updateFleaCosts = (newSelectedItems: Array<Item | null>, index: number, selectedItem: Item | null) => {
    const newFleaCosts = [...fleaCosts]
    newFleaCosts[index] = selectedItem ? selectedItem.avg24hPrice : 0
    setFleaCosts(newFleaCosts)
  }

  const handleResetItem = (index: number) => {
    const newSelectedItems = [...selectedItems]
    newSelectedItems[index] = null
    setSelectedItems(newSelectedItems)
    updateFleaCosts(newSelectedItems, index, null)
  }

  const handleAutoSelect = () => {
    const validItems = items.filter(item => item.avg24hPrice > 0)
    const bestCombination = findBestCombination(validItems)

    // Prepare new selected items and flea costs in one go
    const newSelectedItems = bestCombination.selected.slice(0, 5);
    const newFleaCosts = newSelectedItems.map(item => item.avg24hPrice);

    // Update state once
    setSelectedItems(newSelectedItems);
    setFleaCosts(newFleaCosts);
  }

  const findBestCombination = (validItems: Item[]) => {
    const maxValue = validItems.reduce((sum, item) => sum + item.value, 0);
    const dpSize = Math.min(maxValue, THRESHOLD + 100); // Limit DP size
    const dp: number[] = Array(dpSize + 1).fill(Infinity);
    dp[0] = 0; // Base case: 0 value costs nothing

    const itemSelection: number[][] = Array(dpSize + 1).fill(null).map(() => []);

    for (let i = 0; i < validItems.length; i++) {
      const { value, avg24hPrice } = validItems[i];

      for (let v = dpSize; v >= value; v--) {
        if (dp[v - value] + avg24hPrice < dp[v]) {
          dp[v] = dp[v - value] + avg24hPrice;
          itemSelection[v] = [...itemSelection[v - value], i];
        }
      }
    }

    let minCost = Infinity;
    let bestValue = -1;

    for (let v = THRESHOLD; v <= dpSize; v++) {
      if (dp[v] < minCost) {
        minCost = dp[v];
        bestValue = v;
      }
    }

    if (bestValue === -1) {
      return { selected: [], totalFleaCost: 0 };
    }

    const selectedIndices = itemSelection[bestValue];
    const selectedItems = selectedIndices.map(index => validItems[index]);

    return { selected: selectedItems, totalFleaCost: minCost };
  }

  const isThresholdMet = total >= THRESHOLD
  const totalFleaCost = fleaCosts.reduce((sum, cost) => sum + cost, 0)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
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
                Select items from the dropdown to calculate the total ritual value. 
                Ensure the total meets the cultist threshold for rewards.
                Flea prices are based on 24h average (As of September 16, 2024).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-red-500 flex items-center justify-center">
            <Skull className="mr-2" /> Cultist Calculator <Skull className="ml-2" />
          </h1>
          <div className="space-y-4 w-full">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex flex-col items-start space-y-1 w-full">
                <div className="flex items-center space-x-2 w-full">
                  <Select onValueChange={(value) => updateSelectedItem(value, index)} value={item?.id.toString() || ""}>
                    <SelectTrigger 
                      className={`w-full bg-gray-700 border-gray-600 text-gray-100 transition-all duration-300 ${item ? 'border-2 border-blue-500' : ''}`}
                    >
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 max-h-60 overflow-auto">
                      {Object.entries(
                        items.reduce((acc, item) => {
                          const firstLetter = item.name[0].toUpperCase()
                          if (!acc[firstLetter]) acc[firstLetter] = []
                          acc[firstLetter].push(item)
                          return acc
                        }, {} as Record<string, Item[]>)
                      ).map(([letter, groupedItems]) => (
                        <div key={letter}>
                          <div className="font-bold text-gray-300 px-2 py-1">{letter}</div>
                          {groupedItems.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()} className="text-gray-100 px-2 py-1">
                              {item.name} (₽{item.value.toLocaleString()})
                            </SelectItem>
                          ))}
                        </div>
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
                    Flea cost (24h avg): ₽{fleaCosts[index].toLocaleString()}
                  </div>
                )}
              </div>
            ))} 
          </div>
          <div className="mt-6 text-center">
            <h2 className="text-xl mb-2 text-gray-300">Ritual Value</h2>
            <div className={`text-6xl font-bold ${isThresholdMet ? 'text-green-500 animate-pulse' : 'text-red-500 animate-pulse'}`}>
              ₽{total.toLocaleString()}
            </div>
            <div className="mt-2 text-gray-300">
              {isThresholdMet 
                ? 'Cultist Threshold Met!' 
                : `₽${(THRESHOLD - total).toLocaleString()} more to meet the threshold`}
            </div>
            <div className="mt-2 text-gray-400 text-sm">
              Total Flea Cost (24h avg): ₽{totalFleaCost.toLocaleString()}
            </div>
          </div>
          <Button 
            variant='default'
            onClick={handleAutoSelect} 
            className="flex mt-4 mx-auto"
          >
            Auto Select Best Combination
          </Button>
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
        </footer>
      </Card>
    </div>
  )
}
