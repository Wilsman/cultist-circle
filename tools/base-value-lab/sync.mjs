#!/usr/bin/env bun
/**
 * Moves Base Value Lab data between your local lab exports and the shared D1
 * tables behind the hidden /base-value-lab page.
 *
 * Usage:
 *   bun run lab:push -- <export.json> --local     # seed local D1 (bun run dev)
 *   bun run lab:push -- <export.json> --remote    # publish to the live page
 *   bun run lab:pull -- [out.json] [--local]      # everything, as a lab export
 *
 * Push upserts subjects and your own tests. Tests people sent from the page
 * are never overwritten. Pull writes a file the local lab's Import accepts.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseState } from "../../lib/base-value-lab";
import { hasFlag, queryD1 } from "../lib/local-d1.mjs";

const DATABASE = "cultist-circle-feedback";
const CONFIG = "cloudflare/feedback/wrangler.jsonc";
const [command, ...rest] = process.argv.slice(2);
const files = rest.filter((a) => !a.startsWith("--"));
const useLocal = hasFlag("--local");

if (!useLocal && !hasFlag("--remote") && command === "push") {
  console.error("Pass --local or --remote.");
  process.exit(1);
}

const sql = (v) =>
  v === null || v === undefined
    ? "NULL"
    : `'${String(v).replaceAll("'", "''")}'`;

function push(file) {
  const state = parseState(JSON.parse(readFileSync(file, "utf8")));
  const now = new Date().toISOString();
  const lines = [];
  for (const s of state.subjects) {
    lines.push(
      `INSERT INTO base_value_subjects (id, mode, data_json, created_at)
       VALUES (${sql(s.id)}, ${sql(s.mode)}, ${sql(JSON.stringify(s))}, ${sql(now)})
       ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, data_json = excluded.data_json;`,
    );
  }
  for (const t of state.tests) {
    lines.push(
      `INSERT INTO base_value_tests (id, mode, data_json, source, created_at)
       VALUES (${sql(t.id)}, ${sql(t.mode)}, ${sql(JSON.stringify(t))}, 'owner', ${sql(t.createdAt)})
       ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, data_json = excluded.data_json
       WHERE base_value_tests.source = 'owner';`,
    );
  }
  const dir = mkdtempSync(join(tmpdir(), "bvl-"));
  const sqlFile = join(dir, "push.sql");
  writeFileSync(sqlFile, lines.join("\n"));
  const result = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      DATABASE,
      "--config",
      CONFIG,
      useLocal ? "--local" : "--remote",
      "--file",
      sqlFile,
      "--yes",
    ],
    { stdio: "inherit" },
  );
  rmSync(dir, { recursive: true, force: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(
    `Pushed ${state.subjects.length} subjects and ${state.tests.length} tests (${useLocal ? "local" : "remote"}).`,
  );
}

function pull(out) {
  const parse = (rows) =>
    rows.map((r) => ({ ...JSON.parse(r.data_json), _r: r }));
  const subjects = queryD1(
    "SELECT data_json FROM base_value_subjects WHERE hidden = 0",
    {
      useLocal,
    },
  ).map((r) => JSON.parse(r.data_json));
  const tests = parse(
    queryD1(
      "SELECT data_json, source, contributor FROM base_value_tests WHERE hidden = 0 ORDER BY created_at",
      { useLocal },
    ),
  ).map(({ _r, ...t }) => {
    if (_r.source !== "contributor") return t;
    const by = `From ${_r.contributor || "a contributor"} via the site`;
    return { ...t, notes: t.notes ? `${by}. ${t.notes}` : by };
  });
  const state = parseState({ version: 1, subjects, tests });
  writeFileSync(out, JSON.stringify(state, null, 2) + "\n");
  console.log(
    `Wrote ${subjects.length} subjects and ${tests.length} tests to ${out}.`,
  );
}

if (command === "push" && files[0]) push(files[0]);
else if (command === "pull") pull(files[0] ?? "base-value-lab-shared.json");
else {
  console.error(
    "Usage: sync.mjs push <export.json> --local|--remote | pull [out.json] [--local]",
  );
  process.exit(1);
}
