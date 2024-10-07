// components/settings-pane.tsx

import { Filter, X, ArrowUpDown, RefreshCcw } from "lucide-react"; // Added RefreshCcw
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";

interface SettingsPaneProps {
  onClose: () => void;
  onSortChange: (sortOption: string) => void;
  currentSortOption: string;
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  allCategories: string[];
  onReset: () => void;
}

const disabledCategories = new Set(["Repair", "Keys", "Weapon"]);

export function SettingsPane({
  onClose,
  onSortChange,
  currentSortOption,
  selectedCategories,
  onCategoryChange,
  allCategories,
  onReset,
}: SettingsPaneProps) {
  const [sortOption, setSortOption] = useState(currentSortOption);
  const [activeTab, setActiveTab] = useState("filter"); // New state for active tab
  const paneRef = useRef<HTMLDivElement>(null);

  // Update parent component when sortOption changes
  useEffect(() => {
    onSortChange(sortOption);
  }, [sortOption, onSortChange]);

  // Handle click outside to close the pane
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (paneRef.current && !paneRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [onClose]);

  // Handle category selection
  const handleCategoryChange = (category: string) => {
    if (disabledCategories.has(category)) {
      return; // Cannot change disabled categories
    }

    const updatedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((cat) => cat !== category)
      : [...selectedCategories, category];

    // Ensure at least one category is selected
    if (updatedCategories.length > 0) {
      onCategoryChange(updatedCategories);
    }
  };

  // Reset categories to default
  const handleResetCategories = () => {
    onCategoryChange([
      "Barter",
      "Provisions",
      "Containers",
      "Maps",
      "Suppressors",
    ]);
  };

  // Generate warning message based on disabled categories
  const disabledCategoriesMessage = Array.from(disabledCategories).join(", ");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div
        ref={paneRef}
        className="flex sm:w-[500px] w-[350px] max-h-[90vh] h-[550px] rounded-lg border bg-slate-800 shadow-lg relative"
      >
        <Button
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex w-[60px] flex-col items-center border-r pt-4 pb-4">
          <Button
            variant="ghost"
            className={`w-full p-2 ${
              activeTab === "filter" ? "bg-gray-700" : ""
            }`}
            title="Item Filter"
            onClick={() => setActiveTab("filter")}
          >
            <Filter className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            className={`w-full p-2 ${
              activeTab === "sort" ? "bg-gray-700" : ""
            }`}
            title="Sort Options"
            onClick={() => setActiveTab("sort")}
          >
            <ArrowUpDown className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            className={`w-full p-2 ${
              activeTab === "reset" ? "bg-gray-700" : ""
            }`}
            title="Reset"
            onClick={() => setActiveTab("reset")}
          >
            <RefreshCcw className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "sort" && (
            <div className="h-full">
              <h2 className="text-lg font-semibold mb-4">Sort Options</h2>
              <RadioGroup value={sortOption} onValueChange={setSortOption}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="az"
                    id="az"
                    className={sortOption === "az" ? "bg-white" : ""}
                  />
                  <Label htmlFor="az">A-Z</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="base-value"
                    id="price"
                    className={sortOption === "base-value" ? "bg-blue-500" : ""}
                  />
                  <Label htmlFor="price">Base Value: Low to High</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          {activeTab === "filter" && (
            <div className="h-full relative">
              <h2 className="text-lg font-semibold mb-4">Item Filter</h2>
              <div className="text-sm text-yellow-500 mb-4 bg-yellow-100 bg-opacity-20 p-2 rounded">
                Warning: {disabledCategoriesMessage} are disabled due to their
                variable usage/durability impacting prices.
              </div>
              {allCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedCategories.includes(category)}
                    disabled={disabledCategories.has(category)}
                    onCheckedChange={() => handleCategoryChange(category)}
                    className="border-gray-500"
                  />
                  <Label>{category}</Label>
                </div>
              ))}
              <Button
                variant="destructive"
                className="absolute bottom-4 right-4 px-4 py-2 rounded"
                onClick={handleResetCategories}
              >
                Reset Filters
              </Button>
            </div>
          )}
          {activeTab === "reset" && (
            <div className="h-full flex flex-col justify-center items-center">
              <h2 className="text-lg font-semibold mb-4">Reset Settings</h2>
              <p className="text-center mb-4">
                Reset all overrides and exclusions to their default values.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={onReset}
              >
                Reset All Overrides & Exclusions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
