import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformItem(item: any): SimplifiedItem | null {
  if (!item?.id || !item?.name || typeof item?.base_price !== "number") {
    console.debug(`⚠️ Skipping item due to missing required fields:`, item);
    return null;
  }

  // Parse the updated timestamp directly - it comes as an ISO string from Supabase
  const updated = item.updated ? item.updated : undefined;

  return {
    id: item.id,
    name: item.name,
    basePrice: item.base_price,
    lastLowPrice: item.last_low_price || undefined,
    updated,
    categories: item.categories || [],
    tags: item.tags || [],
    isExcluded: false,
    categories_display: item.categories?.map((cat: string) => ({ name: cat })) || [],
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ mode: string }> }
) {
  const startTime = Date.now();
  const params = await context.params;
  const mode = params.mode;

  // Log request details
  console.log(`📝 [${mode.toUpperCase()}] Request received:`, {
    url: request.url,
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'if-none-match': request.headers.get('if-none-match'),
      'if-modified-since': request.headers.get('if-modified-since'),
    }
  });

  // Validate mode parameter
  if (!mode || !["pve", "pvp"].includes(mode)) {
    console.error(`❌ Invalid mode: ${mode}`);
    return NextResponse.json(
      { error: "Invalid mode parameter" },
      { status: 400 }
    );
  }

  const tableName = mode === "pve" ? "tarkov_items_pve" : "tarkov_items_pvp";
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // First, get the count of all items to determine how many batches we need
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error(`❌ [${mode.toUpperCase()}] Count error:`, countError);
    return NextResponse.json({ error: "Failed to count items" }, { status: 500 });
  }

  console.log(`📊 [${mode.toUpperCase()}] Total items count: ${count}`);

  // Supabase has a default limit of 1,000 rows per request
  // Use pagination to fetch all items in batches
  const batchSize = 1000;
  const batches = Math.ceil((count || 0) / batchSize);
  let allItems: any[] = [];

  console.log(`🔄 [${mode.toUpperCase()}] Fetching ${batches} batches of ${batchSize} items each`);

  // Fetch all batches in parallel
  const batchPromises = Array.from({ length: batches }, (_, i) => {
    const from = i * batchSize;
    const to = from + batchSize - 1;
    console.log(`📦 [${mode.toUpperCase()}] Fetching batch ${i + 1}/${batches} (range ${from}-${to})`);

    return supabase
      .from(tableName)
      .select("*")
      .range(from, to);
  });

  const batchResults = await Promise.all(batchPromises);

  // Check for errors and combine all items
  for (let i = 0; i < batchResults.length; i++) {
    const { data, error } = batchResults[i];

    if (error) {
      console.error(`❌ [${mode.toUpperCase()}] Batch ${i + 1} error:`, error);
      return NextResponse.json({ error: `Failed to fetch batch ${i + 1}` }, { status: 500 });
    }

    if (data) {
      console.log(`✅ [${mode.toUpperCase()}] Batch ${i + 1} received ${data.length} items`);
      allItems = [...allItems, ...data];
    }
  }

  // Log database fetch timing
  console.log(`⏱️ [${mode.toUpperCase()}] Database fetch completed in ${Date.now() - startTime}ms`);
  console.log(`📊 [${mode.toUpperCase()}] Raw items count: ${allItems.length}`);

  // Transform the items server-side
  const transformedItems = allItems
    .map(transformItem)
    .filter((item): item is SimplifiedItem => item !== null);

  // Log transformation results
  console.log(`✅ [${mode.toUpperCase()}] Transformed ${transformedItems.length} valid items out of ${allItems.length} total`);

  // Group items by category for monitoring
  const categoryCount = transformedItems.reduce((acc, item) => {
    (item.categories || []).forEach(cat => {
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  console.log(`📑 [${mode.toUpperCase()}] Items by category:`, categoryCount);

  const response = NextResponse.json({
    items: transformedItems,
    meta: {
      totalItems: allItems.length,
      validItems: transformedItems.length,
      processTime: Date.now() - startTime,
      categories: Object.keys(categoryCount).length,
      mode
    }
  });

  // Set proper cache headers for edge caching
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=900, stale-while-revalidate=60" // 15 minutes with 1 minute stale
  );
  // Add Vary header to properly handle different modes
  response.headers.set("Vary", "accept-encoding, x-mode");
  // Set mode header for cache key differentiation
  response.headers.set("x-mode", mode);
  // Add timing header with more detailed metrics
  const duration = Date.now() - startTime;
  response.headers.set("Server-Timing", `total;dur=${duration}`);
  response.headers.set("Timing-Allow-Origin", "*"); // Allow timing information for CORS requests

  console.log(`🏁 [${mode.toUpperCase()}] Request completed in ${duration}ms`);

  return response;
}
