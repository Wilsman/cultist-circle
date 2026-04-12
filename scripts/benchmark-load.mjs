import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://127.0.0.1:3100";
const ROUTES = (process.env.BENCHMARK_ROUTES ?? "/,/base-values")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const COLD_RUNS = Number(process.env.BENCHMARK_COLD_RUNS ?? "3");
const WARM_RUNS = Number(process.env.BENCHMARK_WARM_RUNS ?? "3");
const SETTLE_DELAY_MS = Number(process.env.BENCHMARK_SETTLE_DELAY_MS ?? "1500");
const OUTPUT_DIR = join(process.cwd(), "benchmark-results");

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function summarizeRuns(runs) {
  return {
    count: runs.length,
    avgResponseStartMs: average(runs.map((run) => run.browserTimings.responseStartMs)),
    medianResponseStartMs: median(
      runs.map((run) => run.browserTimings.responseStartMs)
    ),
    avgDomContentLoadedMs: average(
      runs.map((run) => run.browserTimings.domContentLoadedMs)
    ),
    medianDomContentLoadedMs: median(
      runs.map((run) => run.browserTimings.domContentLoadedMs)
    ),
    avgLoadEventMs: average(runs.map((run) => run.browserTimings.loadEventMs)),
    medianLoadEventMs: median(runs.map((run) => run.browserTimings.loadEventMs)),
    avgSettledMs: average(runs.map((run) => run.totalUntilSettledMs)),
    medianSettledMs: median(runs.map((run) => run.totalUntilSettledMs)),
    avgRelevantRequestCount: average(
      runs.map((run) => run.relevantRequests.length)
    ),
    avgRelevantRequestDurationMs: average(
      runs.map((run) =>
        run.relevantRequests.reduce(
          (sum, request) => sum + request.durationMs,
          0
        )
      )
    ),
  };
}

function isRelevantDataRequest(url) {
  return (
    url.includes("api.tarkov.dev/graphql") ||
    url.includes("json.tarkov.dev")
  );
}

async function measurePageLoad(page, route, mode, iteration) {
  const requestStartedAt = new Map();
  const relevantRequests = [];

  const onRequest = (request) => {
    if (isRelevantDataRequest(request.url())) {
      requestStartedAt.set(request.url(), Date.now());
    }
  };

  const onResponse = (response) => {
    const url = response.url();
    const startedAt = requestStartedAt.get(url);

    if (!startedAt || !isRelevantDataRequest(url)) {
      return;
    }

    relevantRequests.push({
      url,
      durationMs: Date.now() - startedAt,
      status: response.status(),
    });
  };

  page.on("request", onRequest);
  page.on("response", onResponse);

  const url = new URL(route, BASE_URL).toString();
  const startedAt = performance.now();
  const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(SETTLE_DELAY_MS);
  const endedAt = performance.now();

  const browserTimings = await page.evaluate(() => {
    const entry = performance.getEntriesByType("navigation")[0];

    if (!entry) {
      return {
        responseStartMs: 0,
        domContentLoadedMs: 0,
        loadEventMs: 0,
      };
    }

    return {
      responseStartMs: entry.responseStart,
      domContentLoadedMs: entry.domContentLoadedEventEnd,
      loadEventMs: entry.loadEventEnd,
    };
  });

  page.off("request", onRequest);
  page.off("response", onResponse);

  return {
    route,
    mode,
    iteration,
    url,
    status: response?.status() ?? 0,
    browserTimings,
    totalUntilSettledMs: endedAt - startedAt,
    relevantRequests,
  };
}

async function runColdRoute(route) {
  const browser = await chromium.launch({ headless: true });
  const runs = [];

  for (let iteration = 1; iteration <= COLD_RUNS; iteration += 1) {
    const context = await browser.newContext();
    const page = await context.newPage();
    runs.push(await measurePageLoad(page, route, "cold", iteration));
    await context.close();
  }

  await browser.close();
  return runs;
}

async function runWarmRoute(route) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const runs = [];

  for (let iteration = 1; iteration <= WARM_RUNS; iteration += 1) {
    runs.push(await measurePageLoad(page, route, "warm", iteration));
  }

  await context.close();
  await browser.close();
  return runs;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (const route of ROUTES) {
    console.error(`Benchmarking ${route}...`);
    const coldRuns = await runColdRoute(route);
    const warmRuns = await runWarmRoute(route);

    results.push({
      route,
      coldRuns,
      warmRuns,
      summary: {
        cold: summarizeRuns(coldRuns),
        warm: summarizeRuns(warmRuns),
      },
    });
  }

  const payload = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    coldRuns: COLD_RUNS,
    warmRuns: WARM_RUNS,
    settleDelayMs: SETTLE_DELAY_MS,
    results,
  };

  const fileName = `benchmark-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
  const outputPath = join(OUTPUT_DIR, fileName);
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(JSON.stringify({ outputPath, payload }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
