import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

export const runtime = "edge";

interface RawTarkovItem {
  id: string;
  name: string;
  base_price: number;
  last_low_price?: number;
  updated?: string;
  categories?: string[];
  tags?: string[];
}

function transformItem(item: RawTarkovItem): SimplifiedItem | null {
  if (!item?.id || !item?.name || typeof item?.base_price !== "number") {
    return null;
  }

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

  if (!mode || !["pve", "pvp"].includes(mode)) {
    return NextResponse.json(
      { error: "Invalid mode parameter" },
      { status: 400 }
    );
  }

  const tableName = mode === "pve" ? "tarkov_items_pve" : "tarkov_items_pvp";
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) {
    return NextResponse.json({ error: "Failed to count items" }, { status: 500 });
  }

  const batchSize = 1000;
  const batches = Math.ceil((count || 0) / batchSize);
  let allItems: RawTarkovItem[] = [];

  const batchPromises = Array.from({ length: batches }, (_, i) => {
    const from = i * batchSize;
    const to = from + batchSize - 1;

    return supabase
      .from(tableName)
      .select("*")
      .range(from, to);
  });

  const batchResults = await Promise.all(batchPromises);

  for (let i = 0; i < batchResults.length; i++) {
    const { data, error } = batchResults[i];

    if (error) {
      return NextResponse.json({ error: `Failed to fetch batch ${i + 1}` }, { status: 500 });
    }

    if (data) {
      allItems = [...allItems, ...data];
    }
  }

  const transformedItems = allItems
    .map(transformItem)
    .filter((item): item is SimplifiedItem => item !== null);

  const categoryCount = transformedItems.reduce((acc, item) => {
    (item.categories || []).forEach(cat => {
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

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

  response.headers.set(
    "Cache-Control",
    "public, s-maxage=900, stale-while-revalidate=60"
  );
  response.headers.set("Vary", "accept-encoding, x-mode");
  response.headers.set("x-mode", mode);
  const duration = Date.now() - startTime;
  response.headers.set("Server-Timing", `total;dur=${duration}`);
  response.headers.set("Timing-Allow-Origin", "*");

  return response;
}
