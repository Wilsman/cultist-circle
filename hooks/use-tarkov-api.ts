import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { GraphQLResponse } from "@/types/GraphQLResponse";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";
const INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Fetches Tarkov item data from the tarkov.dev GraphQL API
 * @param gameMode 'pve' or 'regular' (pvp)
 * @returns Promise with transformed items in SimplifiedItem format
 */
export async function fetchTarkovData(gameMode: 'pve' | 'regular'): Promise<{
  items: SimplifiedItem[];
  meta: {
    totalItems: number;
    validItems: number;
    processTime: number;
    categories: number;
    mode: string;
  };
}> {
  const startTime = Date.now();
  const mode = gameMode === 'pve' ? 'pve' : 'pvp';
  
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

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const { data, errors } = await response.json() as GraphQLResponse;
    
    if (errors) {
      console.error('GraphQL errors:', errors);
      throw new Error(`GraphQL errors: ${errors.map(e => e.message).join(', ')}`);
    }
    
    if (!data?.items) {
      throw new Error('No items data returned from API');
    }

    // Transform the data to match our SimplifiedItem structure
    const transformedItems: SimplifiedItem[] = data.items.map(item => ({
      id: item.id,
      name: item.name,
      basePrice: item.basePrice,
      lastLowPrice: item.lastLowPrice || undefined,
      updated: item.updated,
      categories: item.categories.map(cat => cat.name),
      tags: [],
      isExcluded: false,
      categories_display: item.categories,
    }));

    // Count unique categories
    const categoryCount = new Set(transformedItems.flatMap(item => item.categories || []));

    const processTime = Date.now() - startTime;
    
    return {
      items: transformedItems,
      meta: {
        totalItems: data.items.length,
        validItems: transformedItems.length,
        processTime,
        categories: categoryCount.size,
        mode: gameMode === 'pve' ? 'pve' : 'pvp'
      }
    };
  } catch (error) {
    console.error(`Error fetching Tarkov data (${gameMode}):`, error);
    throw error;
  }
}