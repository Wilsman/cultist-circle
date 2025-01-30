// types/SimplifiedItem.ts

export interface SimplifiedItem {
  uid: string;
  name: string;
  basePrice: number;
  price: number;
  updated: string;
  tags?: string[];
  bannedOnFlea?: boolean;
  isExcluded?: boolean;
  categories?: Array<{ name: string }>;
}
