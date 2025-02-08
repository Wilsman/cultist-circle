import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const CURRENT_VERSION = "1.1.0.1"; //* Increment this when you want to trigger a cache clear
const BATCH_SIZE = 1000;

// Cache for ongoing requests
const ongoingRequests = new Map<string, Promise<any>>();

export function useItemsData(isPVE: boolean) {
  const supabase = createClient();
  const tableName = isPVE ? "tarkov_items_pve" : "tarkov_items_pvp";
  const activeRequestRef = useRef<{ [key: string]: Promise<any> }>({});

  const transformItem = (item: any): SimplifiedItem | null => {
    if (!item?.id || !item?.name || typeof item?.base_price !== "number") {
      console.debug(`⚠️ Skipping item due to missing required fields:`, item);
      return null;
    }

    // Parse the updated timestamp directly - it comes as an ISO string from Supabase
    const updated = item.updated ? item.updated : undefined;

    return {
      id: item.id,
      name: item.name,
      basePrice: item.base_price,
      lastLowPrice: item.last_low_price || undefined,
      updated, // Pass the ISO string directly
      categories: item.categories || [],
      tags: item.tags || [],
      isExcluded: false,
      categories_display:
        item.categories?.map((cat: string) => ({ name: cat })) || [],
    };
  };

  const fetchItemCount = useCallback(async () => {
    const cacheKey = `count-${tableName}`;
    if (ongoingRequests.has(cacheKey)) {
      return ongoingRequests.get(cacheKey);
    }

    const countPromise = (async () => {
      console.log(`🔍 Fetching item count from ${tableName}...`);
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count;
    })();

    ongoingRequests.set(cacheKey, countPromise);
    try {
      const result = await countPromise;
      return result;
    } finally {
      ongoingRequests.delete(cacheKey);
    }
  }, [tableName]);

  const fetchBatch = useCallback(async (start: number, end: number) => {
    const batchKey = `${tableName}-${start}-${end}`;
    if (ongoingRequests.has(batchKey)) {
      return ongoingRequests.get(batchKey);
    }

    const batchPromise = (async () => {
      console.log(`📥 Fetching batch ${Math.floor(start / BATCH_SIZE) + 1}/5 (items ${start + 1}-${end})`);
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .range(start, end - 1);

      if (error) throw error;
      return data;
    })();

    ongoingRequests.set(batchKey, batchPromise);
    try {
      const result = await batchPromise;
      return result;
    } finally {
      ongoingRequests.delete(batchKey);
    }
  }, [tableName]);

  // Fetch function with deduplication
  const fetcher = useCallback(async () => {
    try {
      const count = await fetchItemCount();
      if (!count) {
        console.error('No items found in database');
        return [];
      }

      console.log(`📊 Found ${count} total items in ${tableName}`);

      const batches = [];
      for (let i = 0; i < count; i += BATCH_SIZE) {
        const end = Math.min(i + BATCH_SIZE, count);
        batches.push(fetchBatch(i, end));
      }

      const results = await Promise.all(batches);
      const rawItems = results.flat();

      // Transform items and filter out nulls
      const transformedItems = rawItems
        .map(transformItem)
        .filter((item): item is SimplifiedItem => item !== null);

      console.log(`✅ Transformed ${transformedItems.length} valid items out of ${rawItems.length} total`);

      if (transformedItems.length === 0) {
        console.error('No valid items after transformation');
        return [];
      }

      return transformedItems;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }, [fetchItemCount, fetchBatch, tableName, transformItem]);

  const { data, error, mutate } = useSWR(
    `items-${CURRENT_VERSION}-${isPVE ? "pve" : "pvp"}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10 * 60 * 1000,
      keepPreviousData: true,
      retry: 3,
      errorRetryInterval: 5000,
      suspense: false,
      onError: (err) => console.error('SWR Error:', err)
    }
  );

  // Log current data state for debugging
  useEffect(() => {
    if (!data && !error) return; // Don't log initial loading state
    console.log(`[Data State] ${tableName}:`, {
      hasData: !!data,
      itemCount: data?.length || 0,
      hasError: !!error,
    });
  }, [data, error, tableName]);

  return {
    data: data || [], // Ensure we always return an array
    error,
    mutate,
    isLoading: !error && !data,
  };
}
