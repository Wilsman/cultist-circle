#!/usr/bin/env bun
/**
 * Base Value Lab (local only).
 *
 * Builds the solver and rule checker (lib/base-value-*.ts) for the browser, caches the
 * PvP and PvE item lists from json.tarkov.dev next to index.html, then serves
 * the page on 127.0.0.1. Your tests live in the browser's localStorage; use
 * the page's Export button to share them.
 *
 * Usage:
 *   bun run lab                     # serve (item cache refreshes after 12h)
 *   bun run lab -- --refresh        # refetch items now
 *   bun run lab -- --port 3220
 */

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasFlag, serveStatic } from "../lib/local-d1.mjs";

const DIR = dirname(fileURLToPath(import.meta.url));
const JSON_API = "https://json.tarkov.dev";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MODES = { pvp: "regular", pve: "pve" };
// Bump when the cached item shape changes, so old caches refresh.
const CACHE_VERSION = 2;

function cacheVersion(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8")).version ?? 1;
  } catch {
    return 0;
  }
}

const built = await Bun.build({
  entrypoints: [join(DIR, "entry.ts")],
  target: "browser",
  format: "esm",
});
if (!built.success) {
  for (const log of built.logs) console.error(log);
  process.exit(1);
}
writeFileSync(join(DIR, "lab.js"), await built.outputs[0].text());

async function getJson(path) {
  const res = await fetch(`${JSON_API}/${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()).data;
}

// Cheapest offer per loyalty level: the overall cheapest may need a level the
// player doesn't have, so the page picks the best it can actually use.
function traderOffers(offers) {
  const best = new Map();
  for (const o of offers ?? []) {
    if (typeof o.priceRUB !== "number" || o.taskUnlock) continue;
    const level = o.minTraderLevel ?? 1;
    if (o.priceRUB < (best.get(level) ?? Infinity)) best.set(level, o.priceRUB);
  }
  return best.size
    ? [...best].map(([level, price]) => ({ level, price }))
    : null;
}

function slotsOf(it) {
  const slots = (it.properties?.slots ?? [])
    .map((s) => ({
      name: s.nameId ?? s.name ?? "slot",
      allowed: s.filters?.allowedItems ?? [],
    }))
    .filter((s) => s.allowed.length);
  return slots.length ? slots : undefined;
}

async function cacheMode(mode, english) {
  const file = join(DIR, `items-${mode}.json`);
  const data = await getJson(`${MODES[mode]}/items`);
  const name = (key) => english[key] ?? key;
  const items = Object.values(data.items).map((it) => ({
    id: it.id,
    name: name(it.name),
    shortName: name(it.shortName),
    basePrice: it.basePrice ?? 0,
    types: it.types ?? [],
    w: it.width,
    h: it.height,
    flea: it.lastLowPrice || it.avg24hPrice || null,
    trader: traderOffers(it.buyFromTrader),
    parts:
      it.types?.includes("preset") && Array.isArray(it.containsItems)
        ? it.containsItems.map((c) => ({ id: c.item, count: c.count }))
        : undefined,
    baseItem: it.properties?.baseItem,
    // Which parts fit where, so the build picker only offers parts that fit.
    slots: slotsOf(it),
  }));
  writeFileSync(
    file,
    JSON.stringify({
      version: CACHE_VERSION,
      fetchedAt: new Date().toISOString(),
      items,
    }),
  );
  console.log(`Cached ${items.length} ${mode.toUpperCase()} items.`);
}

const stale = Object.keys(MODES).filter((mode) => {
  if (hasFlag("--refresh")) return true;
  const file = join(DIR, `items-${mode}.json`);
  return (
    !existsSync(file) ||
    Date.now() - statSync(file).mtimeMs >= MAX_AGE_MS ||
    cacheVersion(file) !== CACHE_VERSION
  );
});

try {
  // The name dictionary is only needed when a cache actually refreshes.
  if (stale.length) {
    const english = await getJson("pve/items_en");
    for (const mode of stale) await cacheMode(mode, english);
  }
} catch (err) {
  const cached = Object.keys(MODES).every((m) =>
    existsSync(join(DIR, `items-${m}.json`)),
  );
  console.error(`Could not refresh items: ${err.message}`);
  if (!cached) process.exit(1);
  console.error("Using the cached item lists.");
}

await serveStatic({ "": DIR }, { label: "Base Value Lab" });
