'use client';

import { useCallback, useRef } from 'react';
import useSWR from 'swr';
import type { SimplifiedItem } from '@/types/SimplifiedItem';

interface ItemsCache {
  timestamp: number;
  version: string;
  mode: string;
  data: SimplifiedItem[];
}

interface CacheStatus {
  cacheAge: string;
  cacheExpiry: string;
  version: string;
  currentVersion: string;
  itemCount: number;
  isExpired: boolean;
  versionMismatch: boolean;
  modeMismatch: boolean;
  shouldCheckStaleness: boolean;
}

type GameMode = 'pve' | 'pvp';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const PRICE_STALENESS_THRESHOLD = 3 * 60 * 1000; // 3 minutes
const DEBOUNCE_DELAY = 1000; // 1 second
const MAX_RETRIES = 3; // Maximum number of revalidation attempts

const PVE_ITEMS_CACHE_KEY = "pveItemsCache";
const PVP_ITEMS_CACHE_KEY = "pvpItemsCache";
const CURRENT_VERSION = "1.0.6";

export function useItemsData(isPVE: boolean) {
  const cacheCheckResults = useRef<Record<string, {
    timestamp: number;
    result: SimplifiedItem[];
  }>>({});
  
  const lastCheckTime = useRef<Record<string, number>>({});
  const retryCount = useRef<Record<string, number>>({});
  
  const checkPriceStaleness = async (items: SimplifiedItem[], mode: GameMode): Promise<boolean> => {
    const sampleSize = 3;
    const sampledItems = items
      .sort(() => 0.5 - Math.random())
      .slice(0, sampleSize);
    
    console.log(`[${mode.toUpperCase()}] Checking prices for:`, sampledItems.map(i => i.name));
    
    try {
      const res = await fetch('/api/v2/check-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: sampledItems }),
      });

      if (!res.ok) {
        console.error(`[${mode.toUpperCase()}] Price check failed:`, await res.text());
        return true;
      }
      
      const data = await res.json();
      
      if (data.isStale) {
        console.log(`[${mode.toUpperCase()}] Price differences:`, data.details);
      }
      
      return data.isStale;
    } catch (e) {
      console.error(`[${mode.toUpperCase()}] Price check error:`, e);
      return true;
    }
  };

  const fetcher = useCallback(async (url: string) => {
    const mode = url.includes("pve") ? 'pve' : 'pvp' as GameMode;
    const cacheKey = mode === 'pve' ? PVE_ITEMS_CACHE_KEY : PVP_ITEMS_CACHE_KEY;
    const now = Date.now();

    // Debounce check
    if (lastCheckTime.current[mode] && (now - lastCheckTime.current[mode] < DEBOUNCE_DELAY)) {
      const cached = cacheCheckResults.current[mode]?.result;
      if (cached?.length) {
        return cached;
      }
    }
    lastCheckTime.current[mode] = now;

    try {
      // Try to use cache first
      const cachedDataString = localStorage.getItem(cacheKey);
      if (cachedDataString) {
        const cacheData = JSON.parse(cachedDataString) as ItemsCache;
        const cacheStatus = getCacheStatus(cacheData);
        
        // Always return valid cache data while rate limited
        if (cacheData.data?.length && !cacheStatus.versionMismatch && !cacheStatus.modeMismatch) {
          console.log(`[${mode.toUpperCase()}] Using cache while rate limited:`, {
            age: cacheStatus.cacheAge,
            items: cacheStatus.itemCount
          });
          return cacheData.data;
        }
      }

      console.log(`[${mode.toUpperCase()}] Fetching fresh data`);
      const res = await fetch(`/api/v2/items?mode=${mode}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.warn(`[${mode.toUpperCase()}] Rate limited, using cache if available`);
          // Return cached data if we have it
          if (cachedDataString) {
            const cacheData = JSON.parse(cachedDataString) as ItemsCache;
            if (cacheData.data?.length) {
              return cacheData.data;
            }
          }
          throw new Error('Rate limited');
        }

        console.error(`[${mode.toUpperCase()}] API error:`, {
          status: res.status,
          statusText: res.statusText
        });
        throw new Error(`Failed to fetch data for ${url}`);
      }

      const items = await res.json() as SimplifiedItem[];
      if (!Array.isArray(items)) {
        console.error(`[${mode.toUpperCase()}] Invalid response format:`, items);
        throw new Error('Invalid response format');
      }

      if (!items.length) {
        console.error(`[${mode.toUpperCase()}] Received empty data from API`);
        throw new Error(`No items received from ${mode} API`);
      }

      try {
        const cacheData: ItemsCache = {
          timestamp: now,
          version: CURRENT_VERSION,
          mode,
          data: items
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`[${mode.toUpperCase()}] Updated cache with ${items.length} items`);
        cacheCheckResults.current[mode] = { timestamp: now, result: items };
      } catch (e) {
        console.error(`[${mode.toUpperCase()}] Cache update error:`, e);
      }

      return items;
    } catch (error) {
      // If we have cached data, return it on error
      const cachedDataString = localStorage.getItem(cacheKey);
      if (cachedDataString) {
        const cacheData = JSON.parse(cachedDataString) as ItemsCache;
        if (cacheData.data?.length) {
          console.warn(`[${mode.toUpperCase()}] Using cached data after error`);
          return cacheData.data;
        }
      }
      throw error;
    }
  }, []);

  const apiUrl = isPVE
    ? `/api/v2/pve-items?v=${CURRENT_VERSION}`
    : `/api/v2/pvp-items?v=${CURRENT_VERSION}`;

  const {
    data,
    error,
    mutate: revalidateData
  } = useSWR<SimplifiedItem[]>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    shouldRetryOnError: true,
    dedupingInterval: CACHE_DURATION,
    fallbackData: [], // Provide empty array as fallback
    keepPreviousData: true, // Keep previous data while fetching
    errorRetryInterval: 5000, // Start with 5 second delay
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      const currentMode = key.includes('pve') ? 'PVE' : 'PVP';
      // Don't retry on 429
      if (error?.message === 'Rate limited') {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount ?? 0), 30000);
        console.log(`[${currentMode}] Rate limited, retry in ${retryDelay/1000}s`);
        setTimeout(() => revalidate({ retryCount: (retryCount ?? 0) + 1 }), retryDelay);
        return;
      }
      
      // For other errors, retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount ?? 0), 30000);
      setTimeout(() => revalidate({ retryCount: (retryCount ?? 0) + 1 }), retryDelay);
    },
    onSuccess: (data, key) => {
      const currentMode = key.includes('pve') ? 'PVE' : 'PVP';
      if (data?.length) {
        console.log(`[${currentMode}] Data loaded:`, { itemCount: data.length });
      }
    },
    onError: (err, key) => {
      const currentMode = key.includes('pve') ? 'PVE' : 'PVP';
      console.error(`[${currentMode}] Error:`, err);
      // Only clear cache for non-rate-limit errors
      if (err?.message !== 'Rate limited') {
        const cacheKey = key.includes('pve') ? PVE_ITEMS_CACHE_KEY : PVP_ITEMS_CACHE_KEY;
        localStorage.removeItem(cacheKey);
      }
    }
  });

  const getCacheStatus = (cacheData: ItemsCache): CacheStatus => {
    const cacheAge = Date.now() - cacheData.timestamp;
    return {
      cacheAge: `${Math.round(cacheAge / 1000)}s`,
      cacheExpiry: `${Math.round(CACHE_DURATION / 1000)}s`,
      version: cacheData.version,
      currentVersion: CURRENT_VERSION,
      itemCount: cacheData.data?.length || 0,
      isExpired: cacheAge >= CACHE_DURATION,
      versionMismatch: cacheData.version !== CURRENT_VERSION,
      modeMismatch: cacheData.mode !== (isPVE ? 'pve' : 'pvp'),
      shouldCheckStaleness: cacheAge >= PRICE_STALENESS_THRESHOLD
    };
  };

  return {
    data: data || [],
    error,
    mutate: revalidateData
  };
}
