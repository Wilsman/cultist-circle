// app/api/pve-items/route.ts

import { NextResponse } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { getCachedData } from "@/config/cache";
import limiter from "@/app/lib/rateLimiter";
import fs from "fs";
import path from "path";

const PVE_API_URL = "https://api.tarkov-market.app/api/v1/pve/items/all";
const CACHE_KEY = "pve-items";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const USE_LOCAL_DATA = process.env.USE_LOCAL_DATA === "true";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: simplifiedData, timestamp } = await getCachedData(
      CACHE_KEY,
      async () => {
        if (USE_LOCAL_DATA) {
          console.log(
            `[${new Date().toISOString()}] Loading PVE items from local JSON file`
          );

          const filePath = path.join(
            process.cwd(),
            "public",
            "all_items_PVE.json"
          );
          const fileContents = fs.readFileSync(filePath, "utf-8");
          const rawData = JSON.parse(fileContents);

          return rawData
            .filter(
              (item: SimplifiedItem) => !IGNORED_ITEMS.includes(item.name)
            )
            .map((item: SimplifiedItem) => ({
              uid: item.uid,
              name: item.name,
              basePrice: item.basePrice,
              price: item.price,
              updated: item.updated,
              tags: item.tags || [],
              bannedOnFlea: item.bannedOnFlea,
            }))
            .sort((a: SimplifiedItem, b: SimplifiedItem) =>
              a.name.localeCompare(b.name)
            );
        } else {
          console.log(
            `[${new Date().toISOString()}] Fetching new PVE items from external API`
          );

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
            console.error(
              `[${new Date().toISOString()}] Error fetching PVE data:`,
              errorData.error
            );
            throw new Error(errorData.error || "Failed to fetch PVE data");
          }

          const rawData = await response.json();

          return rawData
            .filter(
              (item: SimplifiedItem) => !IGNORED_ITEMS.includes(item.name)
            )
            .map((item: SimplifiedItem) => ({
              uid: item.uid,
              name: item.name,
              basePrice: item.basePrice,
              price: item.price,
              updated: item.updated,
              tags: item.tags || [],
              bannedOnFlea: item.bannedOnFlea,
            }))
            .sort((a: SimplifiedItem, b: SimplifiedItem) =>
              a.name.localeCompare(b.name)
            );
        }
      },
      CACHE_DURATION
    );

    // Check if the simplifiedData list is empty
    if (!simplifiedData || simplifiedData.length === 0) {
      return NextResponse.json(
        { data: [], message: "No PVE items available at the moment.", timestamp },
        { status: 200 }
      );
    }

    // Include timestamp in the response
    return NextResponse.json({ data: simplifiedData, timestamp });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error(
      `[${new Date().toISOString()}] Error handling PVE GET request:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
