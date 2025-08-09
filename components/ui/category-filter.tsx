"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const sortedCategories = [...categories].sort();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Category:</span>
      <div className="flex items-center gap-1">
        <Select
          value={selectedCategory || "all"}
          onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {sortedCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCategoryChange(null)}
            className="h-8 w-8 p-0"
            aria-label="Clear category filter"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
