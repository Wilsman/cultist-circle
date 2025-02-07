import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect } from "react";
import useSWR from "swr";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const CURRENT_VERSION = "1.1.0.1"; //* Increment this when you want to trigger a cache clear

export function useItemsData(isPVE: boolean) {
  const supabase = createClient();
  const tableName = isPVE ? "tarkov_items_pve" : "tarkov_items_pvp";

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

  const fetcher = useCallback(async () => {
    console.log(`🔍 Fetching item count from ${tableName}...`);

    // First, get the count of all items
    const { count } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (!count) {
      console.warn(`⚠️ No items found in ${tableName}`);
      return [];
    }

    console.log(`📊 Found ${count} total items in ${tableName}`);

    // Fetch all items using range pagination
    const pageSize = 1000;
    const pages = Math.ceil(count / pageSize);
    const allData: SimplifiedItem[] = [];

    for (let page = 0; page < pages; page++) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      console.log(
        `📥 Fetching batch ${page + 1}/${pages} (items ${from + 1}-${Math.min(
          to + 1,
          count
        )})`
      );

      const { data: pageData, error } = await supabase
        .from(tableName)
        .select("*")
        .range(from, to)
        .order("name");

      if (error) {
        console.error(`❌ Error fetching from ${tableName}:`, error);
        throw error;
      }

      if (!pageData) {
        continue;
      }

      // Transform and filter out invalid items
      const validItems = pageData
        .map(transformItem)
        .filter((item): item is SimplifiedItem => item !== null);

      allData.push(...validItems);
    }

    console.log(`✅ Successfully fetched ${allData.length} valid items`);
    return allData;
  }, [supabase, tableName]);

  const { data, error, mutate } = useSWR(
    `items-${CURRENT_VERSION}-${isPVE ? "pve" : "pvp"}`,
    fetcher,
    {
      refreshInterval: 10 * 60 * 1000, // 10 minutes in milliseconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10 * 60 * 1000, // Dedupe requests for 10 minutes
      keepPreviousData: true, // Keep showing old data while fetching new data
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
