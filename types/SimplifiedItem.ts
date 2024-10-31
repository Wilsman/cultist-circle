// types/SimplifiedItem.ts

export interface SimplifiedItem {
  uid: string;
  name: string;
  basePrice: number;
  price: number;
  updated?: string; // ! made this field optional
  tags?: string[];
  bannedOnFlea?: boolean;
  isExcluded?: boolean; // Add this line
}
