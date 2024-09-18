// app/api/items/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY is not defined in environment variables.");

const PVP_URL = `https://api.tarkov-market.app/api/v1/items/all/download`;
const PVE_URL = `https://api.tarkov-market.app/api/v1/pve/items/all/download`;

const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes
const cachedData: { [key: string]: Item[] } = {};
const cacheTimestamps: { [key: string]: number } = {};

// Define a type for the item structure
type Item = {
  uid: string;
  name: string;
  basePrice: number;
  price: number;
  tags: string[];
  updated: number;
};

const querySchema = z.object({
  mode: z.enum(['pve', 'pvp']),
});

function logDevelopmentInfo(message: string, data?: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data ? JSON.stringify(data, null, 2) : '');
  }
}

async function fetchData(url: string): Promise<Item[]> {
  const response = await fetch(url, { headers: { 'x-api-key': API_KEY as string } });
  if (!response.ok) {
    await response.text();
    logDevelopmentInfo("Fetch error:", { status: response.status, errorText: 'Error details hidden for security.' });
    throw new Error('Failed to fetch data from external API.');
  }
  const data: Item[] = await response.json();
  if (!Array.isArray(data)) throw new Error('Invalid data format received from external API.');
  return data.map(item => ({
    uid: item.uid,
    name: item.name,
    basePrice: item.basePrice,
    price: item.price,
    tags: item.tags,
    updated: item.updated
  }));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const parseResult = querySchema.safeParse({ mode });

  if (!parseResult.success) {
    logDevelopmentInfo("Invalid mode parameter:", mode);
    return NextResponse.json({ error: 'Invalid mode. Use "pve" or "pvp".' }, { status: 400 });
  }

  const validatedMode = parseResult.data.mode;
  const currentTime = Date.now();
  const lastFetched = cacheTimestamps[validatedMode];

  if (cachedData[validatedMode] && lastFetched && (currentTime - lastFetched) <= CACHE_DURATION) {
    logDevelopmentInfo(`Using cached data for mode: ${validatedMode}`);
    return NextResponse.json(cachedData[validatedMode]);
  }

  try {
    const fetchUrl = validatedMode === 'pve' ? PVE_URL : PVP_URL;
    const data = await fetchData(fetchUrl);
    cachedData[validatedMode] = data;
    cacheTimestamps[validatedMode] = currentTime;
    logDevelopmentInfo(`Fetched new data for mode: ${validatedMode}`);
    return NextResponse.json({
      data,
      cacheTimestamp: currentTime // Include the cache timestamp in the response
    });
  } catch (error) {
    logDevelopmentInfo("Error fetching items:", { error: 'Error details hidden for security.' });
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}