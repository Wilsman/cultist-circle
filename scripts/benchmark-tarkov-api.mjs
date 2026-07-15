import https from "node:https";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { performance } from "node:perf_hooks";

const JSON_API_URL = "https://json.tarkov.dev";
const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";
const SUPPORTED_MODES = new Set(["regular", "pve"]);
const SUPPORTED_LANGUAGES = new Set([
  "cs",
  "de",
  "en",
  "es",
  "fr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "pl",
  "pt",
  "ro",
  "ru",
  "sk",
  "th",
  "tr",
  "vn",
  "zh",
]);

function readArg(name, fallback) {
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0) return process.argv[exactIndex + 1] ?? fallback;
  const prefix = `--${name}=`;
  return (
    process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ??
    fallback
  );
}

const rounds = Number(readArg("rounds", "30"));
const mode = readArg("mode", "regular");
const language = readArg("language", "en");

if (!Number.isInteger(rounds) || rounds < 1) {
  throw new Error("--rounds must be a positive integer");
}
if (!SUPPORTED_MODES.has(mode)) {
  throw new Error("--mode must be regular or pve");
}
if (!SUPPORTED_LANGUAGES.has(language)) {
  throw new Error(`Unsupported language: ${language}`);
}

function decompress(buffer, encoding) {
  if (encoding === "br") return brotliDecompressSync(buffer);
  if (encoding === "gzip") return gunzipSync(buffer);
  if (encoding === "deflate") return inflateSync(buffer);
  return buffer;
}

function requestJson(url, { method = "GET", body } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method,
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "br, gzip, deflate",
          ...(body
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
              }
            : {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          try {
            const compressed = Buffer.concat(chunks);
            const decoded = decompress(
              compressed,
              response.headers["content-encoding"],
            );
            const text = decoded.toString("utf8");
            if (
              (response.statusCode ?? 500) < 200 ||
              (response.statusCode ?? 500) >= 300
            ) {
              throw new Error(
                `${method} ${url} returned ${response.statusCode}: ${text.slice(0, 200)}`,
              );
            }
            resolve({
              data: JSON.parse(text),
              compressedBytes: compressed.length,
              decompressedBytes: decoded.length,
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("error", reject);
    request.setTimeout(30_000, () =>
      request.destroy(new Error(`Timed out: ${url}`)),
    );
    if (body) request.write(body);
    request.end();
  });
}

function graphqlQuery(lang) {
  const fields = `
    id name shortName basePrice lastLowPrice avg24hPrice updated width height
    lastOfferCount iconLink link categories { id name }
    buyFor { priceRUB vendor { normalizedName ... on TraderOffer { minTraderLevel buyLimit } } }
    sellFor { priceRUB vendor { normalizedName } }
  `;
  return `query {
    pvpItems: items(gameMode: regular, lang: ${lang}) { ${fields} }
    pveItems: items(gameMode: pve, lang: ${lang}) { ${fields} }
  }`;
}

async function graphqlRequest(lang) {
  const response = await requestJson(GRAPHQL_API_URL, {
    method: "POST",
    body: JSON.stringify({ query: graphqlQuery(lang) }),
  });
  const criticalErrors = (response.data.errors ?? []).filter(
    (error) => !error.message.includes("Missing translation for key"),
  );
  if (criticalErrors.length > 0 || !response.data.data) {
    throw new Error(
      criticalErrors.map((error) => error.message).join("; ") ||
        "GraphQL returned no data",
    );
  }
  return response;
}

async function runGraphqlFlow() {
  const start = performance.now();
  const english = await graphqlRequest("en");
  const localized =
    language === "en" ? english : await graphqlRequest(language);
  const responses = language === "en" ? [english] : [english, localized];
  const items =
    mode === "pve"
      ? localized.data.data.pveItems
      : localized.data.data.pvpItems;
  return {
    ms: performance.now() - start,
    compressedBytes: responses.reduce(
      (sum, response) => sum + response.compressedBytes,
      0,
    ),
    decompressedBytes: responses.reduce(
      (sum, response) => sum + response.decompressedBytes,
      0,
    ),
    items,
  };
}

function translate(key, primary, english) {
  return primary[key] ?? english[key] ?? key;
}

function mapJsonItems(base, primary, english, traders) {
  return Object.values(base.data.items).map((item) => ({
    id: item.id,
    name: translate(item.name, primary.data, english.data),
    shortName: translate(item.shortName, primary.data, english.data),
    basePrice: item.basePrice,
    lastLowPrice: item.lastLowPrice,
    avg24hPrice: item.avg24hPrice,
    updated: item.updated,
    width: item.width,
    height: item.height,
    lastOfferCount: item.lastOfferCount,
    iconLink: item.iconLink,
    link: item.link,
    categories: (item.categories ?? []).map((id) => {
      const category = base.data.itemCategories[id];
      return {
        id,
        name: translate(category?.name ?? id, primary.data, english.data),
      };
    }),
    buyFor: (item.buyFromTrader ?? []).map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: traders.data[offer.trader]?.normalizedName ?? offer.trader,
      minTraderLevel: offer.minTraderLevel,
      buyLimit: offer.buyLimit,
    })),
    sellFor: (item.sellToTrader ?? []).map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: traders.data[offer.trader]?.normalizedName ?? offer.trader,
    })),
  }));
}

