// app/api/pvp-items/route.ts

import { NextResponse, NextRequest } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { rateLimiter } from "@/app/lib/rateLimiter";
import { GraphQLResponse } from "@/types/GraphQLResponse";
import { unstable_cache } from "next/cache";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";
const isDevelopment = process.env.NODE_ENV === "development";

export const runtime = "nodejs";

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

// Move the fetch and process logic into a cached function
async function fetchAndProcessItems() {
  const query = `
    {
      items(gameMode: regular) {
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

  const response = await fetch(GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.errors?.[0]?.message || "Failed to fetch PVP data"
    );
  }

  const jsonData: GraphQLResponse = await response.json();

  if (!jsonData.data?.items) {
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

  return processItems(simplifiedData);
}

// Create a cached version of the function
const getCachedItems = unstable_cache(
  async () => {
    console.log("Cache test - Function executed:", Date.now());
    return await fetchAndProcessItems();
  },
  ["pvp-items"],
  {
    revalidate: 1800, // 30 minutes
    tags: ["pvp-items"],
  }
);

export async function GET(request: NextRequest) {
  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) return rateLimiterResponse;

  const startTime = Date.now();

  try {
    console.log("Cache test - Request timestamp:", Date.now());
    const items = await getCachedItems();

    if (items.length === 0) {
      return NextResponse.json(
        {
          data: [],
          message: "No PVP items available at the moment.",
          timestamp: Date.now(),
        },
        {
          headers: {
            "Cache-Control": isDevelopment
              ? "no-store"
              : "public, max-age=1800",
          },
        }
      );
    }

    const endTime = Date.now();
    console.log(`Response time: ${endTime - startTime}ms`);

    return NextResponse.json(
      {
        data: items,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": isDevelopment ? "no-store" : "public, max-age=1800",
        },
      }
    );
  } catch (error) {
    console.error("Error in PVP items route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
