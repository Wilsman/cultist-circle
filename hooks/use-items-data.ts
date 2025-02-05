import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect } from "react";
import useSWR from "swr";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const CURRENT_VERSION = "1.1.0.1"; //* Increment this when you want to trigger a cache clear

export function useItemsData(isPVE: boolean) {
  const supabase = createClient();
  const tableName = isPVE ? "tarkov_items_pve" : "tarkov_items_pvp";

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
    const allData: any[] = [];

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
        console.warn(
          `[Supabase] No data returned from ${tableName} for range ${from}-${to}`
        );
        continue;
      }

      allData.push(...pageData);
    }

    console.log(`[Supabase] Raw data from ${tableName}:`, {
      count: allData.length,
      sample: allData.slice(0, 2),
      firstItem: allData[0],
      lastItem: allData[allData.length - 1],
    });

    // Transform the data to match SimplifiedItem interface
    try {
      const items: SimplifiedItem[] = allData.map((item) => {
        if (!item.id || !item.name || !item.base_price) {
          console.warn(`[Supabase] Item missing required fields:`, item);
        }

        const transformedItem = {
          id: item.id,
          name: item.name,
          basePrice: Number(item.base_price),
          lastLowPrice: item.last_low_price
            ? Number(item.last_low_price)
            : undefined,
          updated: item.updated ? new Date(item.updated).getTime() : undefined,
          categories: item.categories || [],
          categories_display: (item.categories || []).map((cat: string) => ({
            name: cat,
          })),
          tags: [],
          isExcluded: false,
        };

        return transformedItem;
      });

      console.log(
        `[Supabase] Transformed ${items.length} items from ${tableName}`,
        {
          sample: items.slice(0, 2),
          firstItem: items[0],
          lastItem: items[items.length - 1],
          hasCategories: items.some(
            (item) => item.categories && item.categories.length > 0
          ),
          categoriesExample: items.find(
            (item) => item.categories && item.categories.length > 0
          )?.categories,
        }
      );

      return items;
    } catch (e) {
      console.error(`[Supabase] Error transforming data from ${tableName}:`, e);
      throw e;
    }
  }, [supabase, tableName]);

  const { data, error, mutate } = useSWR(
    `items-${tableName}-${CURRENT_VERSION}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 60000, // Refresh every minute
      onSuccess: (data) => {
        console.log(`[Supabase] SWR success for ${tableName}:`, {
          itemCount: data?.length || 0,
          hasData: !!data,
          firstItem: data?.[0],
          lastItem: data?.[data?.length - 1],
        });
      },
      onError: (err) => {
        console.error(`[Supabase] SWR error for ${tableName}:`, err);
      },
    }
  );

  // Subscribe to real-time changes
  useEffect(() => {
    console.log(
      `[Supabase] Setting up real-time subscription for ${tableName}`
    );

    const channel = supabase
      .channel(`public:${tableName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
        },
        (payload) => {
          console.log(
            `[Supabase] Real-time update received for ${tableName}:`,
            payload
          );
          mutate();
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase] Subscription status for ${tableName}:`, status);
      });

    return () => {
      console.log(`[Supabase] Cleaning up subscription for ${tableName}`);
      supabase.removeChannel(channel);
    };
  }, [supabase, tableName, mutate]);

  // Log current data state
  useEffect(() => {
    console.log(`[Supabase] Current state for ${tableName}:`, {
      hasData: !!data,
      itemCount: data?.length || 0,
      hasError: !!error,
      error: error,
      firstItem: data?.[0],
      lastItem: data?.[data?.length - 1],
    });
  }, [data, error, tableName]);

  return {
    data: data || [], // Ensure we always return an array
    error,
    mutate,
    isLoading: !error && !data,
  };
}
