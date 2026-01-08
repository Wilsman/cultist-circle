import { useMemo } from "react";
import { useItemsData } from "./use-items-data";
import { SimplifiedItem } from "@/types/SimplifiedItem";

/**
 * Hook to get item data for recipe items by name
 * Returns a map of item names to their full SimplifiedItem data
 */
export function useRecipeItemData(isPVE: boolean) {
  const { data: items, isLoading, hasError } = useItemsData(isPVE);

  const itemsByName = useMemo(() => {
    const map = new Map<string, SimplifiedItem>();
    
    items.forEach((item) => {
      // Map by name (primary)
      map.set(item.name, item);
      
      // Also map by shortName if different
      if (item.shortName && item.shortName !== item.name) {
        map.set(item.shortName, item);
      }
      
      // Also map by English names for cross-language support
      if (item.englishName && item.englishName !== item.name) {
        map.set(item.englishName, item);
      }
      if (item.englishShortName && item.englishShortName !== item.shortName) {
        map.set(item.englishShortName, item);
      }
    });
    
    return map;
  }, [items]);

  return {
    getItemByName: (name: string): SimplifiedItem | undefined => {
      // Try exact match first
      let item = itemsByName.get(name);
      if (item) return item;
      
      // Try removing quantity prefix (e.g., "1x Item Name" -> "Item Name")
      const withoutQuantity = name.replace(/^\d+x\s+/, "");
      item = itemsByName.get(withoutQuantity);
      if (item) return item;
      
      // Try case-insensitive match as last resort
      const lowerName = name.toLowerCase();
      for (const [key, value] of itemsByName.entries()) {
        if (key.toLowerCase() === lowerName) {
          return value;
        }
      }
      
      return undefined;
    },
    isLoading,
    hasError,
  };
}
