/**
 * Shared helpers for the local-only review tools in tools/.
 *
 * queryD1 runs a read query through YOUR wrangler login (no extra Cloudflare
 * auth), and serveStatic serves the tool pages on 127.0.0.1 only.
 */

import { spawnSync } from "node:child_process";
import { join, normalize } from "node:path";

const DATABASE = "cultist-circle-feedback";
const CONFIG = "cloudflare/feedback/wrangler.jsonc";

export function argValue(name) {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

export function hasFlag(name) {
  return process.argv.includes(name);
}

function runWrangler(query, useLocal) {
  return spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      DATABASE,
      "--config",
      CONFIG,
      useLocal ? "--local" : "--remote",
      "--json",
      "--command",
      query,
    ],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
}

/**
 * Returns the result rows of one SQL statement, or exits with the wrangler
 * error. Remote queries are retried once because the D1 API occasionally
 * answers a valid login with a transient 7403.
 */
export function queryD1(query, { useLocal = false } = {}) {
  let result = runWrangler(query, useLocal);
  if (
    !useLocal &&
    result.status !== 0 &&
    /\b7403\b/.test(result.stdout + result.stderr)
  ) {
    result = runWrangler(query, useLocal);
  }

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
  return rows;
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function safeRelative(path) {
  const rel = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "");
  if (
    rel.includes("..") ||
    rel.startsWith("/") ||
    rel.startsWith("\\") ||
    rel !== rel.trim()
  ) {
    return null;
  }
  return rel;
}

/**
 * Serves files from `mounts` ({ "": rootDir, "prefix": otherDir }) on
 * 127.0.0.1, trying up to nine ports after the requested one. Never returns.
 */
export async function serveStatic(mounts, { label = "Page" } = {}) {
  const portRaw = argValue("--port") ?? "3210";
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid --port "${portRaw}".`);
    process.exit(1);
  }

  const prefixes = Object.keys(mounts)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const fetchHandler = (req) => {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname.slice(1));
    let dir = mounts[""];
    for (const prefix of prefixes) {
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        dir = mounts[prefix];
        path = path.slice(prefix.length + 1);
        break;
      }
    }
    const rel = safeRelative(
      path === "" || path.endsWith("/") ? `${path}index.html` : path,
    );
    if (!rel || !dir) return new Response("Not found", { status: 404 });

    const file = Bun.file(join(dir, rel));
    return file.exists().then((ok) => {
      if (!ok) return new Response("Not found", { status: 404 });
      const ext = rel.slice(rel.lastIndexOf("."));
      return new Response(file, {
        headers: {
          "Content-Type": TYPES[ext] ?? "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    });
  };

  let server;
  for (let candidate = port; candidate < port + 10; candidate++) {
    try {
      server = Bun.serve({
        hostname: "127.0.0.1",
        port: candidate,
        fetch: fetchHandler,
      });
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
  if (server.port !== port)
    console.log(`Port ${port} is in use, using ${server.port} instead.`);
  console.log(`${label}: http://127.0.0.1:${server.port}/`);
  console.log("Press Ctrl+C to stop.");
  await new Promise(() => {});
}
