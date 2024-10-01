'use client'

import { Filter, Settings, X, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useState, useEffect, useRef } from "react"

interface SettingsPaneProps {
  onClose: () => void;
  onSortChange: (sortOption: string) => void;
  currentSortOption: string;
}

export function SettingsPane({ onClose, onSortChange, currentSortOption }: SettingsPaneProps) {
  const [sortOption, setSortOption] = useState<string>(currentSortOption);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSortChange(sortOption);
  }, [sortOption, onSortChange]);

  useEffect(() => {
    // Prevent background scroll
    document.body.style.overflow = 'hidden';

    // Handle click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (paneRef.current && !paneRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div ref={paneRef} className="flex h-[300px] max-w-[600px] rounded-lg border bg-slate-800 shadow relative">
        <Button
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex w-[60px] flex-col items-center border-r pt-4 pb-4">
          <Button variant="ghost" className="w-full p-2" title="Sort Options" onClick={() => setShowFilter(false)}>
            <ArrowUpDown className="h-5 w-5" />
          </Button>
          <Button variant="ghost" className="w-full p-2" title="Item Filter" onClick={() => setShowFilter(true)}>
            <Filter className="h-5 w-5" />
          </Button>
          <div className="flex-grow"></div>
          <Button variant="ghost" className="w-full p-2" title="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        {showFilter ? (
          <div className="flex-1 p-6 w-[250px]">
            <h2 className="text-lg font-semibold mb-4">Item Filter</h2>
            <p>Coming soon...</p>
          </div>
        ) : (
          <div className="flex-1 p-6 w-[250px]">
            <h2 className="text-lg font-semibold mb-4">Sort Options</h2>
            <RadioGroup value={sortOption} onValueChange={setSortOption}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="az" id="az" className={sortOption === 'az' ? 'bg-white' : ''} />
                <Label htmlFor="az">A-Z</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="base-value" id="price" className={sortOption === 'base-value' ? 'bg-white' : ''} />
                <Label htmlFor="price">Base Value: Low to High</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
  )
}