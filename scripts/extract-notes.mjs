#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

function getVersionBumps() {
  // Prefer tag-based grouping first (vX.Y.Z)
  try {
    const tagLines = sh(
      'git for-each-ref --sort=creatordate --format="%(refname:short)|%(creatordate:short)" refs/tags'
    )
      .split("\n")
      .filter(Boolean)
      .filter((l) => /^v\d+\.\d+(?:\.\d+)?\|/.test(l));

    if (tagLines.length > 0) {
      const tags = tagLines.map((l) => {
        const [name, date] = l.split("|");
        const version = name.replace(/^v/, "");
        const hash = sh(`git rev-list -n 1 ${name}`);
        return { name, version, date, hash };
      });
      return tags; // Already chronological (oldest -> newest)
    }
  } catch {}

  // Fallback to file-based heuristics if no tags are present
  const bumps = [];
  try {
    const clCommits = sh(
      'git log --reverse --pretty=format:"%H|%ad" --date=short -- config/changelog.ts'
    )
      .split("\n")
      .filter(Boolean);
    for (const line of clCommits) {
      const [hash, date] = line.split("|");
      const patch = sh(`git show ${hash} -- config/changelog.ts`);
      const match = patch.match(
        /^[+]\s*version:\s*"([0-9]+\.[0-9]+(?:\.[0-9]+)?)"/m
      );
      if (match) bumps.push({ hash, date, version: match[1] });
    }
  } catch {}
  try {
    const cvCommits = sh(
      'git log --reverse --pretty=format:"%H|%ad" --date=short -S CURRENT_VERSION -- components/app.tsx config/changelog.ts'
    )
      .split("\n")
      .filter(Boolean);
    for (const line of cvCommits) {
      const [hash, date] = line.split("|");
      const patch = sh(
        `git show ${hash} -- components/app.tsx config/changelog.ts`
      );
      const m = patch.match(
        /^[+].*CURRENT_VERSION.*?"([0-9]+\.[0-9]+(?:\.[0-9]+)?)"/m
      );
      if (m) bumps.push({ hash, date, version: m[1] });
    }
  } catch {}

  // Deduplicate by version while preserving order
  const seen = new Set();
  const out = [];
  for (const b of bumps) {
    if (!seen.has(b.version)) {
      seen.add(b.version);
      out.push(b);
    }
  }
  return out;
}

function collectHighlights(fromHashExclusive, toHashInclusive) {
  const range = fromHashExclusive
    ? `${fromHashExclusive}..${toHashInclusive}`
    : toHashInclusive;
  const lines = sh(`git log --no-merges --pretty=format:"%s" ${range}`)
    .split("\n")
    .filter(Boolean);
  const notable = lines
    .map((s) => s.trim())
    .filter((s) => /^(feat|fix|perf)[:(]/i.test(s))
    .map((s) => {
      const mm = s.match(/^(feat|fix|perf)(?:\(([^)]+)\))?:\s*(.*)$/i);
      if (!mm) return s;
      const [, type, scope, rest] = mm;
      const t = type.toLowerCase();
      const head = t === "feat" ? "New" : t === "fix" ? "Fix" : "Perf";
      return scope ? `${head}(${scope}): ${rest}` : `${head}: ${rest}`;
    });
  const seen = new Set();
  const out = [];
  for (const n of notable) {
    const key = n.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(n);
    }
  }
  return out;
}

function buildEntries() {
  const bumps = getVersionBumps();
  if (bumps.length === 0) return [];
  const entries = [];
  for (let i = 0; i < bumps.length; i++) {
    const curr = bumps[i];
    const prev = i > 0 ? bumps[i - 1] : null;
    const highlights = collectHighlights(prev ? prev.hash : null, curr.hash);
    entries.push({ version: curr.version, date: curr.date, highlights });
  }
  // Return newest first (descending), to match existing CHANGELOG ordering
  return entries.reverse();
}

function readExistingVersions(filePath) {
  try {
    const txt = readFileSync(filePath, "utf8");
    const versions = new Set();
    for (const m of txt.matchAll(
      /version:\s*"([0-9]+\.[0-9]+(?:\.[0-9]+)?)"/g
    )) {
      versions.add(m[1]);
    }
    return versions;
  } catch {
    return new Set();
  }
}

function appendEntries(filePath, entries) {
  const original = readFileSync(filePath, "utf8");
  const insertPos = original.lastIndexOf("];");
  if (insertPos === -1)
    throw new Error("Could not find CHANGELOG array terminator in changelog.ts");
  const existing = readExistingVersions(filePath);
  const toAdd = entries.filter((e) => !existing.has(e.version));
  if (toAdd.length === 0) {
    console.log("No new versions to append.");
    return;
  }
  const snippets = toAdd
    .map((e) => {
      const items = e.highlights
        .map((h) => `      "${h.replace(/"/g, '\\"')}"`)
        .join(",\n");
      return `  ,{\n    version: "${e.version}",\n    date: "${e.date}",\n    highlights: [\n${items}\n    ]\n  }`;
    })
    .join("\n");
  const updated =
    original.slice(0, insertPos) + snippets + "\n" + original.slice(insertPos);
  writeFileSync(filePath, updated, "utf8");
}

function main() {
  const entries = buildEntries();
  if (process.argv.includes("--print")) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }
  const changelogPath = join(process.cwd(), "config", "changelog.ts");
  if (process.argv.includes("--write")) {
    appendEntries(changelogPath, entries);
    console.log("Changelog updated.");
  } else {
    console.log("Preview (pass --write to update config/changelog.ts):\n");
    console.log(JSON.stringify(entries, null, 2));
  }
}

main();
