import { KeyedMutator } from "swr";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { clearSWRCache } from "./swr-persistence";

// Key for storing the last revalidation timestamp in localStorage
const LAST_REVALIDATION_KEY = "last-revalidation-timestamp";
// Revalidation cooldown period in milliseconds (15 minutes)
const REVALIDATION_COOLDOWN = 15 * 60 * 1000;

/**
 * Checks if revalidation is allowed based on the cooldown period
 * @returns Object with isAllowed flag and timeRemaining in milliseconds
 */
export function canRevalidate(): { isAllowed: boolean; timeRemaining: number } {
  if (typeof window === "undefined") {
    return { isAllowed: false, timeRemaining: REVALIDATION_COOLDOWN };
  }

  try {
    const lastRevalidation = localStorage.getItem(LAST_REVALIDATION_KEY);

    if (!lastRevalidation) {
      return { isAllowed: true, timeRemaining: 0 };
    }

    const lastTimestamp = parseInt(lastRevalidation, 10);
    const now = Date.now();
    const elapsed = now - lastTimestamp;
    const timeRemaining = Math.max(0, REVALIDATION_COOLDOWN - elapsed);

    return {
      isAllowed: timeRemaining === 0,
      timeRemaining,
    };
  } catch (error) {
    console.error("Error checking revalidation status:", error);
    return { isAllowed: true, timeRemaining: 0 };
  }
}

/**
 * Utility to manually trigger revalidation of the data
 * This now simply clears the SWR cache and forces a refetch
 * @param mode The mode to revalidate ('pve' or 'pvp')
 * @returns Promise that resolves when revalidation is complete
 */
export async function revalidateItemsData(
  mode: "pve" | "pvp"
): Promise<boolean> {
  try {
    // With client-side fetching, we just need to clear the cache
    // The next request will fetch fresh data from the tarkov.dev API
    if (typeof window !== "undefined") {
      const cacheKey = `swr-cache-tarkov-dev-api/${mode}`;
      localStorage.removeItem(cacheKey);
    }
    
    console.log(`Successfully triggered revalidation for ${mode} data`);
    return true;
  } catch (error) {
    console.error(`Error revalidating ${mode} data:`, error);
    return false;
  }
}

/**
 * Refreshes the data by triggering a revalidation and then mutating the SWR cache
 * @param mutate The SWR mutate function
 * @param clearCache Whether to clear the local cache (default: false)
 */
export async function refreshData(
  mutate: KeyedMutator<SimplifiedItem[]>,
  clearCache: boolean = false
): Promise<void> {
  try {
    // Check if revalidation is allowed based on cooldown
    const { isAllowed } = canRevalidate();
    if (!isAllowed) {
      console.log("Refresh on cooldown. Skipping revalidation.");
      return;
    }

    // Store the current timestamp as the last revalidation time
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_REVALIDATION_KEY, Date.now().toString());
    }

    // If requested, clear the local cache
    if (clearCache) {
      clearSWRCache();
    }

    // Trigger a revalidation of the data
    await revalidateItemsData("pve");
    await revalidateItemsData("pvp");
    
    // Force SWR to refetch the data
    await mutate(undefined, { revalidate: true });
    
    console.log("Data refresh complete");
  } catch (error) {
    console.error("Error refreshing data:", error);
  }
}
