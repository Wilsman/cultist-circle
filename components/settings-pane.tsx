// components/settings-pane.tsx

import { Filter, List, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HelpCircle,
  Download,
  Upload,
  Trash2,
  Settings as SettingsIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ExcludedItemsManager } from "@/components/excluded-items-manager";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_EXCLUDED_CATEGORIES } from "@/config/item-categories";

interface SettingsPaneProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsReset: () => void;
  onHardReset: () => void;
  onExportData: () => void;
  onImportData: (data: string) => void;
  onSortChange: (sortOption: string) => void;
  currentSortOption: string;
  excludedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  allCategories: string[];
  excludeIncompatible: boolean;
  onExcludeIncompatibleChange: (exclude: boolean) => void;
  excludedItems: Set<string>;
  onExcludedItemsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClearLocalStorage: () => void;
}

const disabledCategories = new Set([
  // "Weapon",
  // "Key",
  // "Armor",
  // Add any other categories that should be disabled
]);

export default function SettingsPane({
  isOpen,
  onClose,
  onSettingsReset,
  onExportData,
  onImportData,
  onSortChange,
  currentSortOption,
  excludedCategories,
  onCategoryChange,
  allCategories,
  excludeIncompatible,
  onExcludeIncompatibleChange,
  excludedItems,
  onExcludedItemsChange,
  onHardReset,
}: SettingsPaneProps) {
  const [sortOption, setSortOption] = useState(currentSortOption);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Update parent component when sortOption changes
  useEffect(() => {
    onSortChange(sortOption);
  }, [sortOption, onSortChange]);

  // Handle category selection
  const handleCategoryChange = (category: string) => {
    if (disabledCategories.has(category as never)) {
      return; // Cannot change disabled categories
    }

    const updatedCategories = excludedCategories.includes(category)
      ? excludedCategories.filter((cat) => cat !== category)
      : [...excludedCategories, category];

    onCategoryChange(updatedCategories);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          onImportData(data);
          toast({
            title: "Success",
            description: "Data imported successfully",
            variant: "default",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to import data. Please check the file format.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="bg-gray-800/95 backdrop-blur-md border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure your preferences and manage your data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-400" />
              Filter
            </h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div>
                  <Label className="text-sm font-medium">Sort Options</Label>
                  <p className="text-sm text-gray-400">
                    Sort items by different criteria
                  </p>
                </div>
                <div className="flex flex-col">
                  <RadioGroup value={sortOption} onValueChange={setSortOption}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="az"
                        id="az"
                        className={sortOption === "az" ? "bg-white" : ""}
                      />
                      <Label htmlFor="az">Item name: A-Z</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="most-recent"
                        id="most-recent"
                        className={
                          sortOption === "most-recent" ? "bg-pink-500" : ""
                        }
                      />
                      <Label htmlFor="most-recent">
                        Most recently updated first
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="base-value"
                        id="base-value"
                        className={
                          sortOption === "base-value" ? "bg-blue-500" : ""
                        }
                      />
                      <Label htmlFor="base-value">
                        Base Value: Low to High
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="ratio"
                        id="ratio"
                        className={sortOption === "ratio" ? "bg-green-500" : ""}
                      />
                      <Label htmlFor="ratio">Best value for money</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Excluded Categories
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-gray-400 hover:text-white bg-gray-700"
                      onClick={() =>
                        onCategoryChange([...DEFAULT_EXCLUDED_CATEGORIES])
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="sr-only">Reset excluded categories</span>
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Select which item categories to exclude from display
                  </p>
                  <div className="flex items-center space-x-2 mb-4">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search categories..."
                      className="flex-1"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="">
                      {allCategories
                        .filter((category) =>
                          category
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .sort()
                        .map((category) => (
                          <div
                            key={category}
                            className="flex items-center space-x-2 py-1"
                          >
                            <Checkbox
                              checked={excludedCategories.includes(category)}
                              disabled={disabledCategories.has(
                                category as never
                              )}
                              onCheckedChange={() =>
                                handleCategoryChange(category)
                              }
                              className="border-gray-500"
                            />
                            <Label className="text-sm">{category}</Label>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Excluded Items Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <List className="h-5 w-5 text-blue-400" />
              Excluded Items
            </h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div>
                  <Label className="text-sm font-medium">
                    Hide Incompatible Items
                  </Label>
                  <p className="text-sm text-gray-400">
                    Hide items that are incompatible with your current build
                  </p>
                </div>
                <Switch
                  checked={excludeIncompatible}
                  onCheckedChange={(checked) =>
                    onExcludeIncompatibleChange(checked as boolean)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div>
                  <Label className="text-sm font-medium">
                    Excluded Items List
                  </Label>
                  <p className="text-sm text-gray-400">
                    Manage the list of excluded items
                  </p>
                </div>
                <ExcludedItemsManager
                  excludedItems={excludedItems}
                  onExcludedItemsChange={onExcludedItemsChange}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Data Management Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-400" />
              Data Management
            </h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div>
                  <Label className="text-sm font-medium">Export Data</Label>
                  <p className="text-sm text-gray-400">
                    Download your settings and preferences
                  </p>
                </div>
                <Button
                  onClick={onExportData}
                  variant="outline"
                  size="sm"
                  className="interactive-bounce border-gray-600 hover:bg-gray-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div>
                  <Label className="text-sm font-medium">Import Data</Label>
                  <p className="text-sm text-gray-400">
                    Restore from a backup file
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="interactive-bounce border-gray-600 hover:bg-gray-600"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Reset Options Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-yellow-400" />
              Reset Options
            </h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div>
                  <Label className="text-sm font-medium">Reset App State</Label>
                  <p className="text-sm text-gray-400">
                    Clear all selected items and return to default settings
                  </p>
                </div>
                <Button
                  onClick={() => setShowConfirmReset(true)}
                  variant="outline"
                  size="sm"
                  className="interactive-bounce border-gray-600 hover:bg-gray-600"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover-lift">
                <div>
                  <Label className="text-sm font-medium text-red-400">
                    Clear All Data
                  </Label>
                  <p className="text-sm text-gray-400">
                    Remove all stored data and start fresh
                  </p>
                </div>
                <Button
                  onClick={() => setShowConfirmClear(true)}
                  variant="destructive"
                  size="sm"
                  className="interactive-bounce"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Dialogs */}
        <Dialog open={showConfirmReset} onOpenChange={setShowConfirmReset}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Confirm Reset</DialogTitle>
              <DialogDescription className="text-gray-400">
                This will reset all selected items and settings to their default
                values. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmReset(false)}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onSettingsReset();
                  setShowConfirmReset(false);
                }}
                className="interactive-bounce"
              >
                Reset
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showConfirmClear} onOpenChange={setShowConfirmClear}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Confirm Clear Data</DialogTitle>
              <DialogDescription className="text-gray-400">
                This will permanently remove all your stored data, including
                settings and preferences. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmClear(false)}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onHardReset();
                  setShowConfirmClear(false);
                }}
                className="interactive-bounce"
              >
                Clear All Data
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
