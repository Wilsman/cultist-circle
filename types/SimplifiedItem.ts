// types/SimplifiedItem.ts

export interface SimplifiedItem {
    uid: string;
    name: string;
    basePrice: number; // This represents basePrice
    price: number;
    updated: Date;
    tags?: string[];
  }
  