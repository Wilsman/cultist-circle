import { useEffect, useMemo } from 'react';
import { CACHE_TTL } from '@/hooks/use-tarkov-api';

const STORAGE_KEY_PREFIX = 'swr-cache-';

// Browsers cap localStorage at roughly 5M characters per origin, shared with
// every other setting. A full item list is ~7M characters, so anything above
// this budget is skipped instead of failing setItem after a costly stringify.
export const MAX_PERSISTED_CHARS = 1_000_000;

const ESTIMATE_SAMPLE_SIZE = 100;

/**
 * Estimates the serialized size of a cache entry. Large arrays are sampled so
 * oversized payloads can be rejected without stringifying all of them.
 */
export function estimateSerializedChars(data: unknown): number {
  if (Array.isArray(data) && data.length > ESTIMATE_SAMPLE_SIZE) {
    const sampleChars = JSON.stringify(
      data.slice(0, ESTIMATE_SAMPLE_SIZE),
    ).length;
    return Math.ceil((sampleChars / ESTIMATE_SAMPLE_SIZE) * data.length);
  }
  return JSON.stringify(data)?.length ?? 0;
}

function isQuotaExceededError(error: unknown): boolean {
  // Match by name: DOMException classes differ between realms (e.g. iframes).
  const name = (error as { name?: unknown } | null)?.name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

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

function readPersistedData(storageKey: string, ttl: number): unknown {
  if (typeof window === 'undefined') return undefined;
  try {
    const storedCache = localStorage.getItem(storageKey);
    if (!storedCache) return undefined;

    const { data, timestamp } = JSON.parse(storedCache);
    // Check if the cache is still valid based on TTL
    if (Date.now() - timestamp >= ttl) {
      localStorage.removeItem(storageKey);
      return undefined;
    }
    if (isTruncatedItemArray(data) || isPlaceholderCacheData(data)) {
      localStorage.removeItem(storageKey);
      return undefined;
    }
    return data;
  } catch (error) {
    console.error('Error loading SWR cache from localStorage:', error);
    localStorage.removeItem(storageKey);
    return undefined;
  }
}

/**
 * Creates a middleware for SWR that persists cache data to localStorage
 * @param version Cache version to invalidate when needed
 * @param ttl Time to live in milliseconds (default: 15 minutes)
 * @param maxChars Largest serialized entry to persist; bigger data stays in memory only
 * @returns SWR middleware function
 */
/**
 * Due to complex and incompatible type definitions between different versions of SWR,
 * we use 'any' types here. This avoids complex type errors while maintaining the functionality.
 * The middleware is still type-safe at runtime.
 * @eslint-disable @typescript-eslint/no-explicit-any
 */
export function createSWRPersistMiddleware(
  version: string,
  ttl: number = CACHE_TTL,
  maxChars: number = MAX_PERSISTED_CHARS,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (useSWRNext: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (key: any, fetcher: any, config: any) => {
      // Create a unique storage key based on the SWR key and version
      const storageKey = `${STORAGE_KEY_PREFIX}${String(key)}-${version}`;

      // Load persisted data once per storage key. Parsing on every render
      // would hand SWR a new fallback array each time, which consumers that
      // track data identity during render treat as fresh data (React #301).
      const persistedData = useMemo(
        () => readPersistedData(storageKey, ttl),
        [storageKey],
      );
      
      // Call the original useSWR with persisted data as fallback if available
      const swr = useSWRNext(key, fetcher, {
        ...config,
        fallbackData: persistedData !== undefined ? persistedData : config?.fallbackData,
      });
      
      // Save data to localStorage when it changes
      useEffect(() => {
        if (swr.data && typeof window !== 'undefined') {
          try {
            // Skip data that cannot fit, and drop any older copy under this
            // key so it does not keep holding quota other settings need.
            if (estimateSerializedChars(swr.data) > maxChars) {
              localStorage.removeItem(storageKey);
              return;
            }

            const serialized = JSON.stringify({
              data: swr.data,
              timestamp: Date.now(),
            });
            if (serialized.length > maxChars) {
              localStorage.removeItem(storageKey);
              return;
            }

            try {
              localStorage.setItem(storageKey, serialized);
            } catch (error) {
              if (!isQuotaExceededError(error)) throw error;
              // Leave other cache entries alone: clearing them all evicts the
              // data other modes are using without freeing room for this one.
              console.warn(`Skipping SWR cache for ${storageKey}: localStorage is full`);
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
 * Removes persisted SWR entries saved under any other cache version, so data
 * left behind by an old cache key does not keep using localStorage quota.
 */
export function pruneStaleSWRCache(version: string): void {
  if (typeof window === 'undefined') return;

  try {
    const suffix = `-${version}`;
    const keys = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    );
    keys.forEach(key => {
      if (key?.startsWith(STORAGE_KEY_PREFIX) && !key.endsWith(suffix)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error pruning SWR cache:', error);
  }
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
