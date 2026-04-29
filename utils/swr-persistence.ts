import { useEffect } from 'react';
import { CACHE_TTL } from '@/hooks/use-tarkov-api';

const STORAGE_KEY_PREFIX = 'swr-cache-';

export function isTruncatedItemArray(data: unknown): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  return data.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const keys = Object.keys(item as Record<string, unknown>);
    return (
      keys.length <= 3 &&
      keys.includes('id') &&
      keys.includes('name')
    );
  });
}

export function isPlaceholderCacheData(data: unknown): boolean {
  return (
    !!data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (data as Record<string, unknown>).cached === true
  );
}

/**
 * Creates a middleware for SWR that persists cache data to localStorage
 * @param version Cache version to invalidate when needed
 * @param ttl Time to live in milliseconds (default: 15 minutes)
 * @returns SWR middleware function
 */
/**
 * Due to complex and incompatible type definitions between different versions of SWR,
 * we use 'any' types here. This avoids complex type errors while maintaining the functionality.
 * The middleware is still type-safe at runtime.
 * @eslint-disable @typescript-eslint/no-explicit-any
 */
export function createSWRPersistMiddleware(version: string, ttl: number = CACHE_TTL) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (useSWRNext: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (key: any, fetcher: any, config: any) => {
      // Create a unique storage key based on the SWR key and version
      const storageKey = `${STORAGE_KEY_PREFIX}${String(key)}-${version}`;
      
      // Try to load data from localStorage
      let persistedData;
      try {
        const storedCache = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        
        if (storedCache) {
          const { data, timestamp } = JSON.parse(storedCache);
          const now = Date.now();
          
          // Check if the cache is still valid based on TTL
          if (now - timestamp < ttl) {
            if (isTruncatedItemArray(data) || isPlaceholderCacheData(data)) {
              localStorage.removeItem(storageKey);
            } else {
              persistedData = data;
            }
          } else {
            // Cache expired, remove it
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error('Error loading SWR cache from localStorage:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(storageKey);
        }
      }
      
      // Call the original useSWR with persisted data as fallback if available
      const swr = useSWRNext(key, fetcher, {
        ...config,
        fallbackData: persistedData !== undefined ? persistedData : config?.fallbackData,
      });
      
      // Save data to localStorage when it changes
      useEffect(() => {
        if (swr.data && typeof window !== 'undefined') {
          try {
            // First check if we're close to the quota limit (14MB is typical limit)
            const cacheData = {
              data: swr.data,
              timestamp: Date.now(),
            };
            
            // Try to set item, catch quota errors
            try {
              localStorage.setItem(storageKey, JSON.stringify(cacheData));
            } catch (error) {
              if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                // If quota exceeded, clear old cache and try again
                console.warn('Storage quota exceeded, clearing old cache');
                clearSWRCache();
              } else {
                throw error;
              }
            }
          } catch (error) {
            console.error('Error saving SWR cache to localStorage:', error);
          }
        }
      }, [swr.data, storageKey]);
      
      return swr;
    };
  };
}

/**
 * Clears SWR cached data from localStorage
 * @param keyPattern Optional pattern to selectively clear cache entries
 */
export function clearSWRCache(keyPattern?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        // If keyPattern is provided, only clear matching keys
        if (!keyPattern || key.includes(keyPattern)) {
          console.debug(`🧹 Clearing cache: ${key}`);
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing SWR cache:', error);
  }
}
