#!/usr/bin/env bun
/**
 * Recipe review fetcher.
 *
 * Uses YOUR wrangler login (Cloudflare auth) to dump the pending recipe
 * submissions from D1 into submissions.json next to index.html, so the
 * standalone review page can display them. Nothing is written to D1.
 *
 * Usage:
 *   bun run review:fetch                  # remote D1, latest 100 pending
 *   bun run review:fetch -- --limit 20    # fewer rows
 *   bun run review:fetch -- --local       # local D1 state instead of remote
 *   bun run review --serve                # fetch, then serve the review page
 *   bun run review --serve -- --port 3210 --local
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const OUTFILE = join(DIR, "submissions.json");

function argValue(name) {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const limitRaw = argValue("--limit") ?? "100";
const limit = Number.parseInt(limitRaw, 10);
if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
  console.error(`Invalid --limit "${limitRaw}". Use 1-1000.`);
  process.exit(1);
}

const useLocal = hasFlag("--local");
const target = useLocal ? "--local" : "--remote";

const query = `SELECT id, game_mode, timer_seconds, sacrifices_json, rewards_json, status, created_at FROM recipe_submissions WHERE status = 'pending' ORDER BY created_at ASC LIMIT ${limit}`;

const result = spawnSync(
  "bunx",
  [
    "wrangler",
    "d1",
    "execute",
    "cultist-circle-feedback",
    "--config",
    "cloudflare/feedback/wrangler.jsonc",
    target,
    "--json",
    "--command",
    query,
  ],
  { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
);

if (result.error) {
  console.error(`Could not run wrangler: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error((result.stderr || result.stdout || "wrangler failed").trim());
  process.exit(result.status ?? 1);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout);
} catch {
  console.error("Wrangler did not return JSON. Raw output:");
  console.error(result.stdout.slice(0, 2000));
  process.exit(1);
}

const chunks = Array.isArray(parsed) ? parsed : [parsed];
const rows = [];
for (const chunk of chunks) {
  if (chunk && Array.isArray(chunk.results)) rows.push(...chunk.results);
}

writeFileSync(OUTFILE, JSON.stringify(rows, null, 2) + "\n");
console.log(`Wrote ${rows.length} pending submission(s) to ${OUTFILE}`);

if (hasFlag("--serve")) {
  const portRaw = argValue("--port") ?? "3210";
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid --port "${portRaw}".`);
    process.exit(1);
  }
  const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };
  const fetchHandler = (req) => {
    const url = new URL(req.url);
    let rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    rel = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
    if (rel.includes("..") || rel.startsWith("/") || rel.startsWith("\\") || rel !== rel.trim()) {
      return new Response("Not found", { status: 404 });
    }
    const file = Bun.file(join(DIR, rel));
    return file
      .exists()
      .then((ok) => {
        if (!ok) return new Response("Not found", { status: 404 });
        const ext = rel.slice(rel.lastIndexOf("."));
        return new Response(file, {
          headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream" },
        });
      });
  };
  let server;
  for (let candidate = port; candidate < port + 10; candidate++) {
    try {
      server = Bun.serve({ port: candidate, fetch: fetchHandler });
      break;
    } catch (err) {
      if (err && err.code === "EADDRINUSE") continue;
      throw err;
    }
  }
  if (!server) {
    console.error(`No free port in ${port}-${port + 9}.`);
    process.exit(1);
  }
  if (server.port !== port) console.log(`Port ${port} is in use, using ${server.port} instead.`);
  console.log(`Review page: http://127.0.0.1:${server.port}/`);
  console.log("Press Ctrl+C to stop.");
  await new Promise(() => {});
}
