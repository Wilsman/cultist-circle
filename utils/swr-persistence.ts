import { useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'swr-cache-';

/**
 * Creates a middleware for SWR that persists cache data to localStorage
 * @param version Cache version to invalidate when needed
 * @param ttl Time to live in milliseconds (default: 1 hour)
 * @returns SWR middleware function
 */
export function createSWRPersistMiddleware(version: string, ttl: number = 3600000) {
  return (useSWRNext: any) => {
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
            persistedData = data;
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
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                data: swr.data,
                timestamp: Date.now(),
              })
            );
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
 * Clears all SWR cached data from localStorage
 */
export function clearSWRCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing SWR cache:', error);
  }
}
