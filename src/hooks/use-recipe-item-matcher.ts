import { useMemo } from 'react';
import { RecipeItemMatcher } from '@/lib/recipe-item-matcher';
import { useItemsData } from '@/hooks/use-items-data';
import type { SimplifiedItem } from '@/types/SimplifiedItem';

interface ItemMatch {
  item: SimplifiedItem;
  score: number;
}

/**
 * Hook to match recipe items with Tarkov API items using fuzzy search
 */
export function useRecipeItemMatcher() {
  const { data: items, isLoading, hasError } = useItemsData(false); // Use PVP mode by default
  
  const matcher = useMemo(() => {
    if (!items || items.length === 0) {
      return null;
    }
    
    return new RecipeItemMatcher(items);
  }, [items]);
  
  const findMatch = useMemo(() => {
    return (recipeString: string): ItemMatch | null => {
      if (!matcher) return null;
      return matcher.findMatch(recipeString);
    };
  }, [matcher]);
  
  const findMatches = useMemo(() => {
    return (recipeStrings: string[]): Map<string, ItemMatch> => {
      if (!matcher) return new Map();
      return matcher.findMatches(recipeStrings);
    };
  }, [matcher]);
  
  return {
    findMatch,
    findMatches,
    isLoading,
    hasError,
    isReady: !!matcher
  };
}
