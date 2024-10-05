// config/cache.ts

import { SimplifiedItem } from "@/types/SimplifiedItem";

type CacheEntry = {
  timestamp: number;
  data: SimplifiedItem[];
  promise?: Promise<{ data: SimplifiedItem[]; timestamp: number }>;
};

const cache: { [key: string]: CacheEntry } = {};

/**
 * Retrieves cached data or fetches it if expired or missing.
 *
 * @param key - The unique cache key.
 * @param fetchFunction - The function to fetch data if cache is stale.
 * @param duration - Cache validity duration in milliseconds.
 * @returns The cached or freshly fetched data along with the timestamp.
 */
export async function getCachedData(
  key: string,
  fetchFunction: () => Promise<SimplifiedItem[]>,
  duration: number
): Promise<{ data: SimplifiedItem[]; timestamp: number }> {
  const now = Date.now();
  const entry = cache[key];

  // If cached data is valid, return it
  if (entry && now - entry.timestamp < duration) {
    console.log(`[${new Date().toISOString()}] Serving cached data for ${key}`);
    return { data: entry.data, timestamp: entry.timestamp };
  }

  // If a fetch is already in progress, wait for it
  if (entry?.promise) {
    console.log(`[${new Date().toISOString()}] Waiting for ongoing fetch for ${key}`);
    return entry.promise!;
  }

  // Start a new fetch and store the promise in the cache
  const fetchPromise = fetchFunction()
    .then((data) => {
      const timestamp = Date.now();
      cache[key] = {
        timestamp,
        data,
      };
      console.log(`[${new Date().toISOString()}] Data for ${key} cached successfully`);
      return { data, timestamp };
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Error fetching data for ${key}:`, error);
      // Remove the promise from cache on error to allow future retries
      if (cache[key]?.promise) {
        delete cache[key].promise;
      }
      throw error;
    });

  // Update the cache with the ongoing fetch promise
  cache[key] = {
    timestamp: now,
    data: [], // Temporary placeholder
    promise: fetchPromise,
  };

  return fetchPromise;
}
