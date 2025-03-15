import useSWR from "swr";
import { useEffect, useRef } from "react";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { createSWRPersistMiddleware } from "@/utils/swr-persistence";
import { fetchTarkovData } from "./use-tarkov-api";
import { useToast } from "@/hooks/use-toast";

const CURRENT_VERSION = "1.1.0.1"; // Increment this when you want to trigger a cache clear

// Create the persistence middleware
const swrPersistMiddleware = createSWRPersistMiddleware(CURRENT_VERSION);

// Add request tracking outside component
const requestTracker = {
  lastFetchTime: 0,
  inProgress: false,
  lastData: [] as SimplifiedItem[]
};

export function useItemsData(isPVE: boolean) {
  const mode = isPVE ? "pve" : "pvp";
  const gameMode = isPVE ? "pve" : "regular";
  // Use a unique key for the SWR cache
  const swrKey = `tarkov-dev-api/${mode}?v=${CURRENT_VERSION}`;
  const { toast } = useToast();

  const fetcher = async (): Promise<SimplifiedItem[]> => {
    // Prevent duplicate fetches within 2 seconds
    const now = Date.now();
    if (now - requestTracker.lastFetchTime < 2000 || requestTracker.inProgress) {
      return requestTracker.lastData;
    }

    requestTracker.inProgress = true;
    requestTracker.lastFetchTime = now;

    try {
      console.debug(`🔍 [${mode.toUpperCase()}] Fetching items at ${new Date().toLocaleTimeString()}`);
      const response = await fetchTarkovData(gameMode as 'pve' | 'regular');
      requestTracker.lastData = response.items;
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
    fallbackData: requestTracker.lastData || [], // Use last data as fallback
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
    // Use our persistence middleware
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
