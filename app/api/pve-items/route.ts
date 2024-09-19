// app/api/pve-items/route.ts

import { NextResponse } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { FILTER_TAGS, IGNORED_ITEMS } from "@/config/config";
import { cache } from "@/config/cache";
import limiter from "@/app/lib/rateLimiter";

const PVE_API_URL = "https://api.tarkov-market.app/api/v1/pve/items/all";
const CACHE_KEY = "pve-items";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();

  // Check cache
  if (cache[CACHE_KEY] && now - cache[CACHE_KEY].timestamp < CACHE_DURATION) {
    console.log(`[${new Date().toISOString()}] Serving cached PVE items`);
    return NextResponse.json(cache[CACHE_KEY].data);
  }

  console.log(`[${new Date().toISOString()}] Fetching new PVE items from external API`);

  try {
    // Use Bottleneck to rate limit the external API call
    const response = await limiter.schedule(() =>
      fetch(PVE_API_URL, {
        headers: {
          "x-api-key": process.env.API_KEY || "",
        },
        cache: "no-store",
      })
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[${new Date().toISOString()}] Error fetching PVE data:`, errorData.error);
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch PVE data" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const simplifiedData: SimplifiedItem[] = data
      .filter(
        (item: SimplifiedItem) =>
          FILTER_TAGS.some((tag) => item.tags?.includes(tag)) &&
          !IGNORED_ITEMS.includes(item.name)
      )
      .map((item: SimplifiedItem) => ({
        uid: item.uid,
        name: item.name,
        basePrice: item.basePrice,
        price: item.price,
      }))
      .sort((a: SimplifiedItem, b: SimplifiedItem) =>
        a.name.localeCompare(b.name)
      );

    // Update cache
    cache[CACHE_KEY] = {
      timestamp: now,
      data: simplifiedData,
    };

    console.log(`[${new Date().toISOString()}] PVE items cached successfully`);

    return NextResponse.json(simplifiedData);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error(`[${new Date().toISOString()}] Error fetching PVE data:`, errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
