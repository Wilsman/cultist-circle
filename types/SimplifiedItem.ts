// types/SimplifiedItem.ts

export interface TraderVendorInfo {
  normalizedName: string;
  minTraderLevel?: number;
}

export interface TraderBuyOffer {
  priceRUB: number;
  vendor: TraderVendorInfo;
}

export interface SimplifiedItem {
  // Database fields
  id: string;
  name: string;
  shortName: string;
  basePrice: number;
  lastLowPrice?: number;
  updated?: string;  // Changed from number to string to match Supabase timestamptz
  lastOfferCount?: number;
  height?: number;
  width?: number;
  categories?: string[];  // Made optional to match DB schema
  iconLink?: string;
  avg24hPrice?: number;
  // Trader offers (buy prices from traders). Present when fetched via minimal data merge.
  buyFor?: TraderBuyOffer[];

  // UI-specific fields
  tags?: string[];
  isExcluded?: boolean;
  categories_display?: Array<{ name: string }>;  // For UI display of categories
}
