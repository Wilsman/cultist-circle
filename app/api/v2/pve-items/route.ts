// app/api/v2/pve-items/route.ts

import { NextResponse, NextRequest } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { createRateLimiter } from "@/app/lib/rateLimiter";
import { GraphQLResponse } from "@/types/GraphQLResponse";
import { unstable_cache } from "next/cache";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

export const runtime = "nodejs";

const rateLimiter = createRateLimiter({
  uniqueTokenPerInterval: 500,
  interval: 60000, // 1 minute
  tokensPerInterval: 30, // Allow 30 requests per minute
  timeout: 30000, // Rate limit expires after 30 seconds
});

function processItems(rawData: SimplifiedItem[]) {
  return rawData
    .filter((item) => !IGNORED_ITEMS.includes(item.name))
    .map((item) => ({
      uid: item.uid,
      name: item.name,
      basePrice: item.basePrice,
      price: item.price,
      updated: item.updated,
      tags: item.tags,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchAndProcessItems() {
  const query = `
    {
      items(gameMode: pve) {
        id
        name
        basePrice
        lastLowPrice
        updated
        categories {
          name
        }
      }
    }
  `;

  console.log("[PVE] Sending GraphQL query to tarkov.dev API");
  const response = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[PVE] API response not OK:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(
      `Failed to fetch PVE data: ${response.status} ${response.statusText}`
    );
  }

  const jsonData: GraphQLResponse = await response.json();
  console.log("[PVE] Received response from API:", {
    hasData: !!jsonData.data,
    itemCount: jsonData.data?.items?.length || 0,
    hasErrors: !!jsonData.errors,
  });

  if (jsonData.errors) {
    console.error("[PVE] GraphQL errors:", jsonData.errors);
    throw new Error(jsonData.errors[0]?.message || "Unknown GraphQL error");
  }

  if (!jsonData.data?.items) {
    console.error("[PVE] Invalid data structure:", jsonData);
    throw new Error("Invalid data structure from GraphQL API");
  }

  const simplifiedData: SimplifiedItem[] = jsonData.data.items
    .filter(
      (item) => !IGNORED_ITEMS.includes(item.name) && item.lastLowPrice !== null
    )
    .map((item) => ({
      uid: item.id,
      name: item.name,
      basePrice: item.basePrice,
      price: item.lastLowPrice!,
      updated: item.updated,
      tags: item.categories.map((category) => category.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log("[PVE] Processed items:", {
    rawCount: jsonData.data.items.length,
    filteredCount: simplifiedData.length,
    ignoredCount: IGNORED_ITEMS.length,
    nullPricesCount: jsonData.data.items.filter((i) => i.lastLowPrice === null)
      .length,
  });

  return processItems(simplifiedData);
}

const getCachedItems = unstable_cache(
  async () => {
    console.log("[PVE] Fetching fresh items from tarkov.dev API");
    const startTime = Date.now();
    const items = await fetchAndProcessItems();
    const duration = Date.now() - startTime;
    console.log(
      `[PVE] Processed ${items.length} items from tarkov.dev API in ${duration}ms`
    );
    return items;
  },
  ["pve-items"],
  {
    revalidate: 900, // 15 minutes to match client-side cache
    tags: ["pve-items"],
  }
);

export async function GET(request: NextRequest) {
  console.log("\n📥 New request received at:", new Date().toISOString());
  console.log("🔍 Request mode: pve");
  console.log("⚡ Attempting to fetch PVE items from cache");

  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) {
    console.log("⛔ Request blocked by rate limiter");
    // Add retry-after header
    rateLimiterResponse.headers.set("Retry-After", "30");
    return rateLimiterResponse;
  }

  try {
    console.log(
      "[REGULAR] Cache function called at:",
      new Date().toISOString()
    );
    const items = await getCachedItems();

    console.log("✅ Request completed successfully:", {
      itemCount: items.length,
      firstItem: items[0]?.name,
    });

    return NextResponse.json(items, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("❌ Error in items route:", error);
    return NextResponse.json(
      { error: "Failed to fetch PVE items" },
      { status: 500 }
    );
  }
}
