import { NextResponse, NextRequest } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { createRateLimiter } from "@/app/lib/rateLimiter";
import { GraphQLResponse } from "@/types/GraphQLResponse";
import { unstable_cache } from "next/cache";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

const rateLimiter = createRateLimiter({
  uniqueTokenPerInterval: 500,
  interval: 60000, // 1 minute
  tokensPerInterval: 30, // Allow 30 requests per minute
  timeout: 30000, // Rate limit expires after 30 seconds
});

export const runtime = "edge";
export const revalidate = 1800;

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

async function fetchAndProcessItems(gameMode: "pve" | "regular") {
  console.log(
    `[${gameMode}] Starting fetchAndProcessItems at:`,
    new Date().toISOString()
  );

  const query = `
    {
      items(gameMode: ${gameMode}) {
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

  console.log(`[${gameMode}] Fetching from GraphQL API...`);
  const response = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    console.error(
      `[${gameMode}] GraphQL API responded with status:`,
      response.status
    );
    const errorData = await response.json();
    throw new Error(
      errorData.errors?.[0]?.message ||
        `Failed to fetch ${gameMode.toUpperCase()} data`
    );
  }

  console.log(`[${gameMode}] Successfully received GraphQL response`);
  const jsonData: GraphQLResponse = await response.json();

  if (!jsonData.data?.items) {
    console.error(`[${gameMode}] Invalid data structure received:`, jsonData);
    throw new Error("Invalid data structure from GraphQL API");
  }

  console.log(`[${gameMode}] Raw items count:`, jsonData.data.items.length);

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

  console.log(`[${gameMode}] Processed items count:`, simplifiedData.length);
  return processItems(simplifiedData);
}

const getCachedItems = unstable_cache(
  async (gameMode: "pve" | "regular") => {
    console.log(
      `🔄 [${gameMode.toUpperCase()}] Cache function called at:`,
      new Date().toISOString()
    );
    const items = await fetchAndProcessItems(gameMode);
    console.log(
      `✅ [${gameMode.toUpperCase()}] Cache populated with items count:`,
      items.length
    );
    return items;
  },
  ["items-cache"],
  {
    revalidate: 1800,
    tags: ["items-cache"],
  }
);

export async function GET(request: NextRequest) {
  console.log("\n📥 New request received at:", new Date().toISOString());

  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) {
    console.log("⛔ Request blocked by rate limiter");
    return rateLimiterResponse;
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const mode = searchParams.get("mode") || "regular";

    if (mode !== "pvp" && mode !== "pve" && mode !== "regular") {
      return NextResponse.json(
        { error: "Invalid mode parameter" },
        { status: 400 }
      );
    }

    const gameMode = mode === "pvp" ? "regular" : mode;
    const items = await getCachedItems(gameMode);

    console.log("✅ Request completed successfully:", {
      itemCount: items.length,
      firstItem: items[0]?.name,
    });

    // Return items array directly
    return NextResponse.json(items, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("❌ Error in items route:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}
