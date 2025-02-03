// app/api/pve-items/route.ts

import { NextResponse, NextRequest } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { rateLimiter } from "@/app/lib/rateLimiter";
import { GraphQLResponse } from "@/types/GraphQLResponse";
import { unstable_cache } from "next/cache";
import { compressSync } from "fflate";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

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
      errorData.errors?.[0]?.message || "Failed to fetch PVE data"
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

const getCachedItems = unstable_cache(
  async () => {
    return await fetchAndProcessItems();
  },
  ["pve-items"],
  {
    revalidate: 1800, // 30 minutes
    tags: ["pve-items"],
  }
);

export async function GET(request: NextRequest) {
  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) return rateLimiterResponse;

  try {
    const items = await getCachedItems();
    const responseData = JSON.stringify(items);
    const compressedData = compressSync(new TextEncoder().encode(responseData));

    return new NextResponse(compressedData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error in PVE items route:", error);
    return NextResponse.json(
      { error: "Failed to fetch PVE items" },
      { status: 500 }
    );
  }
}
