#!/usr/bin/env bun
/**
 * Moves Base Value Lab data between your local lab exports and the shared D1
 * tables behind the hidden /base-value-lab page.
 *
 * Usage:
 *   bun run lab:push -- <export.json> --local     # seed local D1 (bun run dev)
 *   bun run lab:push -- <export.json> --remote    # publish to the live page
 *   bun run lab:pull -- [out.json] [--local]      # everything, as a lab export
 *   bun run lab:suggest -- [out.json] [--local]   # single-part builds to add
 *
 * Push upserts subjects and your own tests. Tests people sent from the page
 * are never overwritten. Pull writes a file the local lab's Import accepts.
 * Suggest writes single-part builds (one valuable part plus the mounts it
 * needs on a bare frame) for the guns already in the lab; push that file to
 * publish them.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseState } from "../../lib/base-value-lab";
import { singlePartBuilds } from "../../lib/base-value-rule";
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

// The local lab's item cache (written by `bun run lab`).
const LAB_DIR = dirname(fileURLToPath(import.meta.url));
const itemCache = new Map();
function itemsFor(mode) {
  if (!itemCache.has(mode)) {
    const file = join(LAB_DIR, `items-${mode}.json`);
    const raw = existsSync(file)
      ? JSON.parse(readFileSync(file, "utf8"))
      : null;
    const list = raw ? (raw.items ?? raw) : [];
    itemCache.set(mode, new Map(list.map((it) => [it.id, it])));
  }
  return itemCache.get(mode);
}

/**
 * Adds the default preset's parts to stripped guns and Default presets so the
 * page can list exactly what to take off (or what should be on).
 */
function withParts(subject) {
  if (subject.build || !subject.itemId) return subject;
  if (subject.kind !== "weapon-bare" && subject.kind !== "weapon")
    return subject;
  const byId = itemsFor(subject.mode);
  const item = byId.get(subject.itemId);
  if (!item) return subject;
  let preset;
  if (subject.kind === "weapon-bare") {
    preset = [...byId.values()].find(
      (it) => it.baseItem === item.id && it.name === `${item.name} Default`,
    );
  } else if (item.types?.includes("preset") && / Default$/.test(item.name)) {
    preset = item;
  }
  const frame = preset ? byId.get(preset.baseItem ?? item.id) : undefined;
  if (subject.kind === "weapon" && frame?.basePrice !== undefined)
    subject = { ...subject, frameValue: frame.basePrice };
  const parts = (preset?.parts ?? [])
    .filter((p) => p.id !== (preset.baseItem ?? item.id))
    .map((p) => ({
      name: byId.get(p.id)?.name ?? "Unknown part",
      count: p.count,
    }));
  return parts.length && !subject.parts ? { ...subject, parts } : subject;
}

function push(file) {
  const state = parseState(JSON.parse(readFileSync(file, "utf8")));
  state.subjects = state.subjects.map(withParts);
  const missing = state.subjects.filter(
    (s) => s.kind === "weapon-bare" && !s.parts,
  );
  if (missing.length)
    console.warn(
      `No parts list for ${missing.map((s) => s.name).join(", ")}. Run \`bun run lab\` once to cache item data.`,
    );
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

/** The bare gun and its parts, for a Default preset or a saved build. */
function gunAndParts(subject) {
  const byId = itemsFor(subject.mode);
  const item = subject.itemId ? byId.get(subject.itemId) : undefined;
  if (!item?.slots && !item?.parts) return null;
  const expand = (list) =>
    list.flatMap(({ id, count }) =>
      byId.has(id) ? Array(count).fill(byId.get(id)) : [],
    );
  if (subject.build)
    return {
      gun: item,
      parts: expand(
        subject.build.mods.map((m) => ({ id: m.itemId, count: m.count })),
      ),
    };
  if (subject.kind === "weapon" && item.parts) {
    const gun = byId.get(item.baseItem);
    if (!gun) return null;
    return {
      gun,
      parts: expand(item.parts.filter((p) => p.id !== gun.id)),
    };
  }
  return null;
}

function suggest(out) {
  const existing = parseState({
    version: 1,
    subjects: queryD1(
      "SELECT data_json FROM base_value_subjects WHERE hidden = 0",
      { useLocal },
    ).map((r) => JSON.parse(r.data_json)),
    tests: [],
  }).subjects;
  const subjects = [];
  for (const s of existing) {
    const found = gunAndParts(s);
    if (!found) continue;
    subjects.push(
      ...singlePartBuilds({
        mode: s.mode,
        gun: found.gun,
        parts: found.parts,
        existing: [...existing, ...subjects],
      }),
    );
  }
  if (!subjects.length) {
    console.log(
      "No new single-part builds. Run `bun run lab` once if the item cache is missing.",
    );
    return;
  }
  writeFileSync(
    out,
    JSON.stringify(parseState({ version: 1, subjects, tests: [] }), null, 2) +
      "\n",
  );
  for (const s of subjects) console.log(`  ${s.mode}  ${s.name}`);
  console.log(
    `Wrote ${subjects.length} build${subjects.length === 1 ? "" : "s"} to ${out}. Publish with: bun run lab:push -- ${out} --local|--remote`,
  );
}

if (command === "push" && files[0]) push(files[0]);
else if (command === "pull") pull(files[0] ?? "base-value-lab-shared.json");
else if (command === "suggest")
  suggest(files[0] ?? "base-value-lab-suggested.json");
else {
  console.error(
    "Usage: sync.mjs push <export.json> --local|--remote | pull [out.json] [--local] | suggest [out.json] [--local]",
  );
  process.exit(1);
}
