// Builds the Stash Scan icon index and pre-scans the /scan/demo screenshot.
//
//   bun scripts/build-stash-scan-index.ts
//
// Writes .stash-scan/index-v<N>.bin, which next.config.mjs bundles with the
// scan route, and public/scan-demo/demo.json. Grid images and the last good
// index are kept in .next/cache/stash-scan/, which Vercel preserves between
// builds (override with STASH_SCAN_BUILD_CACHE_DIR).
//
// Never fails the build: without Tarkov.dev and without a cached index it
// warns and leaves Stash Scan unavailable for this deployment.

import { scanTrialEnabled } from "../lib/stash-scan/enabled";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildIndex,
  catalogHash,
  decodeRgb,
  fetchCatalog,
} from "../lib/stash-scan/index-builder";
import { decodeIndex, encodeIndex, indexFileName } from "../lib/stash-scan/index-file";
import type { IconIndex } from "../lib/stash-scan/matcher";
import { scanImage } from "../lib/stash-scan/scan";
import type { DemoScanResponse } from "../lib/stash-scan/types";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, ".stash-scan");
const cacheDir = path.resolve(
  root,
  process.env.STASH_SCAN_BUILD_CACHE_DIR ?? path.join(".next", "cache", "stash-scan"),
);
const demoDir = path.join(root, "public", "scan-demo");
const demoJson = path.join(demoDir, "demo.json");

const log = (message: string) => console.log(`[stash-scan] ${message}`);

async function readCachedIndexFile() {
  try {
    return decodeIndex(await readFile(path.join(cacheDir, indexFileName())));
  } catch {
    return null;
  }
}

async function buildOrReuseIndex(): Promise<IconIndex | null> {
  const started = Date.now();
  await mkdir(outputDir, { recursive: true });
  const output = path.join(outputDir, indexFileName());
  const cached = path.join(cacheDir, indexFileName());

  let catalog;
  try {
    catalog = await fetchCatalog();
  } catch (error) {
    const index = (await readCachedIndexFile())?.index;
    if (!index) {
      log(`WARNING: Tarkov.dev catalog unavailable and no cached index (${String(error)}); Stash Scan will be unavailable in this build`);
      await rm(output, { force: true });
      return null;
    }
    log(`Tarkov.dev catalog unavailable (${String(error)}); reusing the cached index`);
    await copyFile(cached, output);
    return index;
  }

  const previous = await readCachedIndexFile();
  if (previous?.metadata.complete === true && previous.metadata.catalogHash === catalogHash(catalog)) {
    await copyFile(cached, output);
    log(`catalog unchanged; reused the cached index (${previous.index.size} templates)`);
    return previous.index;
  }

  const built = await buildIndex(catalog, path.join(cacheDir, "grid"), log);
  if (!built.metadata.complete && previous?.metadata.complete === true) {
    await copyFile(cached, output);
    log("icon index build incomplete; reusing the last complete index");
    return previous.index;
  }
  const bytes = encodeIndex(built.index, built.metadata);
  await writeFile(output, bytes);
  if (!built.metadata.complete) {
    log("WARNING: icon index build incomplete; the partial index will not be cached");
    return built.index;
  }
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cached, bytes);
  log(
    `built ${built.index.size} templates for ${built.metadata.items} items ` +
      `(${(bytes.length / 1024 / 1024).toFixed(1)} MB) in ${Date.now() - started}ms`,
  );
  return built.index;
}

async function scanDemo(index: IconIndex | null): Promise<void> {
  let names: string[] = [];
  try {
    names = await readdir(demoDir);
  } catch {
    // No demo directory.
  }
  const file = names
    .sort()
    .find((name) => /^demo\.(png|jpe?g|webp)$/i.test(name));
  if (!file || !index) {
    await rm(demoJson, { force: true });
    if (file) log("skipping the demo scan: no index");
    return;
  }

  const bytes = await readFile(path.join(demoDir, file));
  const version = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const result = await scanImage(await decodeRgb(bytes), index);
  const body: DemoScanResponse = {
    available: true,
    imageUrl: `/scan-demo/${file}?v=${version}`,
    images: [result],
  };
  await writeFile(demoJson, JSON.stringify(body));
  log(`scanned ${file}: ${result.cells.filter((c) => !c.empty).length} items`);
}

try {
  if (scanTrialEnabled()) {
    await scanDemo(await buildOrReuseIndex());
  } else {
    // A previous beta build may have left generated assets in the cache.
    await rm(path.join(outputDir, indexFileName()), { force: true });
    await rm(demoJson, { force: true });
    log("disabled; skipped index generation and demo scan");
  }
} catch (error) {
  log(`WARNING: stash scan index step failed: ${error instanceof Error ? error.stack : String(error)}`);
}
