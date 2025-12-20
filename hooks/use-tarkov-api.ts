import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { GraphQLResponse, TarkovItem } from "@/types/GraphQLResponse";

const DEFAULT_GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

const GRAPHQL_API_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_TARKOV_GRAPHQL_URL ?? DEFAULT_GRAPHQL_API_URL
    : process.env.TARKOV_GRAPHQL_URL ?? DEFAULT_GRAPHQL_API_URL;

// Define a type for the combined data response
interface CombinedTarkovData {
  pvp: SimplifiedItem[];
  pve: SimplifiedItem[];
  meta: {
    totalItems: number;
    validItems: number;
    processTime: number;
    categories: number;
  };
}

// Define a consistent cache TTL to use across the application
export const CACHE_TTL = 900000; // 15 minutes

// Cache for the combined data to avoid duplicate fetches (per language)
const combinedDataCacheByLang: Map<
  string,
  { data: CombinedTarkovData; time: number }
> = new Map();

// Cache for the minimal data to avoid duplicate fetches (per language)
const minimalDataCacheByLang: Map<
  string,
  { data: { pvpItems: MinimalItem[]; pveItems: MinimalItem[] }; time: number }
> = new Map();

export function resetTarkovApiCachesForTests() {
  combinedDataCacheByLang.clear();
  minimalDataCacheByLang.clear();
}

/**
 * Fetches all Tarkov item data from the tarkov.dev GraphQL API for both game modes
 * @returns Promise with combined data for both PVP and PVE modes
 */
export async function fetchCombinedTarkovData(
  language: string = "en"
): Promise<CombinedTarkovData> {
  const now = Date.now();

  // Return cached data if it's still fresh
  const cached = combinedDataCacheByLang.get(language);
  if (cached && now - cached.time < CACHE_TTL) {
    console.debug(`📦 Using cached combined Tarkov data [${language}]`);
    return cached.data;
  }

  const startTime = Date.now();

  // Query both game modes in a single request
  const query = `
    {
      pvpItems: items(gameMode: regular, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        updated
        width
        height
        lastOfferCount
        iconLink
        avg24hPrice
        link
        categories {
          id
          name
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
            }
          }
        }
      }
      pveItems: items(gameMode: pve, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        updated
        width
        height
        lastOfferCount
        avg24hPrice
        iconLink
        link
        categories {
          id
          name
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
            }
          }
        }
      }
    }
  `;

  try {
    console.debug("🔄 Fetching combined Tarkov data");
    const response = await fetch(GRAPHQL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`RATE_LIMIT:${response.status}`);
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const { data, errors } = (await response.json()) as GraphQLResponse;

    // Check if we have valid data first
    if (!data?.pvpItems || !data?.pveItems) {
      throw new Error("Missing data in API response");
    }

    // Only throw on errors if they're critical (not just translation warnings)
    if (errors && errors.length > 0) {
      // Check if all errors are translation-related (non-critical)
      const hasNonTranslationErrors = errors.some(
        (e) => !e.message.includes("Missing translation for key")
      );

      if (hasNonTranslationErrors) {
        console.error("GraphQL errors:", errors);
        throw new Error(
          `GraphQL errors: ${errors.map((e) => e.message).join(", ")}`
        );
      } else {
        // Just log translation warnings, don't fail the request
        console.warn(
          `⚠️ Translation warnings (${errors.length} items missing translations for language: ${language})`
        );
      }
    }

    // Transform the data for both modes
    const transformItem = (item: TarkovItem) => ({
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      basePrice: item.basePrice,
      lastLowPrice: item.lastLowPrice || undefined,
      updated: item.updated,
      lastOfferCount: item.lastOfferCount || undefined,
      avg24hPrice: item.avg24hPrice || undefined,
      iconLink: item.iconLink,
      link: item.link,
      width: item.width,
      height: item.height,
      // Use language-agnostic category IDs for filtering logic
      // Non-null assertion is safe here because this query selects `id` for categories
      categories: item.categories.map(
        (cat: { id?: string; name: string }) => cat.id!
      ),
      tags: [],
      isExcluded: false,
      categories_display: item.categories,
      buyFor: item.buyFor
        ? item.buyFor
          .filter((o) => !!o && !!o.vendor && typeof o.priceRUB === "number")
          .map((o) => ({
            priceRUB: o.priceRUB,
            vendor: {
              normalizedName: o.vendor.normalizedName,
              minTraderLevel: o.vendor.minTraderLevel,
            },
          }))
        : undefined,
    });

    const transformPvpItems = data.pvpItems.map(transformItem);
    const transformPveItems = data.pveItems.map(transformItem);

    // buyFor is already included in the combined query above; no merge needed.

    // Count unique categories (combining both modes)
    const allCategories = new Set(
      [...transformPvpItems, ...transformPveItems].flatMap(
        (item) => item.categories || []
      )
    );

    const processTime = Date.now() - startTime;

    // Update the cache
    const combined: CombinedTarkovData = {
      pvp: transformPvpItems,
      pve: transformPveItems,
      meta: {
        totalItems: transformPvpItems.length + transformPveItems.length,
        validItems: transformPvpItems.length + transformPveItems.length,
        processTime,
        categories: allCategories.size,
      },
    };
    // store per-language cache
    combinedDataCacheByLang.set(language, { data: combined, time: now });

    // Data has been fetched and processed successfully

    return combined;
  } catch (error) {
    console.error("Error fetching combined Tarkov data:", error);
    throw error;
  }
}

