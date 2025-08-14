import useSWR from "swr";
import { useEffect, useState } from "react";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { createSWRPersistMiddleware } from "@/utils/swr-persistence";
import { fetchTarkovData, CACHE_TTL } from "./use-tarkov-api";
import { toast as sonnerToast } from "sonner";

// Single version for the combined data approach
const CURRENT_VERSION = "2.0.1"; // New version for combined data approach

// Create a single persistence middleware for the combined data
// The middleware handles localStorage quota errors and clears old cache when needed
const swrPersistMiddleware = createSWRPersistMiddleware(CURRENT_VERSION, CACHE_TTL); // Using centralized cache TTL

// Add request tracking outside component
const requestTracker = {
  lastFetchTime: 0,
  inProgress: false,
  lastDataPVP: [] as SimplifiedItem[],
  lastDataPVE: [] as SimplifiedItem[],
  retryCount: 0,
  maxRetries: 3
};

export function useItemsData(isPVE: boolean) {
  const mode = isPVE ? "pve" : "pvp";
  const gameMode = isPVE ? "pve" : "regular";
  
  // Use separate SWR keys for PVE and PVP to ensure proper mode switching
  const swrKey = `tarkov-dev-api/${mode}?v=${CURRENT_VERSION}`;
  
  // Track mode changes without clearing cache
  useEffect(() => {
    console.debug(`🔄 [${mode.toUpperCase()}] Mode changed, using cache if available`);
    // Reset retry count when mode changes
    requestTracker.retryCount = 0;
  }, [mode]); // Only depend on mode to track mode changes
  // Using Sonner for notifications
  
  // State to track if we need to show a retry button
  const [needsManualRetry, setNeedsManualRetry] = useState(false);

  const fetcher = async (): Promise<SimplifiedItem[]> => {
    // Simple request tracking to prevent duplicate fetches
    const now = Date.now();
    if (now - requestTracker.lastFetchTime < 2000 || requestTracker.inProgress) {
      // Return the appropriate cached data based on mode
      return isPVE ? requestTracker.lastDataPVE : requestTracker.lastDataPVP;
    }

    requestTracker.inProgress = true;
    requestTracker.lastFetchTime = now;

    try {
      console.debug(`🔍 Fetching combined items data at ${new Date().toLocaleTimeString()}`);
      
      // Fetch data for the requested game mode
      const response = await fetchTarkovData(gameMode as 'pve' | 'regular');
      
      // Check if the data is empty
      if (response.items.length === 0) {
        console.warn(`⚠️ [${mode.toUpperCase()}] Received empty data from API`);
        
        // Increment retry count
        requestTracker.retryCount++;
        
        // If we haven't exceeded max retries, throw an error to trigger retry
        if (requestTracker.retryCount < requestTracker.maxRetries) {
          throw new Error('Empty data received, retrying...');
        } else {
          // We've exceeded max retries, set flag to show manual retry button
          setNeedsManualRetry(true);
          console.error(`❌ [${mode.toUpperCase()}] Max retries (${requestTracker.maxRetries}) exceeded with empty data`);
          
          // Return empty array but don't cache it
          return [];
        }
      }
      
      // Reset retry count on successful fetch with data
      requestTracker.retryCount = 0;
      setNeedsManualRetry(false);
      
      // Store the data in the appropriate cache
      if (isPVE) {
        requestTracker.lastDataPVE = response.items;
      } else {
        requestTracker.lastDataPVP = response.items;
      }
      
      return response.items;
    } catch (error) {
      console.error(`❌ [${mode.toUpperCase()}] Fetch error:`, error);
      
      // Check if this is a rate limit error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.startsWith('RATE_LIMIT:')) {
        sonnerToast("Rate Limit Hit", {
          description: "You've reached the API rate limit. Please wait a moment before refreshing the data again.",
        });
      }
      
      throw error;
    } finally {
      requestTracker.inProgress = false;
    }
  };

  const { data, error, mutate } = useSWR<SimplifiedItem[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 600000, // 10 minutes
    keepPreviousData: true,
    fallbackData: isPVE ? requestTracker.lastDataPVE : requestTracker.lastDataPVP || [], // Fallback to last data
    suspense: false, // Disable suspense to prevent flashing
    errorRetryCount: 3,
    shouldRetryOnError: true,
    onErrorRetry: (error: Error & { status?: number }, key, config, revalidate, { retryCount }) => {
      // Don't retry on 404s
      if (error?.status === 404) return;

      // Only retry up to 3 times
      if (retryCount >= 3) return;

      // Retry after 1 second
      setTimeout(() => revalidate(), 1000);
    },
    // Use our single persistence middleware
    use: [swrPersistMiddleware],
  });

  // Simplify effect to prevent extra renders
  useEffect(() => {
    if (error) {
      console.error(`❌ [${mode.toUpperCase()}] Error state:`, error);
    }
  }, [error, mode]);

  return {
    data: data || [],
    isLoading: !error && !data,
    hasError: !!error,
    mutate,
    needsManualRetry,
    resetRetryCount: () => {
      requestTracker.retryCount = 0;
      setNeedsManualRetry(false);
    }
  };
}
