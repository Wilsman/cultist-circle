// Runtime icon index.
//
// Every deployment loads the index built at build time
// (scripts/build-stash-scan-index.ts, written to .stash-scan/). Vercel stops
// there: its functions cannot write to the project directory and have no
// long-lived timers, so new items arrive with the next deploy. A long-running
// self-hosted server additionally checks the catalog daily and rebuilds into
// .cache/stash-scan/, preferring whichever index is newer.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildIndex, catalogHash, fetchCatalog } from "./index-builder";
import { decodeIndex, encodeIndex, indexFileName, type IndexMetadata } from "./index-file";
import type { IconIndex } from "./matcher";

// Runtime data: keep the bundler's file tracing out of these paths. The
// bundled index is added to the scan route by next.config.mjs instead.
const BUNDLED_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), ".stash-scan");
const CACHE_DIR =
  process.env.STASH_SCAN_CACHE_DIR ??
  path.join(/* turbopackIgnore: true */ process.cwd(), ".cache", "stash-scan");

/** How often a self-hosted server checks the catalog for new or changed items. */
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Vercel and other serverless hosts: serve the bundled index only. */
const READ_ONLY = process.env.VERCEL === "1" || process.env.STASH_SCAN_READ_ONLY === "1";

export interface IndexStatus {
  ready: boolean;
  building: boolean;
  templates: number;
  items: number;
  builtAt: string | null;
  lastError: string | null;
}

interface StoreState {
  current: { index: IconIndex; metadata: IndexMetadata } | null;
  loading: Promise<void> | null;
  building: Promise<void> | null;
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
  loading: null,
  building: null,
  lastError: null,
  refreshTimer: null,
});

const log = (message: string) => console.log(`[stash-scan] ${message}`);

// A function, not `state.current` inline: TypeScript keeps a property's
// narrowing across awaits, but the state changes while callers wait.
const currentIndex = (): IconIndex | null => state.current?.index ?? null;

async function readIndex(dir: string) {
  try {
    return decodeIndex(await readFile(path.join(/* turbopackIgnore: true */ dir, indexFileName())));
  } catch {
    return null;
  }
}

/** Loads the newest index available on disk, once. */
function load(): Promise<void> {
  state.loading ??= (async () => {
    const candidates = READ_ONLY
      ? [await readIndex(BUNDLED_DIR)]
      : await Promise.all([readIndex(BUNDLED_DIR), readIndex(CACHE_DIR)]);
    const newest = candidates
      .filter((c) => c !== null)
      .sort((a, b) => b.metadata.builtAt.localeCompare(a.metadata.builtAt))[0];
    if (newest && !state.current) {
      state.current = newest;
      log(`loaded ${newest.index.size} templates built ${newest.metadata.builtAt}`);
    } else if (!newest) {
      state.lastError = READ_ONLY
        ? "No stash scan index was bundled with this deployment."
        : "No stash scan index on disk yet.";
    }
  })();
  return state.loading;
}

async function rebuild(): Promise<void> {
  await load();
  const catalog = await fetchCatalog();
  const hash = catalogHash(catalog);
  if (state.current?.metadata.catalogHash === hash && state.current.metadata.complete === true) return;
  log(state.current ? "catalog changed; rebuilding the index" : "building the index");

  const started = Date.now();
  const built = await buildIndex(
    catalog,
    path.join(/* turbopackIgnore: true */ CACHE_DIR, "grid"),
    log,
  );
  if (!built.metadata.complete) {
    state.lastError = "The icon index build was incomplete; keeping the previous index.";
    log(state.lastError);
    return;
  }
  await mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(/* turbopackIgnore: true */ CACHE_DIR, indexFileName());
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, encodeIndex(built.index, built.metadata));
  await rename(temporary, file);
  state.current = built;
  state.lastError = null;
  log(`built ${built.index.size} templates for ${built.metadata.items} items in ${Date.now() - started}ms`);
}

function startRebuild(): void {
  if (READ_ONLY || state.building) return;
  state.building = rebuild()
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      // A failed refresh keeps serving the index already loaded.
      if (!state.current) state.lastError = message;
      log(`index refresh failed: ${message}`);
    })
    .finally(() => {
      state.building = null;
    });
}

function scheduleRefresh() {
  if (READ_ONLY || state.refreshTimer) return;
  state.refreshTimer = setInterval(startRebuild, REFRESH_INTERVAL_MS);
  state.refreshTimer.unref?.();
}

/** Self-hosted servers: load the index and check the catalog in the background. */
export function warmIconIndex(): void {
  scheduleRefresh();
  load().then(startRebuild, () => undefined);
}

/**
 * Resolves with the current index. When none is on disk, a self-hosted server
 * builds one and this waits up to `timeoutMs`; resolves with null otherwise.
 */
export async function getIconIndex(timeoutMs: number): Promise<IconIndex | null> {
  if (currentIndex()) return currentIndex();
  await load();
  if (currentIndex() || READ_ONLY) return currentIndex();

  scheduleRefresh();
  startRebuild();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && state.building) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return currentIndex();
}

/** True when this deployment has no index and will never build one. */
export function isIndexUnavailable(): boolean {
  return READ_ONLY && state.current === null;
}

export function getIndexStatus(): IndexStatus {
  return {
    ready: state.current !== null,
    building: state.building !== null,
    templates: state.current?.index.size ?? 0,
    items: state.current?.metadata.items ?? 0,
    builtAt: state.current?.metadata.builtAt ?? null,
    lastError: state.lastError,
  };
}
