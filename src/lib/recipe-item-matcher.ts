import Fuse from 'fuse.js';
import type { SimplifiedItem } from '@/types/SimplifiedItem';

/**
 * Extracts clean item name from recipe string
 * Examples:
 * "1x WD-40 (400ml)" -> "WD-40 (400ml)"
 * "Cultist figurine ×5" -> "Cultist figurine"
 * "Secure container Gamma (The Unheard Edition)" -> "Secure container Gamma (The Unheard Edition)"
 */
export function extractItemName(recipeString: string): string {
  // Remove quantity prefixes like "1x ", "5x ", "×5", etc.
  const withoutQuantity = recipeString.replace(/^\d+x?\s*|×\d+$/gi, '').trim();
  
  // Handle special cases where quantity is at the end
  const withoutEndQuantity = withoutQuantity.replace(/\s*×\d+$/gi, '').trim();
  
  return withoutEndQuantity;
}

/**
 * Matches recipe items with Tarkov API items using fuzzy search
 */
export class RecipeItemMatcher {
  private fuse: Fuse<SimplifiedItem>;
  
  constructor(items: SimplifiedItem[]) {
    // Configure Fuse.js for optimal matching
    const fuseOptions = {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'shortName', weight: 0.3 }
      ],
      threshold: 0.4, // Lower = more strict matching
      distance: 100,
      minMatchCharLength: 3,
      includeScore: true,
      shouldSort: true
    };
    
    this.fuse = new Fuse(items, fuseOptions);
  }
  
  /**
   * Find the best matching item for a recipe string
   */
  findMatch(recipeString: string): { item: SimplifiedItem; score: number } | null {
    const cleanName = extractItemName(recipeString);
    const results = this.fuse.search(cleanName);
    
    if (results.length === 0) {
      return null;
    }
    
    // Return the best match (lowest score = best match)
    const bestMatch = results[0];
    return {
      item: bestMatch.item,
      score: bestMatch.score || 0
    };
  }
  
  /**
   * Find matches for multiple recipe items
   */
  findMatches(recipeStrings: string[]): Map<string, { item: SimplifiedItem; score: number }> {
    const matches = new Map<string, { item: SimplifiedItem; score: number }>();
    
    for (const recipeString of recipeStrings) {
      const match = this.findMatch(recipeString);
      if (match) {
        matches.set(recipeString, match);
      }
    }
    
    return matches;
  }
}
