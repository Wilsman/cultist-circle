'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skull, X, HelpCircle } from 'lucide-react' // Import HelpCircle icon
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog" // Import AlertDialog components

// Import the JSON data
import itemsData from '../public/all_items_PVE.json' // Adjust the path as necessary

const THRESHOLD = 350001

export function App() {
  const [selectedItems, setSelectedItems] = useState(Array(5).fill(null))
  const [total, setTotal] = useState(0)
  const [fleaCosts, setFleaCosts] = useState(Array(5).fill(0))

  // Memoize and filter the JSON data to only include "Barter" items
  const items = useMemo(() => 
    itemsData
      .filter(item => item.tags.includes("Barter")) // Only include items with "Barter" tag
      .map(item => ({
        id: item.uid,
        name: item.name,
        value: item.basePrice,
        avg24hPrice: item.avg24hPrice
      }))
      .sort((a, b) => a.name.localeCompare(b.name)), // Sort items by name
    [/* itemsData */] // Removed itemsData
  )

  useEffect(() => {
    const newTotal = selectedItems.reduce((sum, item) => sum + (item?.value || 0), 0)
    setTotal(newTotal)
  }, [selectedItems])

  const handleSelectItem = (itemId: string, index: number) => {
    const newSelectedItems = [...selectedItems]
    const selectedItem = items.find(item => item.id === itemId) || null
    newSelectedItems[index] = selectedItem
    setSelectedItems(newSelectedItems)

    // Update flea costs
    const newFleaCosts = [...fleaCosts]
    newFleaCosts[index] = selectedItem ? selectedItem.avg24hPrice : 0
    setFleaCosts(newFleaCosts)
  }

  const handleResetItem = (index: number) => {
    const newSelectedItems = [...selectedItems]
    newSelectedItems[index] = null
    setSelectedItems(newSelectedItems)

    // Reset flea cost
    const newFleaCosts = [...fleaCosts]
    newFleaCosts[index] = 0 // Reset the flea cost to 0
    setFleaCosts(newFleaCosts)
  }

  const isThresholdMet = total >= THRESHOLD

  // Calculate total flea cost
  const totalFleaCost = fleaCosts.reduce((sum, cost) => sum + cost, 0)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
      <Card className="bg-gray-800 border-gray-700 shadow-lg w-full max-w-md max-h-[90vh] overflow-auto py-8 px-4 relative"> {/* Added relative positioning */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="absolute top-3 left-2 animate-float text-white hover:text-green-300"> {/* Removed button */}
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
                <div className="flex items-center space-x-2 w-full"> {/* Added flex container */}
                  <Select onValueChange={(value) => handleSelectItem(value, index)} value={item?.id.toString() || ""}>
                    <SelectTrigger 
                      className={`w-full bg-gray-700 border-gray-600 text-gray-100 transition-all duration-300 ${item ? 'border-2 border-blue-500' : ''}`} // Added border and transition
                    >
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {Object.entries(
                        items.reduce((acc, item) => {
                          const firstLetter = item.name[0].toUpperCase();
                          if (!acc[firstLetter]) acc[firstLetter] = [];
                          acc[firstLetter].push(item);
                          return acc;
                        }, {} as Record<string, typeof items>)
                      ).map(([letter, groupedItems]) => (
                        <div key={letter}>
                          <div className="font-bold text-gray-300">{letter}</div>
                          {groupedItems.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()} className="text-gray-100">
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
                {/* Display flea cost below the dropdown */}
                <div className="text-gray-500 text-xs">Flea cost (24h avg): ₽{fleaCosts[index].toLocaleString()}</div>
              </div>
            ))} 
          </div>
          <div className="mt-6 text-center">
            <h2 className="text-xl mb-2 text-gray-300">Ritual Value</h2>
            <div className={`text-6xl font-bold ${isThresholdMet ? 'text-green-500 animate-pulse' : 'text-red-500 animate-pulse'}`}>
              ₽{total.toLocaleString()}
            </div>
            {/* Separate flea total with smaller text */}
            <div className="mt-2 text-gray-300">
              {isThresholdMet 
                ? 'Cultist Threshold Met!' 
                : `₽${(THRESHOLD - total).toLocaleString()} more to meet the threshold`}
            </div>
            <div className="mt-2 text-gray-400 text-sm">
              Total Flea Cost (24h avg): ₽{totalFleaCost.toLocaleString()}
            </div>
          </div>
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