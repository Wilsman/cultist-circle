import useSWR from "swr";
import { useEffect } from "react";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const CURRENT_VERSION = "1.1.0.1"; // Increment this when you want to trigger a cache clear

interface ItemsResponse {
  items: SimplifiedItem[];
  meta: {
    totalItems: number;
    validItems: number;
    processTime: number;
    categories: number;
    mode: string;
  };
}

export function useItemsData(isPVE: boolean) {
  const mode = isPVE ? "pve" : "pvp";
  const swrKey = `/api/items/${mode}?v=${CURRENT_VERSION}`;

  const fetcher = async (url: string) => {
    const startTime = Date.now();
    console.log(`🔍 [${mode.toUpperCase()}] Fetching items from ${url}...`);

    const res = await fetch(url);
    const isCached = res.headers.get('x-vercel-cache') || 'MISS';
    const serverTiming = res.headers.get('server-timing');

    if (!res.ok) {
      console.error(`❌ [${mode.toUpperCase()}] Failed to fetch items:`, {
        status: res.status,
        statusText: res.statusText,
        cache: isCached,
      });
      throw new Error("Failed to fetch items");
    }

    const data = (await res.json()) as ItemsResponse;
    const clientTime = Date.now() - startTime;

    console.log(`📊 [${mode.toUpperCase()}] Request stats:`, {
      cache: isCached,
      clientTime,
      serverTime: serverTiming,
      totalItems: data.meta.totalItems,
      validItems: data.meta.validItems,
      categories: data.meta.categories,
      processTime: data.meta.processTime
    });

    return data.items;
  };

  const { data, error, mutate } = useSWR<SimplifiedItem[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 600000, // 10 minutes
    keepPreviousData: true,
    fallbackData: [],
  });

  useEffect(() => {
    if (error) {
      console.error(`❌ [${mode.toUpperCase()}] Error state:`, error);
    }
    console.log(`ℹ️ [${mode.toUpperCase()}] Data state:`, {
      hasData: !!data,
      itemCount: data?.length || 0,
      hasError: !!error,
    });

    // Log more detailed information about the data
    if (data && data.length > 0) {
      console.log(`📊 [${mode.toUpperCase()}] Item count breakdown:`, {
        total: data.length,
        firstItem: data[0]?.name,
        lastItem: data[data.length - 1]?.name,
        categoriesCount: new Set(data.flatMap(item => item.categories || [])).size,
      });
    }
  }, [data, error, mode]);

  return {
    data: data || [],
    error,
    mutate,
    isLoading: !error && !data,
  };
}
