import { NextRequest, NextResponse } from "next/server";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { IGNORED_ITEMS } from "@/config/config";
import { rateLimiter } from "@/app/lib/rateLimiter";
import { APIResponse } from "@/types/ApiResponse";
import { unstable_cache } from "next/cache";

const API_URL = "https://yopta.life/tarkov-cc-api";
const isDevelopment = process.env.NODE_ENV === "development";

export const runtime = "nodejs";
export const revalidate = 5;

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
    new Date().toISOString(),
  );

  console.log(`[${gameMode}] Fetching from the API...`);
  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      `[${gameMode}] API responded with status:`,
      response.status,
    );
    const errorData = await response.json();
    throw new Error(
      errorData.errors?.[0]?.message ||
        `Failed to fetch ${gameMode.toUpperCase()} data`,
    );
  }

  console.log(`[${gameMode}] Successfully received api response`);
  const items: APIResponse = await response.json();

  if (!items.length) {
    console.error(`[${gameMode}] Invalid data structure received:`, items);
    throw new Error("Invalid data structure from the API");
  }

  console.log(`[${gameMode}] Raw items count:`, items.length);

  const simplifiedData: SimplifiedItem[] = items
    .filter(
      (item) =>
        !IGNORED_ITEMS.includes(item.name) && item.lastLowPrice !== null,
    )
    .map((item) => ({
      uid: item._id,
      name: item.name,
      basePrice: item.basePrice,
      price: item.lastLowPrice!,
      updated: new Date().toISOString(), // workaround for missing updated field
      tags: item.types,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`[${gameMode}] Processed items count:`, simplifiedData.length);
  return processItems(simplifiedData);
}

const getCachedItems = unstable_cache(
  async (gameMode: "pve" | "regular") => {
    console.log(
      `🔄 [${gameMode.toUpperCase()}] Cache function called at:`,
      new Date().toISOString(),
    );
    const items = await fetchAndProcessItems(gameMode);
    console.log(
      `✅ [${gameMode.toUpperCase()}] Cache populated with items count:`,
      items.length,
    );
    return items;
  },
  ["items-cache"],
  {
    revalidate: 1800,
    tags: ["items-cache"],
  },
);

export async function GET(request: NextRequest) {
  console.log("\n📥 New request received at:", new Date().toISOString());

  const rateLimiterResponse = rateLimiter(request);
  if (rateLimiterResponse) {
    console.log("⛔ Request blocked by rate limiter");
    return rateLimiterResponse;
  }

  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode");

  console.log("🔍 Request mode:", mode);

  if (!mode || (mode !== "pve" && mode !== "pvp")) {
    console.log("❌ Invalid mode parameter received");
    return NextResponse.json(
      { error: "Invalid mode parameter. Use 'pve' or 'pvp'" },
      { status: 400 },
    );
  }

  try {
    console.log(
      `⚡ Attempting to fetch ${mode.toUpperCase()} items from cache`,
    );
    const items = await getCachedItems(mode === "pve" ? "pve" : "regular");

    if (items.length === 0) {
      console.log(`⚠️ No ${mode.toUpperCase()} items found`);
      return NextResponse.json(
        {
          data: [],
          message: `No ${mode.toUpperCase()} items available at the moment.`,
          timestamp: Date.now(),
        },
        {
          headers: {
            "Cache-Control": isDevelopment
              ? "no-store"
              : "public, s-maxage=1800, stale-while-revalidate=60",
          },
        },
      );
    }

    const endTime = Date.now();
    console.log(`✅ Request completed successfully:`);
    console.log(`   - Items returned: ${items.length}`);
    console.log(`   - Response time: ${endTime - startTime}ms`);
    console.log(
      `   - Cache headers: ${
        isDevelopment
          ? "no-store"
          : "public, s-maxage=1800, stale-while-revalidate=60"
      }`,
    );

    return NextResponse.json(
      {
        data: items,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Cache-Control": isDevelopment
            ? "no-store"
            : "public, s-maxage=1800, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error(`❌ Error in ${mode.toUpperCase()} items route:`);
    console.error(error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
