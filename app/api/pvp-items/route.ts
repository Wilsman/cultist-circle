// app/api/pvp-items/route.ts

import { NextResponse } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { FILTER_TAGS, IGNORED_ITEMS } from "@/config/config";
import { getCachedData } from "@/config/cache";
import limiter from "@/app/lib/rateLimiter";

const PVP_API_URL = "https://api.tarkov-market.app/api/v1/items/all";
const CACHE_KEY = "pvp-items";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const data = await getCachedData(CACHE_KEY, async () => {
      console.log(`[${new Date().toISOString()}] Fetching new PVP items from external API`);

      // Use Bottleneck to rate limit the external API call
      const response = await limiter.schedule(() =>
        fetch(PVP_API_URL, {
          headers: {
            "x-api-key": process.env.API_KEY || "",
          },
          cache: "no-store",
        })
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[${new Date().toISOString()}] Error fetching PVP data:`, errorData.error);
        throw new Error(errorData.error || "Failed to fetch PVP data");
      }

      const rawData = await response.json();

      const simplifiedData: SimplifiedItem[] = rawData
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

      return simplifiedData;
    }, CACHE_DURATION);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error(`[${new Date().toISOString()}] Error handling PVP GET request:`, errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
