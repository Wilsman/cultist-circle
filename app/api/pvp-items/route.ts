// app/api/pvp-items/route.ts

import { NextResponse, NextRequest } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { getCachedData } from "@/config/cache";
import fs from "fs";
import path from "path";
import { rateLimiter } from "@/app/lib/rateLimiter";

const PVP_API_URL = "https://api.tarkov-market.app/api/v1/items/all";
const CACHE_KEY = "pvp-items";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const USE_LOCAL_DATA = process.env.USE_LOCAL_DATA === "true";

// Specify the runtime to ensure it's a Serverless Function
export const dynamic = "force-dynamic";

// Specify the runtime to ensure it's a Serverless Function
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) {
    return rateLimiterResponse;
  }

  try {
    const { data: simplifiedData, timestamp } = await getCachedData(
      CACHE_KEY,
      async () => {
        if (USE_LOCAL_DATA) {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[${new Date().toISOString()}] Loading PVP items from local JSON file`
            );
          }

          const filePath = path.join(
            process.cwd(),
            "public",
            "all_items_PVP.json"
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
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[${new Date().toISOString()}] Fetching new PVP items from external API`
            );
          }

          const response = await fetch(PVP_API_URL, {
            headers: {
              "x-api-key": process.env.API_KEY || "",
            },
            cache: "no-store",
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              `[${new Date().toISOString()}] Error fetching PVP data:`,
              errorData.error
            );
            throw new Error(errorData.error || "Failed to fetch PVP data");
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
        {
          data: [],
          message: "No PVP items available at the moment.",
          timestamp,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=60",
            "CDN-Cache-Control":
              "public, s-maxage=60, stale-while-revalidate=59",
            "Vercel-CDN-Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=59",
          },
        }
      );
    }

    // // Calculate s-maxage based on CACHE_DURATION
    // const sMaxAge = Math.floor(CACHE_DURATION / 1000);

    // Include Cache-Control headers in the response
    return NextResponse.json(
      { data: simplifiedData, timestamp },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=1800, s-maxage=1800",
          "CDN-Cache-Control": "public, s-maxage=1800, stale-while-revalidate=59",
          "Vercel-CDN-Cache-Control": "public, s-maxage=1800, stale-while-revalidate=59",
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error(
      `[${new Date().toISOString()}] Error handling PVP GET request:`,
      errorMessage
    );
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
