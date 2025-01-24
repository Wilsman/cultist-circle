"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons"
import Image from "next/image"

interface Item {
  id: string
  name: string
  bonus: number
  icon: string | JSX.Element
}

const items: Item[] = [
  { id: "none", name: "NONE", bonus: 0, icon: "X" },
  { 
    id: "sacred-amulet", 
    name: "Sacred Amulet", 
    bonus: 15, 
    icon: (
      <Image
        src="https://assets.tarkov.dev/64d0b40fbe2eed70e254e2d4-icon.webp"
        alt="Sacred Amulet"
        width={32}
        height={32}
        className="object-contain"
        priority
      />
    )
  },
]

export default function ItemSocket() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [hideoutLevel, setHideoutLevel] = useState<number>(1)
  const [open, setOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const calculateBonus = (baseBonus: number, level: number) => {
    const levelMultiplier = level / 100; // Level 50 = 0.5 multiplier
    const levelBonus = baseBonus * levelMultiplier;
    return baseBonus + levelBonus;
  };

  const totalBonus = selectedItem ? Number(calculateBonus(selectedItem.bonus, hideoutLevel).toFixed(1)) : 0;

  return (
    <div className="flex flex-col items-center text-center w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">Bonus Settings</span>
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </Button>

      <div className={`
        overflow-hidden transition-all duration-300 ease-in-out w-full flex flex-col items-center
        ${isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-gray-300">
            Total bonus to the Gift <span className="text-red-500 font-bold">{totalBonus}%</span>
          </span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className={`w-12 h-12 p-1 border-gray-700 bg-gray-800 hover:bg-gray-900/50 ${!selectedItem ? "text-gray-600" : "text-gray-200"}`}
                >
                  {selectedItem ? selectedItem.icon : "X"}
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="bg-gray-900/95 border-gray-700 text-gray-200">
              <div className="grid gap-2">
                {items.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="justify-start border-gray-700 bg-gray-800 hover:bg-gray-900/20 hover:text-gray-200"
                    onClick={() => {
                      setSelectedItem(item.id === "none" ? null : item)
                      setOpen(false)
                    }}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {selectedItem && selectedItem.id !== 'none' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="font-mono text-gray-300">Level:</span>
              <select
                value={hideoutLevel}
                onChange={(e) => setHideoutLevel(Number(e.target.value))}
                className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-16 text-center"
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Show a small indicator of the bonus when collapsed */}
      {!isExpanded && totalBonus > 0 && (
        <div className="text-xs text-gray-400">
          +{totalBonus}%
        </div>
      )}
    </div>
  )
}
