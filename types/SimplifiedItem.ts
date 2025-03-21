// types/SimplifiedItem.ts

export interface SimplifiedItem {
  // Database fields
  id: string;
  name: string;
  basePrice: number;
  lastLowPrice?: number;
  updated?: string;  // Changed from number to string to match Supabase timestamptz
  lastOfferCount?: number;
  categories?: string[];  // Made optional to match DB schema
  iconLink?: string;

  // UI-specific fields
  tags?: string[];
  isExcluded?: boolean;
  categories_display?: Array<{ name: string }>;  // For UI display of categories
}
