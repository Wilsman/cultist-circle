import useSWR from "swr";
import { useEffect } from "react";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { createSWRPersistMiddleware } from "@/utils/swr-persistence";
import { fetchTarkovData } from "./use-tarkov-api";
import { useToast } from "@/hooks/use-toast";

// Single version for the combined data approach
const CURRENT_VERSION = "1.2.0.0"; // New version for combined data approach

// Create a single persistence middleware for the combined data
// The middleware handles localStorage quota errors and clears old cache when needed
const swrPersistMiddleware = createSWRPersistMiddleware(CURRENT_VERSION, 900000); // 15 minutes TTL

// Add request tracking outside component
const requestTracker = {
  lastFetchTime: 0,
  inProgress: false,
  lastDataPVP: [] as SimplifiedItem[],
  lastDataPVE: [] as SimplifiedItem[]
};

export function useItemsData(isPVE: boolean) {
  const mode = isPVE ? "pve" : "pvp";
  const gameMode = isPVE ? "pve" : "regular";
  
  // Use separate SWR keys for PVE and PVP to ensure proper mode switching
  const swrKey = `tarkov-dev-api/${mode}?v=${CURRENT_VERSION}`;
  
  // Track mode changes without clearing cache
  useEffect(() => {
    // We're now using a smarter approach to cache management:
    // 1. We don't automatically clear the cache when switching modes
    // 2. Instead, we check if the cache is valid in handleModeToggle
    // 3. This prevents unnecessary API calls when switching back and forth
    console.debug(`🔄 [${mode.toUpperCase()}] Mode changed, using cache if available`);
  }, [mode]); // Only depend on mode to track mode changes
  const { toast } = useToast();

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
        toast({
          title: "Rate Limit Hit",
          description: "You've reached the API rate limit. Please wait a moment before refreshing the data again.",
          variant: "warning",
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
    error,
    mutate,
    isLoading: !error && !data,
  };
}