/**
 * Fetches Tarkov item data for a specific game mode
 * @param gameMode 'pve' or 'regular' (pvp)
 * @returns Promise with transformed items in SimplifiedItem format
 */
export async function fetchTarkovData(
  gameMode: "pve" | "regular",
  language: string = "en"
): Promise<{
  items: SimplifiedItem[];
  meta: {
    totalItems: number;
    validItems: number;
    processTime: number;
    categories: number;
    mode: string;
  };
}> {
  try {
    // Use the combined data fetcher and extract the relevant mode's data
    const combinedData = await fetchCombinedTarkovData(language);

    // Extract the items for the requested game mode
    const items = gameMode === "pve" ? combinedData.pve : combinedData.pvp;

    // Count categories for this specific mode
    const categoryCount = new Set(
      items.flatMap((item) => item.categories || [])
    );

    // Return the data in the expected format
    return {
      items,
      meta: {
        ...combinedData.meta,
        totalItems: items.length,
        validItems: items.length,
        categories: categoryCount.size,
        mode: gameMode === "pve" ? "pve" : "pvp",
      },
    };
  } catch (error) {
    console.error(`Error fetching Tarkov data (${gameMode}):`, error);
    throw error;
  }
}

export interface MinimalItem {
  id: string;
  name: string;
  shortName: string;
  basePrice: number;
  lastLowPrice: number | null;
  avg24hPrice: number | null;
  categories: {
    name: string;
  }[];
  link: string;
  sellFor: {
    vendor: {
      normalizedName: string;
    };
    priceRUB: number;
  }[];
  buyFor: {
    priceRUB: number;
    vendor: {
      normalizedName: string;
      minTraderLevel?: number;
      buyLimit?: number;
    };
  }[];
}

interface FetchMinimalTarkovGraphQLResponse {
  data?: {
    pvpItems: MinimalItem[];
    pveItems: MinimalItem[];
  };
  errors?: Array<{ message: string }>;
}

export async function fetchMinimalTarkovData(
  language: string = "en"
): Promise<{ pvpItems: MinimalItem[]; pveItems: MinimalItem[] }> {
  const now = Date.now();

  // Return cached data if it's still fresh
  const cached = minimalDataCacheByLang.get(language);
  if (cached && now - cached.time < CACHE_TTL) {
    console.debug(`📦 Using cached minimal Tarkov data [${language}]`);
    return cached.data;
  }

  const startTime = Date.now();
  const query = `
    {
      pvpItems: items(gameMode: regular, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        avg24hPrice
        categories {
          name
        }
        link
        sellFor {
          vendor {
            normalizedName
          }
          priceRUB
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
              buyLimit
            }
          }
        }
      }
      pveItems: items(gameMode: pve, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        avg24hPrice
        categories {
          name
        }
        link
        sellFor {
          vendor {
            normalizedName
          }
          priceRUB
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
              buyLimit
            }
          }
        }
      }
    }
  `;

  try {
    console.debug("🔄 Fetching minimal Tarkov data");
    const response = await fetch(GRAPHQL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
      // Using CACHE_TTL instead of next.revalidate for consistency
    });

    if (!response.ok) {
      console.error(
        `❌ HTTP error! Status: ${response.status} when fetching minimal Tarkov data`
      );
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result: FetchMinimalTarkovGraphQLResponse = await response.json();

    if (!result.data || !result.data.pvpItems || !result.data.pveItems) {
      console.error("❌ No data in GraphQL response for minimal fetch");
      throw new Error("No data returned from Tarkov API for minimal fetch");
    }

    // Only throw on errors if they're critical (not just translation warnings)
    if (result.errors && result.errors.length > 0) {
      const hasNonTranslationErrors = result.errors.some(
        (e) => !e.message.includes("Missing translation for key")
      );

      if (hasNonTranslationErrors) {
        console.error("❌ GraphQL errors on minimal fetch:", result.errors);
        throw new Error(
          `GraphQL error: ${result.errors.map((e) => e.message).join(", ")}`
        );
      } else {
        console.warn(
          `⚠️ Translation warnings in minimal fetch (${result.errors.length} items missing translations for language: ${language})`
        );
      }
    }

    const endTime = Date.now();
    console.debug(`✅ Minimal Tarkov data fetched in ${endTime - startTime}ms`);

    // Update the cache
    const data = {
      pvpItems: result.data.pvpItems,
      pveItems: result.data.pveItems,
    };
    minimalDataCacheByLang.set(language, { data, time: now });

    return data;
  } catch (error) {
    console.error("❌ Failed to fetch minimal Tarkov data:", error);
    return { pvpItems: [], pveItems: [] };
  }
}
