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

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { argValue, hasFlag, queryD1, serveStatic } from "../lib/local-d1.mjs";

const DIR = dirname(fileURLToPath(import.meta.url));
const OUTFILE = join(DIR, "submissions.json");

const limitRaw = argValue("--limit") ?? "100";
const limit = Number.parseInt(limitRaw, 10);
if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
  console.error(`Invalid --limit "${limitRaw}". Use 1-1000.`);
  process.exit(1);
}

const query = `SELECT id, game_mode, timer_seconds, sacrifices_json, rewards_json, status, created_at FROM recipe_submissions WHERE status = 'pending' ORDER BY created_at ASC LIMIT ${limit}`;
const rows = queryD1(query, { useLocal: hasFlag("--local") });

writeFileSync(OUTFILE, JSON.stringify(rows, null, 2) + "\n");
console.log(`Wrote ${rows.length} pending submission(s) to ${OUTFILE}`);

if (hasFlag("--serve")) {
  await serveStatic({ "": DIR }, { label: "Review page" });
}
