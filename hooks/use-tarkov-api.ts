import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { GraphQLResponse, TarkovItem } from "@/types/GraphQLResponse";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

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

// Cache for the combined data to avoid duplicate fetches
let combinedDataCache: CombinedTarkovData | null = null;
let lastFetchTime = 0;

/**
 * Fetches all Tarkov item data from the tarkov.dev GraphQL API for both game modes
 * @returns Promise with combined data for both PVP and PVE modes
 */
export async function fetchCombinedTarkovData(): Promise<CombinedTarkovData> {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (combinedDataCache && now - lastFetchTime < CACHE_TTL) {
    console.debug('📦 Using cached combined Tarkov data');
    return combinedDataCache;
  }
  
  const startTime = Date.now();
  
  // Query both game modes in a single request
  const query = `
    {
      pvpItems: items(gameMode: regular) {
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
        categories {
          name
        }
      }
      pveItems: items(gameMode: pve) {
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
        categories {
          name
        }
      }
    }
  `;

  try {
    console.debug('🔄 Fetching combined Tarkov data');
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`RATE_LIMIT:${response.status}`);
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const { data, errors } = await response.json() as GraphQLResponse;
    
    if (errors) {
      console.error('GraphQL errors:', errors);
      throw new Error(`GraphQL errors: ${errors.map(e => e.message).join(', ')}`);
    }
    
    if (!data?.pvpItems || !data?.pveItems) {
      throw new Error('Missing data in API response');
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
      width: item.width,
      height: item.height,
      categories: item.categories.map((cat: { name: string }) => cat.name),
      tags: [],
      isExcluded: false,
      categories_display: item.categories,
    });

    const transformPvpItems = data.pvpItems.map(transformItem);
    const transformPveItems = data.pveItems.map(transformItem);

    // Count unique categories (combining both modes)
    const allCategories = new Set([...transformPvpItems, ...transformPveItems].flatMap(item => item.categories || []));

    const processTime = Date.now() - startTime;
    
    // Update the cache
    combinedDataCache = {
      pvp: transformPvpItems,
      pve: transformPveItems,
      meta: {
        totalItems: transformPvpItems.length + transformPveItems.length,
        validItems: transformPvpItems.length + transformPveItems.length,
        processTime,
        categories: allCategories.size,
      }
    };
    
    lastFetchTime = now;
    
    // Data has been fetched and processed successfully
    
    return combinedDataCache;
  } catch (error) {
    console.error('Error fetching combined Tarkov data:', error);
    throw error;
  }
}

/**
 * Fetches Tarkov item data for a specific game mode
 * @param gameMode 'pve' or 'regular' (pvp)
 * @returns Promise with transformed items in SimplifiedItem format
 */
export async function fetchTarkovData(
  gameMode: 'pve' | 'regular'
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
    const combinedData = await fetchCombinedTarkovData();
    
    // Extract the items for the requested game mode
    const items = gameMode === 'pve' ? combinedData.pve : combinedData.pvp;
    
    // Count categories for this specific mode
    const categoryCount = new Set(items.flatMap(item => item.categories || []));
    
    // Return the data in the expected format
    return {
      items,
      meta: {
        ...combinedData.meta,
        totalItems: items.length,
        validItems: items.length,
        categories: categoryCount.size,
        mode: gameMode === 'pve' ? 'pve' : 'pvp'
      }
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
  link: string;
}

interface FetchMinimalTarkovGraphQLResponse {
  data?: {
    pvpItems: MinimalItem[];
    pveItems: MinimalItem[];
  };
  errors?: Array<{ message: string }>;
}

export async function fetchMinimalTarkovData(): Promise<{ pvpItems: MinimalItem[]; pveItems: MinimalItem[] }> {
  const startTime = Date.now();
  const query = `
    {
      pvpItems: items(gameMode: regular) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        avg24hPrice
        link
      }
      pveItems: items(gameMode: pve) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        avg24hPrice
        link
      }
    }
  `;

  try {
    console.debug('🔄 Fetching minimal Tarkov data');
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 300 }, // 5 minutes cache
    });

    if (!response.ok) {
      console.error(`❌ HTTP error! Status: ${response.status} when fetching minimal Tarkov data`);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result: FetchMinimalTarkovGraphQLResponse = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL errors on minimal fetch:', result.errors);
      throw new Error(`GraphQL error: ${result.errors.map(e => e.message).join(', ')}`);
    }

    if (!result.data || !result.data.pvpItems || !result.data.pveItems) {
      console.error('❌ No data in GraphQL response for minimal fetch');
      throw new Error('No data returned from Tarkov API for minimal fetch');
    }

    const endTime = Date.now();
    console.debug(`✅ Minimal Tarkov data fetched in ${endTime - startTime}ms`);

    return { pvpItems: result.data.pvpItems, pveItems: result.data.pveItems };
  } catch (error) {
    console.error('❌ Failed to fetch minimal Tarkov data:', error);
    return { pvpItems: [], pveItems: [] };
  }
}