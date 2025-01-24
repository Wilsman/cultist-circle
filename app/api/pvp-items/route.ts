// app/api/pvp-items/route.ts

import { NextResponse, NextRequest } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { rateLimiter } from "@/app/lib/rateLimiter";

const PVP_API_URL = "https://api.tarkov-market.app/api/v1/items/all";
const USE_LOCAL_DATA = process.env.USE_LOCAL_DATA === "true";

// Remove force-dynamic to allow caching
export const runtime = "edge";

function processItems(rawData: SimplifiedItem[]) {
  return rawData
    .filter((item) => !IGNORED_ITEMS.includes(item.name))
    .map((item) => ({
      uid: item.uid,
      name: item.name,
      price: item.price,
      updated: item.updated,
      bannedOnFlea: item.bannedOnFlea,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(request: NextRequest) {
  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) return rateLimiterResponse;
  const startTime = Date.now();

  try {
    if (USE_LOCAL_DATA) {
      const filePath = new URL("./all_items_PVP.json", import.meta.url);
      const fileContents = await fetch(filePath).then((res) => res.text());
      const rawData = JSON.parse(fileContents);

      return NextResponse.json(
        {
          data: processItems(rawData),
          timestamp: Date.now(),
        },
        {
          headers: {
            "Cache-Control": "public, max-age=1800",
            "Vercel-CDN-Cache-Control":
              "public, s-maxage=1800, stale-while-revalidate=600",
          },
        }
      );
    }

    const response = await fetch(PVP_API_URL, {
      headers: {
        "x-api-key": process.env.API_KEY || "",
      },
      next: { revalidate: 1800 }, // 30 minutes
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch PVP data");
    }

    const rawData = await response.json();
    const processedData = processItems(rawData);

    if (!processedData.length) {
      return NextResponse.json(
        {
          data: [],
          message: "No PVP items available at the moment.",
          timestamp: Date.now(),
        },
        {
          headers: {
            "Cache-Control": "public, max-age=1800",
            "Vercel-CDN-Cache-Control":
              "public, s-maxage=1800, stale-while-revalidate=600",
          },
        }
      );
    }

    const endTime = Date.now();
    console.log(`Response time: ${endTime - startTime}ms`);

    return NextResponse.json(
      {
        data: processedData,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=1800",
          "Vercel-CDN-Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error in PVP items route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