async function runJsonFlow() {
  const start = performance.now();
  const basePath = `${mode}/items`;
  const requests = [
    requestJson(`${JSON_API_URL}/${basePath}`),
    requestJson(`${JSON_API_URL}/${basePath}_en`),
    requestJson(`${JSON_API_URL}/${mode}/traders`),
  ];
  if (language !== "en")
    requests.push(requestJson(`${JSON_API_URL}/${basePath}_${language}`));
  const responses = await Promise.all(requests);
  const [base, english, traders, localized] = responses;
  const primary = localized ?? english;
  const items = mapJsonItems(
    base.data,
    primary.data,
    english.data,
    traders.data,
  );
  return {
    ms: performance.now() - start,
    compressedBytes: responses.reduce(
      (sum, response) => sum + response.compressedBytes,
      0,
    ),
    decompressedBytes: responses.reduce(
      (sum, response) => sum + response.decompressedBytes,
      0,
    ),
    items,
  };
}

function normalizedOffers(offers) {
  return offers
    .map((offer) => JSON.stringify(offer))
    .sort()
    .join("|");
}

function countParityMismatches(graphqlItems, jsonItems) {
  const graphqlById = new Map(graphqlItems.map((item) => [item.id, item]));
  const scalarFields = [
    "name",
    "shortName",
    "basePrice",
    "lastLowPrice",
    "avg24hPrice",
    "updated",
    "width",
    "height",
    "lastOfferCount",
    "iconLink",
    "link",
  ];
  let mismatches = Math.abs(graphqlItems.length - jsonItems.length);
  for (const item of jsonItems) {
    const graphql = graphqlById.get(item.id);
    if (!graphql) {
      mismatches++;
      continue;
    }
    for (const field of scalarFields) {
      if ((item[field] ?? null) !== (graphql[field] ?? null)) mismatches++;
    }
    const jsonCategories = item.categories
      .map(({ id, name }) => `${id}:${name}`)
      .sort()
      .join("|");
    const graphqlCategories = graphql.categories
      .map(({ id, name }) => `${id}:${name}`)
      .sort()
      .join("|");
    if (jsonCategories !== graphqlCategories) mismatches++;

    const jsonBuy = normalizedOffers(item.buyFor);
    const graphqlBuy = normalizedOffers(
      graphql.buyFor
        .filter((offer) => offer.vendor.normalizedName !== "flea-market")
        .map((offer) => ({
          priceRUB: offer.priceRUB,
          vendor: offer.vendor.normalizedName,
          minTraderLevel: offer.vendor.minTraderLevel,
          buyLimit: offer.vendor.buyLimit,
        })),
    );
    if (jsonBuy !== graphqlBuy) mismatches++;

    const jsonSell = normalizedOffers(item.sellFor);
    const graphqlSell = normalizedOffers(
      graphql.sellFor
        .filter((offer) => offer.vendor.normalizedName !== "flea-market")
        .map((offer) => ({
          priceRUB: offer.priceRUB,
          vendor: offer.vendor.normalizedName,
        })),
    );
    if (jsonSell !== graphqlSell) mismatches++;
  }
  return mismatches;
}

function percentile(sorted, value) {
  return sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)];
}

function summarize(rows) {
  const successful = rows.filter((row) => !row.error);
  const times = successful.map((row) => row.ms).sort((a, b) => a - b);
  const compressed = successful
    .map((row) => row.compressedBytes)
    .sort((a, b) => a - b);
  const decompressed = successful
    .map((row) => row.decompressedBytes)
    .sort((a, b) => a - b);
  return {
    rounds: rows.length,
    failures: rows.length - successful.length,
    p50Ms: Math.round(percentile(times, 0.5)),
    p95Ms: Math.round(percentile(times, 0.95)),
    averageMs: Math.round(
      times.reduce((sum, value) => sum + value, 0) / times.length,
    ),
    medianCompressedBytes: percentile(compressed, 0.5),
    medianDecompressedBytes: percentile(decompressed, 0.5),
    itemCount: successful.at(-1)?.items.length ?? 0,
  };
}

const results = { graphql: [], json: [] };
let maxParityMismatches = 0;

console.log(
  `Benchmarking ${mode}/${language} for ${rounds} interleaved rounds`,
);
for (let round = 0; round < rounds; round++) {
  const order = round % 2 === 0 ? ["graphql", "json"] : ["json", "graphql"];
  const current = {};
  for (const source of order) {
    try {
      const result =
        source === "graphql" ? await runGraphqlFlow() : await runJsonFlow();
      results[source].push(result);
      current[source] = result;
    } catch (error) {
      results[source].push({ error });
      console.error(`${source} round ${round + 1} failed:`, error.message);
    }
  }
  if (current.graphql && current.json) {
    maxParityMismatches = Math.max(
      maxParityMismatches,
      countParityMismatches(current.graphql.items, current.json.items),
    );
  }
  console.log(
    `round ${round + 1}/${rounds}: graphql=${current.graphql ? `${Math.round(current.graphql.ms)}ms` : "failed"} json=${current.json ? `${Math.round(current.json.ms)}ms` : "failed"}`,
  );
}

const summary = {
  mode,
  language,
  graphql: summarize(results.graphql),
  json: summarize(results.json),
  maxParityMismatches,
};

console.log(JSON.stringify(summary, null, 2));
if (
  summary.graphql.failures > 0 ||
  summary.json.failures > 0 ||
  maxParityMismatches > 0 ||
  summary.json.p95Ms > summary.graphql.p95Ms
) {
  process.exitCode = 1;
}
