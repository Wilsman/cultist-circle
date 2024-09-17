// app/api/items/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY is not defined in environment variables.");
}

const PVP_URL = `https://api.tarkov-market.app/api/v1/items/all/download?x-api-key=${API_KEY}`;
const PVE_URL = `https://api.tarkov-market.app/api/v1/pve/items/all/download?x-api-key=${API_KEY}`;

const cachedData: { [key: string]: Item[] } = {}; // Specify Item type for cached data
const CACHE_DURATION = 1 * 30 * 1000; // 30 seconds
const cacheTimestamps: { [key: string]: number } = {};

// Define a type for the item structure
type Item = {
  uid: string;
  name: string;
  basePrice: number;
  price: number;
  tags: string[];
};

const querySchema = z.object({
  mode: z.enum(['pve', 'pvp']),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  const parseResult = querySchema.safeParse({ mode });

  if (!parseResult.success) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Invalid mode parameter:", mode);
    }
    return NextResponse.json({ error: 'Invalid mode. Use "pve" or "pvp".' }, { status: 400 });
  }

  const validatedMode = parseResult.data.mode;

  const currentTime = Date.now();
  const lastFetched = cacheTimestamps[validatedMode];

  // Check if we have cached data and if it's still valid
  if (cachedData[validatedMode] && lastFetched && (currentTime - lastFetched) <= CACHE_DURATION) {
    // Use cached data
    if (process.env.NODE_ENV === 'development') {
      console.log(`Using cached data for mode: ${validatedMode}`);
      console.log(`Current time: ${new Date(currentTime).toLocaleTimeString()}`);
      console.log(`Last cache time: ${new Date(lastFetched).toLocaleTimeString()}`);
    }
    return NextResponse.json(cachedData[validatedMode]);
  }

  // Fetch new data if cache is empty or expired
  const fetchUrl = validatedMode === 'pve' ? PVE_URL : PVP_URL;
  try {
    const response = await fetch(fetchUrl, {
      headers: {
        'x-api-key': API_KEY as string,
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV === 'development') {
        console.error("Fetch error:", response.status, errorText);
      }
      return NextResponse.json({ error: 'Failed to fetch data from external API.' }, { status: response.status });
    }
  
    const data: Item[] = await response.json(); // Use the defined type
  
    // Log two elements from the JSON response
    if (process.env.NODE_ENV === 'development') {
      console.log("Raw data from API:", data.slice(0, 2));
    }
  
    // Validate data structure
    if (!Array.isArray(data)) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Invalid data format received:", data);
      }
      return NextResponse.json({ error: 'Invalid data format received from external API.' }, { status: 500 });
    }
  
    // Transform the data to match expected structure
    const transformedData = data.map((item: Item) => ({
      uid: item.uid,
      name: item.name,
      basePrice: item.basePrice,
      price: item.price,
      tags: item.tags,
    }));
  
    // Log two elements after the mapping
    if (process.env.NODE_ENV === 'development') {
      console.log("Transformed data:", transformedData.slice(0, 2));
    }
  
    // Cache the new data
    cachedData[validatedMode] = transformedData;
    cacheTimestamps[validatedMode] = currentTime;
  
    if (process.env.NODE_ENV === 'development') {
      console.log(`Fetched new data for mode: ${validatedMode}`);
      console.log(`Current time: ${new Date(currentTime).toLocaleTimeString()}`);
      console.log(`Last cache time: ${new Date(lastFetched).toLocaleTimeString()}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching items:", error);
    }
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
  
  return NextResponse.json(cachedData[validatedMode]);
}