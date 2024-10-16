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
  // onReset: () => void;
  onHardReset: () => void;
}

const disabledCategories = new Set(["Repair", "Keys", "Weapon"]);

export function SettingsPane({
  onClose,
  onSortChange,
  currentSortOption,
  selectedCategories,
  onCategoryChange,
  allCategories,
  // onReset,
  onHardReset,
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
        <button
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-slate-700 transition-colors"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X className="h-5 w-5 text-primary-foreground" />
        </button>
        <div className="flex w-[60px] flex-col items-center justify-between border-r pt-4 pb-4 h-full">
          <div className="flex flex-col items-center space-y-4">
            <button
              className="w-full p-2 flex justify-center focus:outline-none"
              title="Item Filter"
              onClick={() => setActiveTab("filter")}
            >
              <Filter
                className={`h-5 w-5 ${
                  activeTab === "filter"
                    ? "text-muted-foreground"
                    : "text-primary"
                }`}
              />
            </button>
            <button
              className="w-full p-2 flex justify-center focus:outline-none"
              title="Sort Options"
              onClick={() => setActiveTab("sort")}
            >
              <ArrowUpDown
                className={`h-5 w-5 ${
                  activeTab === "sort"
                    ? "text-muted-foreground"
                    : "text-primary"
                }`}
              />
            </button>
          </div>
          <button
            className="w-full p-2 flex justify-center focus:outline-none"
            title="Reset"
            onClick={() => setActiveTab("reset")}
          >
            <RefreshCcw
              className={`h-5 w-5 ${
                activeTab === "reset" ? "text-muted-foreground" : "text-primary"
              }`}
            />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto text-primary-foreground">
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
                    id="base-value"
                    className={sortOption === "base-value" ? "bg-blue-500" : ""}
                  />
                  <Label htmlFor="base-value">Base Value: Low to High</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="ratio"
                    id="ratio"
                    className={sortOption === "ratio" ? "bg-green-500" : ""}
                  />
                  <Label htmlFor="ratio">Value-to-Cost Ratio</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          {activeTab === "filter" && (
            <div className="h-full relative text-primary-foreground">
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
              <h2 className="text-lg font-semibold mb-4">Hard Reset</h2>
              <p className="text-center mb-4">
                Reset all settings to their default values. (including cookies
                and local cache)
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={onHardReset}
              >
                Reset App
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
