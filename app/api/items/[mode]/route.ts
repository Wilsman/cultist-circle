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

  const { data, error } = await supabase.from(tableName).select("*");
  if (error) {
    console.error(`❌ [${mode.toUpperCase()}] Database error:`, error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }

  // Log database fetch timing
  console.log(`⏱️ [${mode.toUpperCase()}] Database fetch completed in ${Date.now() - startTime}ms`);
  console.log(`📊 [${mode.toUpperCase()}] Raw items count: ${data.length}`);

  // Transform the items server-side
  const transformedItems = data
    .map(transformItem)
    .filter((item): item is SimplifiedItem => item !== null);

  // Log transformation results
  console.log(`✅ [${mode.toUpperCase()}] Transformed ${transformedItems.length} valid items out of ${data.length} total`);

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
      totalItems: data.length,
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
