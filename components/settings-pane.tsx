'use client'

import { Filter, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"

interface SettingsPaneProps {
  onClose: () => void;
  onSortChange: (sortOption: string) => void;
}

export function SettingsPane({ onClose, onSortChange }: SettingsPaneProps) {
  const [sortOption, setSortOption] = useState<string>(() => {
    return localStorage.getItem('sortOption') || 'az'
  })

  useEffect(() => {
    localStorage.setItem('sortOption', sortOption)
    onSortChange(sortOption)
  }, [sortOption, onSortChange])

  return (
    <div className="flex h-[300px] max-w-[600px] rounded-lg border bg-slate-800 shadow relative">
      <Button
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>
      <div className="flex w-[60px] flex-col items-center border-r pt-4 pb-4">
        <Button variant="ghost" className="w-full p-2" title="Filter">
          <Filter className="h-5 w-5" />
        </Button>
        <div className="flex-grow"></div>
        <Button variant="ghost" className="w-full p-2" title="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 p-6 w-[250px]">
        <h2 className="text-lg font-semibold mb-4">Sort Options</h2>
        <RadioGroup value={sortOption} onValueChange={setSortOption}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="az" id="az" className={sortOption === 'az' ? 'bg-white' : ''} />
            <Label htmlFor="az">A-Z</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="price" id="price" className={sortOption === 'price' ? 'bg-white' : ''} />
            <Label htmlFor="price">Price: Low to High</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}