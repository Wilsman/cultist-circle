// app/api/pvp-items/route.ts

import { NextResponse } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { FILTER_TAGS, IGNORED_ITEMS } from "@/config/config";
import { getCachedData } from "@/config/cache";
import limiter from "@/app/lib/rateLimiter";
import fs from 'fs';
import path from 'path';

const PVP_API_URL = "https://api.tarkov-market.app/api/v1/items/all";
const CACHE_KEY = "pvp-items";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const USE_LOCAL_DATA = process.env.USE_LOCAL_DATA === 'true';

export async function GET() {
  try {
    const data = await getCachedData(CACHE_KEY, async () => {
      if (USE_LOCAL_DATA) {
        console.log(`[${new Date().toISOString()}] Loading PVP items from local JSON file`);

        const filePath = path.join(process.cwd(), 'public', 'all_items_PVP.json');
        const fileContents = fs.readFileSync(filePath, 'utf-8');
        const rawData = JSON.parse(fileContents);

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
            updated: item.updated,
          }))
          .sort((a: SimplifiedItem, b: SimplifiedItem) =>
            a.name.localeCompare(b.name)
          );

        return simplifiedData;
      } else {
        console.log(`[${new Date().toISOString()}] Fetching new PVP items from external API`);

        // Change cache option from "no-store" to "default"
        const response = await limiter.schedule(() =>
          fetch(PVP_API_URL, {
            headers: {
              "x-api-key": process.env.API_KEY || "",
            },
            cache: "no-store", // Updated cache option
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
            updated: item.updated,
          }))
          .sort((a: SimplifiedItem, b: SimplifiedItem) =>
            a.name.localeCompare(b.name)
          );

        return simplifiedData;
      }
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
