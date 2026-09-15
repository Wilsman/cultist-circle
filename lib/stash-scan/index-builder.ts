// Builds the icon index from the Tarkov.dev catalog. Shared by the build-time
// script (scripts/build-stash-scan-index.ts) and the self-hosted runtime store.

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { FEATURE_VERSION } from "./features";
import type { RgbImage } from "./grid";
import type { IndexMetadata } from "./index-file";
import { addCatalogIcon, createIconIndex, type IconIndex } from "./matcher";

const JSON_API_URL =
  process.env.TARKOV_JSON_URL ??
  process.env.NEXT_PUBLIC_TARKOV_JSON_URL ??
  "https://json.tarkov.dev";

/** Grid images are re-downloaded after this long. */
const IMAGE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const DOWNLOAD_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 20000;

export interface CatalogEntry {
  id: string;
  shortName: string;
  width: number;
  height: number;
  gridImageLink: string;
}

interface JsonEnvelope<T> {
  data: T;
}

interface JsonItem {
  id: string;
  shortName: string;
  width?: number;
  height?: number;
  gridImageLink?: string;
}

export type Logger = (message: string) => void;

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} (${url})`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCatalog(): Promise<CatalogEntry[]> {
  const [itemsResponse, englishResponse] = await Promise.all([
    fetchWithTimeout(`${JSON_API_URL}/regular/items`),
    fetchWithTimeout(`${JSON_API_URL}/regular/items_en`),
  ]);
  const items = (await itemsResponse.json()) as JsonEnvelope<{
    items: Record<string, JsonItem>;
  }>;
  const english = (await englishResponse.json()) as JsonEnvelope<Record<string, string>>;

  const entries: CatalogEntry[] = [];
  for (const item of Object.values(items.data.items)) {
    if (!item.gridImageLink || !item.width || !item.height) continue;
    entries.push({
      id: item.id,
      shortName: english.data[item.shortName] ?? item.shortName,
      width: item.width,
      height: item.height,
      gridImageLink: item.gridImageLink,
    });
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

export function catalogHash(entries: CatalogEntry[]): string {
  const hash = createHash("sha256");
  hash.update(`v${FEATURE_VERSION}\n`);
  for (const e of entries) {
    hash.update(`${e.id}\t${e.shortName}\t${e.width}\t${e.height}\t${e.gridImageLink}\n`);
  }
  return hash.digest("hex").slice(0, 16);
}

async function cachedGridImage(
  entry: CatalogEntry,
  imageDir: string,
  log: Logger,
): Promise<Buffer | null> {
  const file = path.join(/* turbopackIgnore: true */ imageDir, `${entry.id}.webp`);
  try {
    const info = await stat(file);
    if (Date.now() - info.mtimeMs < IMAGE_MAX_AGE_MS) return await readFile(file);
  } catch {
    // Not cached yet.
  }

  try {
    const response = await fetchWithTimeout(entry.gridImageLink);
    const bytes = Buffer.from(await response.arrayBuffer());
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, bytes);
    await rename(temporary, file);
    return bytes;
  } catch (error) {
    // Fall back to a stale copy rather than dropping the item.
    try {
      return await readFile(file);
    } catch {
      log(`could not fetch grid image for ${entry.id}: ${String(error)}`);
      return null;
    }
  }
}

/** Decodes an image to packed RGB. */
export async function decodeRgb(bytes: Buffer, maxPixels?: number): Promise<RgbImage> {
  const { data, info } = await sharp(bytes, maxPixels ? { limitInputPixels: maxPixels } : {})
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Keep sharp's Buffer itself: under Bun, a separate Uint8Array view over it
  // was seen to read garbage once many decodes had run.
  return { data, width: info.width, height: info.height };
}

/**
 * Builds an index for `catalog`, keeping grid images under `imageDir`.
 * Downloads and decodes run concurrently; feature extraction is synchronous,
 * so the event loop is handed back after every item.
 */
export async function buildIndex(
  catalog: CatalogEntry[],
  imageDir: string,
  log: Logger,
): Promise<{ index: IconIndex; metadata: IndexMetadata }> {
  await mkdir(imageDir, { recursive: true });
  const index = createIconIndex();
  let items = 0;
  let next = 0;
  await Promise.all(
    Array.from({ length: DOWNLOAD_CONCURRENCY }, async () => {
      while (next < catalog.length) {
        const entry = catalog[next++];
        const bytes = await cachedGridImage(entry, imageDir, log);
        if (!bytes) continue;
        try {
          if (addCatalogIcon(index, { ...entry, grid: await decodeRgb(bytes) })) items++;
        } catch (error) {
          log(`could not index ${entry.id}: ${String(error)}`);
        }
        await yieldToEventLoop();
      }
    }),
  );
  return {
    index,
    metadata: {
      featureVersion: FEATURE_VERSION,
      catalogHash: catalogHash(catalog),
      builtAt: new Date().toISOString(),
      items,
    },
  };
}
