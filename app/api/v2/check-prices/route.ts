// app/api/v2/check-prices/route.ts

import { NextResponse, NextRequest } from "next/server";
import { createRateLimiter } from "@/app/lib/rateLimiter";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

export const runtime = "nodejs";

const rateLimiter = createRateLimiter({
  uniqueTokenPerInterval: 500,
  interval: 60000, // 1 minute
  tokensPerInterval: 30, // Allow 30 requests per minute
  timeout: 30000 // Rate limit expires after 30 seconds
});

async function checkPrices(itemNames: string[]) {
  const query = `
    query {
      items(names: ${JSON.stringify(itemNames)}) {
        name
        lastLowPrice
        updated
      }
    }
  `;

  console.log("[Price Check] Sending query for items:", itemNames);
  
  const res = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Price Check] API response not OK:", {
      status: res.status,
      statusText: res.statusText,
      error: errorText
    });
    throw new Error("Failed to fetch from tarkov.dev API");
  }

  const data = await res.json();
  console.log("[Price Check] Received response:", {
    hasData: !!data.data,
    itemCount: data.data?.items?.length || 0,
    requestedCount: itemNames.length,
    hasErrors: !!data.errors
  });

  if (data.errors) {
    console.error("[Price Check] GraphQL errors:", data.errors);
  }

  return data;
}

export async function POST(request: NextRequest) {
  console.log("[Price Check] Request received");

  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) {
    console.log("[Price Check] Rate limit exceeded");
    return rateLimiterResponse;
  }

  try {
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      console.error("[Price Check] Invalid request body:", body);
      return NextResponse.json(
        { error: "Invalid items array" },
        { status: 400 }
      );
    }

    const data = await checkPrices(items.map((i) => i.name));
    const freshItems = data.data?.items || [];

    // Compare prices
    const results = freshItems
      .map((freshItem: { name: string; lastLowPrice: number }) => {
        const cachedItem = items.find((i) => i.name === freshItem.name);
        if (!cachedItem) return null;

        const priceDiff = Math.abs(freshItem.lastLowPrice - cachedItem.price);
        const priceThreshold = cachedItem.price * 0.1; // 10% threshold

        return {
          name: freshItem.name,
          cached: cachedItem.price,
          fresh: freshItem.lastLowPrice,
          diff: priceDiff,
          threshold: priceThreshold,
          isStale: priceDiff > priceThreshold,
        };
      })
      .filter(Boolean);

    const isStale = results.some((r: { isStale: boolean }) => r.isStale);
    
    console.log("[Price Check] Results:", {
      checkedItems: items.length,
      freshItems: freshItems.length,
      matchedItems: results.length,
      isStale
    });

    return NextResponse.json({
      isStale,
      details: results,
    });
  } catch (error) {
    console.error("[Price Check] Error:", error);
    return NextResponse.json(
      { error: "Failed to check prices" },
      { status: 500 }
    );
  }
}
