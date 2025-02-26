import { KeyedMutator } from "swr";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { clearSWRCache } from "./swr-persistence";

/**
 * Utility to manually trigger revalidation of the static data
 * @param mode The mode to revalidate ('pve' or 'pvp')
 * @returns Promise that resolves when revalidation is complete
 */
export async function revalidateItemsData(mode: 'pve' | 'pvp'): Promise<boolean> {
  try {
    const response = await fetch(`/api/items-static/${mode}?revalidate=true`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to revalidate ${mode} data:`, response.statusText);
      return false;
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
    // If requested, clear the local cache
    if (clearCache) {
      clearSWRCache();
    }
    
    // Trigger a revalidation of the data on the server
    await revalidateItemsData('pve');
    await revalidateItemsData('pvp');
    await mutate();
    
    console.log('Data refreshed successfully');
  } catch (error) {
    console.error('Error refreshing data:', error);
  }
}
