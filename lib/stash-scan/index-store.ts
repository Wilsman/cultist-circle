// Server-side icon index lifecycle: fetch the Tarkov.dev catalog, keep grid
// images in a disk cache, build the template index and persist it so a
// restart loads in about a second instead of rebuilding.

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { RgbImage } from "./grid";
import { FEATURE_VERSION, type QuantisedVector } from "./features";
import {
  addCatalogIcon,
  addTemplate,
  createIconIndex,
  type IconIndex,
} from "./matcher";

const JSON_API_URL =
  process.env.TARKOV_JSON_URL ??
  process.env.NEXT_PUBLIC_TARKOV_JSON_URL ??
  "https://json.tarkov.dev";

// The cache is runtime data; keep the bundler's file tracing out of it.
const CACHE_DIR =
  process.env.STASH_SCAN_CACHE_DIR ??
  path.join(/* turbopackIgnore: true */ process.cwd(), ".cache", "stash-scan");

/** Grid images are re-downloaded after this long. */
const IMAGE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
/** How often the catalog is checked for new or changed items. */
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DOWNLOAD_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 20000;

interface CatalogEntry {
  id: string;
  shortName: string;
  width: number;
  height: number;
  gridImageLink: string;
}

export interface IndexStatus {
  ready: boolean;
  building: boolean;
  templates: number;
  items: number;
  builtAt: string | null;
  lastError: string | null;
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

interface StoreState {
  current: {
    index: IconIndex;
    items: number;
    builtAt: Date;
    catalogHash: string;
  } | null;
  building: Promise<IconIndex> | null;
  lastError: string | null;
  refreshTimer: ReturnType<typeof setInterval> | null;
}

// Next.js bundles instrumentation.ts and route handlers separately, each with
// its own copy of this module. Keep one index per process on globalThis.
const globalStore = globalThis as typeof globalThis & {
  __stashScanIndexStore?: StoreState;
};
const state: StoreState = (globalStore.__stashScanIndexStore ??= {
  current: null,
  building: null,
  lastError: null,
  refreshTimer: null,
});

const log = (message: string) => console.log(`[stash-scan] ${message}`);

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

async function fetchCatalog(): Promise<CatalogEntry[]> {
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

function catalogHash(entries: CatalogEntry[]): string {
  const hash = createHash("sha256");
  hash.update(`v${FEATURE_VERSION}\n`);
  for (const e of entries) {
    hash.update(`${e.id}\t${e.shortName}\t${e.width}\t${e.height}\t${e.gridImageLink}\n`);
  }
  return hash.digest("hex").slice(0, 16);
}

async function cachedGridImage(entry: CatalogEntry): Promise<Buffer | null> {
  const file = path.join(/* turbopackIgnore: true */ CACHE_DIR, "grid", `${entry.id}.webp`);
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

async function decode(bytes: Buffer): Promise<RgbImage> {
  const { data, info } = await sharp(bytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    width: info.width,
    height: info.height,
  };
}

// Compiled index file:
//   "CCSI" | uint32 header length | JSON header | Int8 feature data
// The header lists templates as
//   [itemId, shortName, rotated, slotsWide, slotsHigh, textWidth,
//    coarseScale, coarseLength, fineScale, fineLength, textScale, textLength]
const MAGIC = "CCSI";

type HeaderTemplate = [
  string, string, 0 | 1, number, number, number,
  number, number, number, number, number, number,
];

interface IndexHeader {
  featureVersion: number;
  catalogHash: string;
  builtAt: string;
  items: number;
  templates: HeaderTemplate[];
}

function indexFile(): string {
  return path.join(/* turbopackIgnore: true */ CACHE_DIR, `index-v${FEATURE_VERSION}.bin`);
}

async function saveIndex(index: IconIndex, header: Omit<IndexHeader, "templates">) {
  const templates: HeaderTemplate[] = [];
  const chunks: Buffer[] = [];
  const push = (vector: QuantisedVector) => {
    chunks.push(Buffer.from(vector.values.buffer, vector.values.byteOffset, vector.values.length));
  };
  for (const [key, list] of index.bySize) {
    const [slotsWide, slotsHigh] = key.split("x").map(Number);
    for (const t of list) {
      const f = t.features;
      templates.push([
        t.itemId, t.shortName, t.rotated ? 1 : 0, slotsWide, slotsHigh, f.textWidth,
        f.artCoarse.scale, f.artCoarse.values.length,
        f.artFine.scale, f.artFine.values.length,
        f.text.scale, f.text.values.length,
      ]);
      push(f.artCoarse);
      push(f.artFine);
      push(f.text);
    }
  }
  const json = Buffer.from(JSON.stringify({ ...header, templates } satisfies IndexHeader));
  const prefix = Buffer.alloc(8);
  prefix.write(MAGIC, 0, "ascii");
  prefix.writeUInt32LE(json.length, 4);
  const file = indexFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, Buffer.concat([prefix, json, ...chunks]));
  await rename(temporary, file);
}

async function loadIndex(): Promise<{ index: IconIndex; header: IndexHeader } | null> {
  let bytes: Buffer;
  try {
    bytes = await readFile(indexFile());
  } catch {
    return null;
  }
  if (bytes.toString("ascii", 0, 4) !== MAGIC) return null;
  const headerLength = bytes.readUInt32LE(4);
  const header = JSON.parse(bytes.toString("utf8", 8, 8 + headerLength)) as IndexHeader;
  if (header.featureVersion !== FEATURE_VERSION) return null;

  const index = createIconIndex();
  let offset = 8 + headerLength;
  const take = (scale: number, length: number): QuantisedVector => {
    const values = new Int8Array(bytes.buffer, bytes.byteOffset + offset, length);
    offset += length;
    return { values, scale };
  };
  for (const [
    itemId, shortName, rotated, slotsWide, slotsHigh, textWidth,
    coarseScale, coarseLength, fineScale, fineLength, textScale, textLength,
  ] of header.templates) {
    addTemplate(index, slotsWide, slotsHigh, {
      itemId,
      shortName,
      rotated: rotated === 1,
      features: {
        artCoarse: take(coarseScale, coarseLength),
        artFine: take(fineScale, fineLength),
        textWidth,
        text: take(textScale, textLength),
      },
    });
  }
  return { index, header };
}

async function build(): Promise<IconIndex> {
  await mkdir(path.join(/* turbopackIgnore: true */ CACHE_DIR, "grid"), { recursive: true });
  const started = Date.now();

  // Serve the persisted index right away, even if Tarkov.dev is unreachable.
  if (state.current === null) {
    const saved = await loadIndex();
    if (saved) {
      state.current = {
        index: saved.index,
        items: saved.header.items,
        builtAt: new Date(saved.header.builtAt),
        catalogHash: saved.header.catalogHash,
      };
      log(`loaded ${saved.index.size} templates from cache`);
    }
  }

  let catalog: CatalogEntry[];
  try {
    catalog = await fetchCatalog();
  } catch (error) {
    if (state.current) {
      log(`catalog check failed, keeping the cached index: ${String(error)}`);
      return state.current.index;
    }
    throw error;
  }
  const hash = catalogHash(catalog);
  if (state.current?.catalogHash === hash) return state.current.index;
  if (state.current) log("catalog changed; rebuilding the index in the background");

  const index = createIconIndex();
  let items = 0;
  let next = 0;
  // Downloads and decodes run concurrently; feature extraction is synchronous
  // CPU work, so hand the event loop back after every item.
  await Promise.all(
    Array.from({ length: DOWNLOAD_CONCURRENCY }, async () => {
      while (next < catalog.length) {
        const entry = catalog[next++];
        const bytes = await cachedGridImage(entry);
        if (!bytes) continue;
        try {
          const grid = await decode(bytes);
          if (addCatalogIcon(index, { ...entry, grid })) items++;
        } catch (error) {
          log(`could not index ${entry.id}: ${String(error)}`);
        }
        await yieldToEventLoop();
      }
    }),
  );

  const builtAt = new Date();
  await saveIndex(index, {
    featureVersion: FEATURE_VERSION,
    catalogHash: hash,
    builtAt: builtAt.toISOString(),
    items,
  });
  state.current = { index, items, builtAt, catalogHash: hash };
  log(`built ${index.size} templates for ${items} items in ${Date.now() - started}ms`);
  return index;
}

function startBuild(): Promise<IconIndex> {
  if (!state.building) {
    state.building = build()
      .then((index) => {
        state.lastError = null;
        return index;
      })
      .catch((error) => {
        state.lastError = error instanceof Error ? error.message : String(error);
        log(`index build failed: ${state.lastError}`);
        throw error;
      })
      .finally(() => {
        state.building = null;
      });
  }
  return state.building;
}

function scheduleRefresh() {
  if (state.refreshTimer) return;
  state.refreshTimer = setInterval(() => {
    startBuild().catch(() => undefined);
  }, REFRESH_INTERVAL_MS);
  state.refreshTimer.unref?.();
}

/** Starts loading or building the index without waiting for it. */
export function warmIconIndex(): void {
  scheduleRefresh();
  if (!state.current) startBuild().catch(() => undefined);
}

/**
 * Resolves with the current index, waiting up to `timeoutMs` for the first
 * one to load or build. Resolves with null when none is ready in time.
 */
export async function getIconIndex(timeoutMs: number): Promise<IconIndex | null> {
  scheduleRefresh();
  if (state.current) return state.current.index;
  startBuild().catch(() => undefined);
  // A persisted index becomes available long before a rebuild finishes.
  // (Read through a function: the state changes while this awaits.)
  const loaded = () => state.current;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const ready = loaded();
    if (ready) return ready.index;
    if (!state.building && state.lastError) return null;
  }
  return null;
}

export function getIndexStatus(): IndexStatus {
  return {
    ready: state.current !== null,
    building: state.building !== null,
    templates: state.current?.index.size ?? 0,
    items: state.current?.items ?? 0,
    builtAt: state.current?.builtAt.toISOString() ?? null,
    lastError: state.lastError,
  };
}
