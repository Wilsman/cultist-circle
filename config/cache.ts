// config/cache.ts

import { SimplifiedItem } from "@/types/SimplifiedItem";

type CacheEntry = {
    timestamp: number;
    data: SimplifiedItem[];
  };
  
  export const cache: { [key: string]: CacheEntry } = {};
  