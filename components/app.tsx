'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skull, Droplet, X } from 'lucide-react'

// Import the JSON data
import itemsData from '../public/all_items_PVE.json' // Adjust the path as necessary

const THRESHOLD = 350001
const HIGH_VALUE_THRESHOLD = 80000

export function App() {
  const [selectedItems, setSelectedItems] = useState(Array(5).fill(null))
  const [total, setTotal] = useState(0)
  const [highValueChance, setHighValueChance] = useState(false)

  // Memoize and filter the JSON data to only include "Barter" items
  const items = useMemo(() => 
    itemsData
      .filter(item => item.tags.includes("Barter")) // Only include items with "Barter" tag
      .map(item => ({
        id: item.uid,
        name: item.name,
        value: item.basePrice
      }))
      .sort((a, b) => a.name.localeCompare(b.name)), // Sort items by name
    [/* itemsData */] // Removed itemsData
  )

  useEffect(() => {
    const newTotal = selectedItems.reduce((sum, item) => sum + (item?.value || 0), 0)
    setTotal(newTotal)
    setHighValueChance(selectedItems.some(item => item && item.value > HIGH_VALUE_THRESHOLD))
  }, [selectedItems])

  const handleSelectItem = (itemId: string, index: number) => {
    const newSelectedItems = [...selectedItems]
    newSelectedItems[index] = items.find(item => item.id === itemId) || null
    setSelectedItems(newSelectedItems)
  }

  const handleResetItem = (index: number) => {
    const newSelectedItems = [...selectedItems]
    newSelectedItems[index] = null
    setSelectedItems(newSelectedItems)
  }

  const isThresholdMet = total >= THRESHOLD

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
      <Card className="bg-gray-800 border-gray-700 shadow-lg w-full max-w-md max-h-[90vh] overflow-auto py-8 px-4">
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-red-500 flex items-center justify-center">
            <Skull className="mr-2" /> Cultist Calculator <Skull className="ml-2" />
          </h1>
          <div className="space-y-4 w-full">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center space-x-2 w-full">
                <Select onValueChange={(value) => handleSelectItem(value, index)} value={item?.id.toString() || ""} 
                >
                  <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-gray-100">
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
            ))}
          </div>
          <div className="mt-6 text-center">
            <h2 className="text-xl mb-2 text-gray-300">Ritual Value</h2>
            <div className={`text-5xl font-bold ${isThresholdMet ? 'text-green-500 animate-pulse' : 'text-red-500'}`}>
              ₽{total.toLocaleString()}
            </div>
            <div className="mt-2 text-gray-400">
              {isThresholdMet 
                ? 'Ritual complete! The cultists are summoned...' 
                : `₽${(THRESHOLD - total).toLocaleString()} more to complete the ritual`}
            </div>
            {highValueChance && (
              <div className="mt-2 text-blue-400 flex items-center justify-center">
                <Droplet className="mr-2" />
                Chance for rare loot increased!
                <Droplet className="ml-2" />
              </div>
            )}
          </div>
        </CardContent>
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