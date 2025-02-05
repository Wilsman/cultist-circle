// types/SimplifiedItem.ts

export interface SimplifiedItem {
  // Database fields
  id: string;
  name: string;
  basePrice: number;
  lastLowPrice?: number;
  updated?: number;
  categories: string[];

  // UI-specific fields
  tags?: string[];
  isExcluded?: boolean;
  categories_display?: Array<{ name: string }>;  // For UI display of categories
}
