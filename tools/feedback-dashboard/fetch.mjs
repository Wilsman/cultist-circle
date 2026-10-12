#!/usr/bin/env bun
/**
 * Feedback dashboard fetcher.
 *
 * Uses YOUR wrangler login (Cloudflare auth) to read the feedback inbox and
 * the aggregated recipe vote stats from D1 into data.json, and refreshes the
 * pending recipe submissions for the Submissions tab. Nothing is written to
 * D1. Raw per-client votes (recipe_feedback.client_hash) are never fetched.
 *
 * Usage:
 *   bun run feedback:dashboard                    # fetch, then serve
 *   bun run feedback:dashboard:fetch              # fetch only
 *   bun run feedback:dashboard -- --local         # local D1 state instead of remote
 *   bun run feedback:dashboard -- --limit 500     # newest 500 feedback rows
 *   bun run feedback:dashboard -- --port 3220
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tarkovRecipes } from "../../data/recipes.ts";
import { argValue, hasFlag, queryD1, serveStatic } from "../lib/local-d1.mjs";

const DIR = dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = join(DIR, "..", "recipe-review");
const OUTFILE = join(DIR, "data.json");

const limitRaw = argValue("--limit") ?? "5000";
const limit = Number.parseInt(limitRaw, 10);
if (!Number.isInteger(limit) || limit < 1 || limit > 50000) {
  console.error(`Invalid --limit "${limitRaw}". Use 1-50000.`);
  process.exit(1);
}

const useLocal = hasFlag("--local");

const feedback = queryD1(
  `SELECT id, feedback_type, title, description, app_version, created_at,
          supabase_id IS NOT NULL AS legacy
   FROM feedback
   ORDER BY created_at DESC, id DESC
   LIMIT ${limit}`,
  { useLocal },
);
console.log(`Fetched ${feedback.length} feedback row(s).`);

const [totals] = queryD1("SELECT COUNT(*) AS total FROM feedback", {
  useLocal,
});

const recipeStats = queryD1("SELECT * FROM recipe_feedback_stats", {
  useLocal,
});
console.log(`Fetched vote stats for ${recipeStats.length} recipe(s).`);

function flattenProduced(produced) {
  return produced.flatMap((entry) =>
    typeof entry === "string"
      ? [entry]
      : entry.items.map((item) => `${item} (possible)`),
  );
}

const recipes = Object.fromEntries(
  tarkovRecipes.map((recipe) => [
    recipe.id,
    {
      requiredItems: recipe.requiredItems,
      producedItems: flattenProduced(recipe.producedItems),
      craftingTime: recipe.craftingTime,
      modeRestriction: recipe.modeRestriction ?? null,
    },
  ]),
);

writeFileSync(
  OUTFILE,
  JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      source: useLocal ? "local" : "remote",
      feedbackTotal: totals?.total ?? feedback.length,
      feedback,
      recipeStats,
      recipes,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Wrote ${OUTFILE}`);

// Refresh tools/recipe-review/submissions.json for the Submissions tab.
const review = spawnSync(
  process.execPath,
  [join(REVIEW_DIR, "fetch-pending.mjs"), ...(useLocal ? ["--local"] : [])],
  { stdio: "inherit" },
);
if (review.status !== 0) {
  console.error(
    "Could not refresh pending recipe submissions; the Submissions tab may be stale.",
  );
}

if (hasFlag("--serve")) {
  await serveStatic(
    { "": DIR, "recipe-review": REVIEW_DIR },
    { label: "Feedback dashboard" },
  );
}
