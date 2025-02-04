// app/api/pve-items/route.ts

import { NextResponse, NextRequest } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { rateLimiter } from "@/app/lib/rateLimiter";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const PVE_API_URL = "https://api.tarkov-market.app/api/v1/pve/items/all";
const CACHE_DURATION = 15 * 60; // 15 minutes in seconds

// In-memory cache
let cache = {
  compressedData: null as Buffer | null,
  timestamp: 0,
};

// Specify the runtime to ensure it's a Serverless Function
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Check rate limiter
    const rateLimiterResponse = rateLimiter(request);
    if (rateLimiterResponse) {
      return rateLimiterResponse;
    }

    const now = Math.floor(Date.now() / 1000); // Current time in seconds

    // Return cached data if it's still valid
    if (cache.compressedData && now - cache.timestamp < CACHE_DURATION) {
      const decompressedData = JSON.parse(
        (await gunzipAsync(cache.compressedData)).toString()
      );
      return NextResponse.json(
        { data: decompressedData, timestamp: cache.timestamp * 1000 },
        {
          status: 200,
          headers: {
            "Cache-Control": `public, max-age=${CACHE_DURATION}`,
          },
        }
      );
    }

    // Fetch new data
    const response = await fetch(PVE_API_URL, {
      headers: {
        "x-api-key": process.env.API_KEY || "",
      },
      next: { revalidate: CACHE_DURATION },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const rawData = await response.json();

    // Process and cache the data
    const processedData = rawData
      .filter((item: SimplifiedItem) => !IGNORED_ITEMS.includes(item.name))
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

    // Compress and update cache
    const compressedData = await gzipAsync(JSON.stringify(processedData));
    cache = {
      compressedData,
      timestamp: now,
    };

    return NextResponse.json(
      { data: processedData, timestamp: now * 1000 },
      {
        status: 200,
        headers: {
          "Cache-Control": `public, max-age=${CACHE_DURATION}`,
        },
      }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch PVE data. Please try again later." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
