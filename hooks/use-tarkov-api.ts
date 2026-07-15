import type { SimplifiedItem } from "@/types/SimplifiedItem";
import type { GraphQLResponse, TarkovItem } from "@/types/GraphQLResponse";

const DEFAULT_GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";
const DEFAULT_JSON_API_URL = "https://json.tarkov.dev";

const GRAPHQL_API_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_TARKOV_GRAPHQL_URL ?? DEFAULT_GRAPHQL_API_URL)
    : (process.env.TARKOV_GRAPHQL_URL ?? DEFAULT_GRAPHQL_API_URL);

const JSON_API_URL =
  process.env.NEXT_PUBLIC_TARKOV_JSON_URL ?? DEFAULT_JSON_API_URL;

const TARKOV_API_COOLDOWN_KEY = "tarkov-dev-api-cooldown-until";
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_COOLDOWN_MS = 60000;
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 8000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

let memoryCooldownUntil = 0;

export type TarkovRequestPhase =
  "idle" | "loading" | "retrying" | "cooldown" | "success" | "error";

export interface TarkovRequestStatus {
  phase: TarkovRequestPhase;
  attempt: number;
  maxAttempts: number;
  nextRetryAt?: number;
  cooldownUntil?: number;
  lastError?: string;
  usingStaleData: boolean;
}

export const DEFAULT_TARKOV_REQUEST_STATUS: TarkovRequestStatus = {
  phase: "idle",
  attempt: 0,
  maxAttempts: RETRY_MAX_ATTEMPTS,
  usingStaleData: false,
};

interface TarkovRequestOptions {
  onStatus?: (status: TarkovRequestStatus) => void;
  usingStaleData?: boolean;
}

export class TarkovApiError extends Error {
  status?: number;
  transient: boolean;
  retryAfterMs?: number;
  cooldownUntil?: number;

  constructor(
    message: string,
    options: {
      status?: number;
      transient?: boolean;
      retryAfterMs?: number;
      cooldownUntil?: number;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "TarkovApiError";
    this.status = options.status;
    this.transient = options.transient ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.cooldownUntil = options.cooldownUntil;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

function getCooldownUntil(): number {
  if (typeof window === "undefined") {
    return memoryCooldownUntil;
  }

  const stored = window.localStorage.getItem(TARKOV_API_COOLDOWN_KEY);
  const parsed = stored ? Number(stored) : 0;
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    window.localStorage.removeItem(TARKOV_API_COOLDOWN_KEY);
    return 0;
  }

  return parsed;
}

function setCooldownUntil(cooldownUntil: number): void {
  memoryCooldownUntil = cooldownUntil;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TARKOV_API_COOLDOWN_KEY, String(cooldownUntil));
  }
}

function clearCooldown(): void {
  memoryCooldownUntil = 0;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TARKOV_API_COOLDOWN_KEY);
  }
}

export function resetTarkovApiRetryStateForTests() {
  clearCooldown();
}

export function clearTarkovApiCooldown() {
  clearCooldown();
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }

  return undefined;
}

function getRetryDelayMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  const exponential = Math.min(
    RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
    RETRY_MAX_DELAY_MS,
  );
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.round(exponential * jitter);
}

function isTransientError(error: unknown): boolean {
  if (error instanceof TarkovApiError) {
    return error.transient;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function runTarkovRequestWithRetry<T>(
  request: (signal: AbortSignal) => Promise<T>,
  options: TarkovRequestOptions = {},
): Promise<T> {
  const usingStaleData = options.usingStaleData ?? false;
  const cooldownUntil = getCooldownUntil();

  if (cooldownUntil > Date.now()) {
    options.onStatus?.({
      phase: "cooldown",
      attempt: RETRY_MAX_ATTEMPTS,
      maxAttempts: RETRY_MAX_ATTEMPTS,
      cooldownUntil,
      lastError: "Tarkov.dev is temporarily unavailable",
      usingStaleData,
    });
    throw new TarkovApiError("Tarkov.dev is cooling down after API failures", {
      transient: true,
      cooldownUntil,
    });
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    options.onStatus?.({
      phase: attempt === 1 ? "loading" : "retrying",
      attempt,
      maxAttempts: RETRY_MAX_ATTEMPTS,
      usingStaleData,
      lastError: lastError ? describeError(lastError) : undefined,
    });

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const result = await request(controller.signal);
      clearCooldown();
      options.onStatus?.({
        phase: "success",
        attempt,
        maxAttempts: RETRY_MAX_ATTEMPTS,
        usingStaleData: false,
      });
      return result;
    } catch (error) {
      lastError = error;
      const transient = isTransientError(error);
      const isLastAttempt = attempt >= RETRY_MAX_ATTEMPTS;

      if (!transient || isLastAttempt) {
        const nextCooldownUntil = transient
          ? Date.now() + RETRY_COOLDOWN_MS
          : undefined;
        if (nextCooldownUntil) {
          setCooldownUntil(nextCooldownUntil);
        }

        options.onStatus?.({
          phase: nextCooldownUntil ? "cooldown" : "error",
          attempt,
          maxAttempts: RETRY_MAX_ATTEMPTS,
          cooldownUntil: nextCooldownUntil,
          lastError: describeError(error),
          usingStaleData,
        });

        throw error;
      }

      const delayMs = getRetryDelayMs(
        attempt,
        error instanceof TarkovApiError ? error.retryAfterMs : undefined,
      );
      const nextRetryAt = Date.now() + delayMs;
      options.onStatus?.({
        phase: "retrying",
        attempt: attempt + 1,
        maxAttempts: RETRY_MAX_ATTEMPTS,
        nextRetryAt,
        lastError: describeError(error),
        usingStaleData,
      });
      await wait(delayMs);
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function fetchTarkovGraphQL<T>(
  query: string,
  options: TarkovRequestOptions = {},
): Promise<T> {
  return runTarkovRequestWithRetry(async (signal) => {
    const response = await fetch(GRAPHQL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!response.ok) {
      const retryAfterMs = parseRetryAfterMs(
        response.headers.get("Retry-After"),
      );
      throw new TarkovApiError(
        `Tarkov.dev API request failed with status ${response.status}`,
        {
          status: response.status,
          transient: RETRYABLE_STATUS_CODES.has(response.status),
          retryAfterMs,
        },
      );
    }

    return (await response.json()) as T;
  }, options);
}

interface TarkovJsonEnvelope<T> {
  data: T;
  translations?: string[];
}

interface TarkovJsonCategory {
  id: string;
  name: string;
}

interface TarkovJsonTrader {
  id: string;
  normalizedName: string;
}

interface TarkovJsonTraderOffer {
  trader: string;
  priceRUB: number;
  minTraderLevel?: number;
  buyLimit?: number;
}

interface TarkovJsonItem {
  id: string;
  name: string;
  shortName: string;
  basePrice: number;
  lastLowPrice: number | null;
  avg24hPrice: number | null;
  updated?: string;
  width?: number;
  height?: number;
  lastOfferCount?: number | null;
  iconLink?: string;
  link?: string;
  categories?: string[];
  buyFromTrader?: TarkovJsonTraderOffer[];
  sellToTrader?: TarkovJsonTraderOffer[];
}

interface TarkovJsonItemsData {
  items: Record<string, TarkovJsonItem>;
  itemCategories: Record<string, TarkovJsonCategory>;
}

type TarkovJsonTranslations = Record<string, string>;
type TarkovJsonTraders = Record<string, TarkovJsonTrader>;

interface TarkovJsonBundle {
  items: TarkovJsonEnvelope<TarkovJsonItemsData>;
  primaryTranslations: TarkovJsonTranslations;
  englishTranslations: TarkovJsonTranslations;
  traders: TarkovJsonTraders;
}

interface JsonResourceCacheEntry {
  data: unknown;
  time: number;
}

const jsonResourceCache = new Map<string, JsonResourceCacheEntry>();
const jsonResourceInFlight = new Map<string, Promise<unknown>>();

function getDataSource(): "json" | "graphql" {
  return process.env.NEXT_PUBLIC_TARKOV_DATA_SOURCE === "graphql"
    ? "graphql"
    : "json";
}

async function fetchJsonResource<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const cached = jsonResourceCache.get(path);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data as T;
  }

  const existing = jsonResourceInFlight.get(path);
  if (existing) {
    return (await existing) as T;
  }

  const promise = (async () => {
    const response = await fetch(`${JSON_API_URL}/${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-cache",
      signal,
    });

    if (!response.ok) {
      const retryAfterMs = parseRetryAfterMs(
        response.headers.get("Retry-After"),
      );
      throw new TarkovApiError(
        `Tarkov.dev JSON request failed with status ${response.status} (${path})`,
        {
          status: response.status,
          transient: RETRYABLE_STATUS_CODES.has(response.status),
          retryAfterMs,
        },
      );
    }

    const data = (await response.json()) as T;
    jsonResourceCache.set(path, { data, time: Date.now() });
    return data;
  })();

  jsonResourceInFlight.set(path, promise);
  try {
    return await promise;
  } finally {
    jsonResourceInFlight.delete(path);
  }
}

async function fetchTarkovJsonBundle(
  gameMode: "pve" | "regular",
  language: string,
  options: TarkovRequestOptions,
): Promise<TarkovJsonBundle> {
  return runTarkovRequestWithRetry(async (signal) => {
    const basePath = `${gameMode}/items`;
    const primaryPromise =
      language === "en"
        ? Promise.resolve(undefined)
        : fetchJsonResource<TarkovJsonEnvelope<TarkovJsonTranslations>>(
            `${basePath}_${language}`,
            signal,
          ).catch((error) => {
            console.warn(
              `Tarkov.dev JSON translation ${language} unavailable; using English`,
              error,
            );
            return undefined;
          });

    const [items, english, traders, primary] = await Promise.all([
      fetchJsonResource<TarkovJsonEnvelope<TarkovJsonItemsData>>(
        basePath,
        signal,
      ),
      fetchJsonResource<TarkovJsonEnvelope<TarkovJsonTranslations>>(
        `${basePath}_en`,
        signal,
      ),
      fetchJsonResource<TarkovJsonEnvelope<TarkovJsonTraders>>(
        `${gameMode}/traders`,
        signal,
      ),
      primaryPromise,
    ]);

    return {
      items,
      primaryTranslations: primary?.data ?? english.data,
      englishTranslations: english.data,
      traders: traders.data,
    };
  }, options);
}

function translateJsonValue(
  key: string,
  primary: TarkovJsonTranslations,
  english: TarkovJsonTranslations,
): string {
  return primary[key] ?? english[key] ?? key;
}

function mapJsonCategories(
  item: TarkovJsonItem,
  bundle: TarkovJsonBundle,
): Array<{ id: string; name: string }> {
  return (item.categories ?? []).map((categoryId) => {
    const category = bundle.items.data.itemCategories[categoryId];
    const nameKey = category?.name ?? categoryId;
    return {
      id: categoryId,
      name: translateJsonValue(
        nameKey,
        bundle.primaryTranslations,
        bundle.englishTranslations,
      ),
    };
  });
}

function getJsonTraderName(
  traderId: string,
  traders: TarkovJsonTraders,
): string {
  return traders[traderId]?.normalizedName ?? traderId;
}

function mapJsonSimplifiedItem(
  item: TarkovJsonItem,
  bundle: TarkovJsonBundle,
): SimplifiedItem {
  const categories = mapJsonCategories(item, bundle);
  return {
    id: item.id,
    name: translateJsonValue(
      item.name,
      bundle.primaryTranslations,
      bundle.englishTranslations,
    ),
    shortName: translateJsonValue(
      item.shortName,
      bundle.primaryTranslations,
      bundle.englishTranslations,
    ),
    basePrice: item.basePrice,
    lastLowPrice: item.lastLowPrice ?? undefined,
    avg24hPrice: item.avg24hPrice ?? undefined,
    updated: item.updated,
    width: item.width,
    height: item.height,
    lastOfferCount: item.lastOfferCount ?? undefined,
    iconLink: item.iconLink,
    link: item.link,
    categories: categories.map((category) => category.id),
    categories_display: categories,
    buyFor: (item.buyFromTrader ?? []).map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: {
        normalizedName: getJsonTraderName(offer.trader, bundle.traders),
        minTraderLevel: offer.minTraderLevel,
      },
    })),
    tags: [],
    isExcluded: false,
  };
}

function mapJsonMinimalItem(
  item: TarkovJsonItem,
  bundle: TarkovJsonBundle,
): MinimalItem {
  return {
    id: item.id,
    name: translateJsonValue(
      item.name,
      bundle.primaryTranslations,
      bundle.englishTranslations,
    ),
    shortName: translateJsonValue(
      item.shortName,
      bundle.primaryTranslations,
      bundle.englishTranslations,
    ),
    basePrice: item.basePrice,
    lastLowPrice: item.lastLowPrice,
    avg24hPrice: item.avg24hPrice,
    categories: mapJsonCategories(item, bundle).map(({ name }) => ({ name })),
    link: item.link ?? "",
    sellFor: (item.sellToTrader ?? []).map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: {
        normalizedName: getJsonTraderName(offer.trader, bundle.traders),
      },
    })),
    buyFor: (item.buyFromTrader ?? []).map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: {
        normalizedName: getJsonTraderName(offer.trader, bundle.traders),
        minTraderLevel: offer.minTraderLevel,
        buyLimit: offer.buyLimit,
      },
    })),
  };
}

// Define a type for the combined data response
interface CombinedTarkovData {
  pvp: SimplifiedItem[];
  pve: SimplifiedItem[];
  meta: {
    totalItems: number;
    validItems: number;
    processTime: number;
    categories: number;
  };
}

// Define a consistent cache TTL to use across the application
export const CACHE_TTL = 900000; // 15 minutes

// Cache for the combined data to avoid duplicate fetches (per language)
const combinedDataCacheByLang: Map<
  string,
  { data: CombinedTarkovData; time: number }
> = new Map();

// Cache for the minimal data to avoid duplicate fetches (per language)
const minimalDataCacheByLang: Map<
  string,
  { data: { pvpItems: MinimalItem[]; pveItems: MinimalItem[] }; time: number }
> = new Map();

type TarkovDataResult = {
  items: SimplifiedItem[];
  meta: {
    totalItems: number;
    validItems: number;
    processTime: number;
    categories: number;
    mode: string;
  };
};

const jsonSimplifiedDataCache = new Map<
  string,
  { data: TarkovDataResult; time: number }
>();
const jsonMinimalDataCache = new Map<
  string,
  { data: MinimalItem[]; time: number }
>();

export function resetTarkovApiCachesForTests() {
  combinedDataCacheByLang.clear();
  minimalDataCacheByLang.clear();
  jsonResourceCache.clear();
  jsonResourceInFlight.clear();
  jsonSimplifiedDataCache.clear();
  jsonMinimalDataCache.clear();
  clearCooldown();
}

/**
 * Fetches all Tarkov item data from the tarkov.dev GraphQL API for both game modes
 * @returns Promise with combined data for both PVP and PVE modes
 */
export async function fetchCombinedTarkovData(
  language: string = "en",
  options: TarkovRequestOptions = {},
): Promise<CombinedTarkovData> {
  const now = Date.now();

  // Return cached data if it's still fresh
  const cached = combinedDataCacheByLang.get(language);
  if (cached && now - cached.time < CACHE_TTL) {
    console.debug(`📦 Using cached combined Tarkov data [${language}]`);
    return cached.data;
  }

  const startTime = Date.now();

  // Query both game modes in a single request
  const query = `
    {
      pvpItems: items(gameMode: regular, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        updated
        width
        height
        lastOfferCount
        iconLink
        avg24hPrice
        link
        categories {
          id
          name
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
            }
          }
        }
      }
      pveItems: items(gameMode: pve, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        updated
        width
        height
        lastOfferCount
        avg24hPrice
        iconLink
        link
        categories {
          id
          name
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
            }
          }
        }
      }
    }
  `;

  try {
    console.debug("🔄 Fetching combined Tarkov data");
    const { data, errors } = await fetchTarkovGraphQL<GraphQLResponse>(
      query,
      options,
    );

    // Check if we have valid data first
    if (!data?.pvpItems || !data?.pveItems) {
      throw new Error("Missing data in API response");
    }

    // Only throw on errors if they're critical (not just translation warnings)
    if (errors && errors.length > 0) {
      // Check if all errors are translation-related (non-critical)
      const hasNonTranslationErrors = errors.some(
        (e) => !e.message.includes("Missing translation for key"),
      );

      if (hasNonTranslationErrors) {
        console.error("GraphQL errors:", errors);
        throw new Error(
          `GraphQL errors: ${errors.map((e) => e.message).join(", ")}`,
        );
      } else {
        // Just log translation warnings, don't fail the request
        console.warn(
          `⚠️ Translation warnings (${errors.length} items missing translations for language: ${language})`,
        );
      }
    }

    // Transform the data for both modes
    const transformItem = (item: TarkovItem) => ({
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      basePrice: item.basePrice,
      lastLowPrice: item.lastLowPrice || undefined,
      updated: item.updated,
      lastOfferCount: item.lastOfferCount || undefined,
      avg24hPrice: item.avg24hPrice || undefined,
      iconLink: item.iconLink,
      link: item.link,
      width: item.width,
      height: item.height,
      // Use language-agnostic category IDs for filtering logic
      // Non-null assertion is safe here because this query selects `id` for categories
      categories: item.categories.map(
        (cat: { id?: string; name: string }) => cat.id!,
      ),
      tags: [],
      isExcluded: false,
      categories_display: item.categories,
      buyFor: item.buyFor
        ? item.buyFor
            .filter((o) => !!o && !!o.vendor && typeof o.priceRUB === "number")
            .map((o) => ({
              priceRUB: o.priceRUB,
              vendor: {
                normalizedName: o.vendor.normalizedName,
                minTraderLevel: o.vendor.minTraderLevel,
              },
            }))
        : undefined,
    });

    const transformPvpItems = data.pvpItems.map(transformItem);
    const transformPveItems = data.pveItems.map(transformItem);

    // buyFor is already included in the combined query above; no merge needed.

    // Count unique categories (combining both modes)
    const allCategories = new Set(
      [...transformPvpItems, ...transformPveItems].flatMap(
        (item) => item.categories || [],
      ),
    );

    const processTime = Date.now() - startTime;

    // Update the cache
    const combined: CombinedTarkovData = {
      pvp: transformPvpItems,
      pve: transformPveItems,
      meta: {
        totalItems: transformPvpItems.length + transformPveItems.length,
        validItems: transformPvpItems.length + transformPveItems.length,
        processTime,
        categories: allCategories.size,
      },
    };
    // store per-language cache
    combinedDataCacheByLang.set(language, { data: combined, time: now });

    // Data has been fetched and processed successfully

    return combined;
  } catch (error) {
    console.error("Error fetching combined Tarkov data:", error);
    throw error;
  }
}

/**
 * Fetches Tarkov item data for a specific game mode
 * @param gameMode 'pve' or 'regular' (pvp)
 * @returns Promise with transformed items in SimplifiedItem format
 */
async function fetchTarkovDataFromGraphQL(
  gameMode: "pve" | "regular",
  language: string = "en",
  options: TarkovRequestOptions = {},
): Promise<TarkovDataResult> {
  try {
    // Use the combined data fetcher and extract the relevant mode's data
    const combinedData = await fetchCombinedTarkovData(language, options);

    // Extract the items for the requested game mode
    const items = gameMode === "pve" ? combinedData.pve : combinedData.pvp;

    // Count categories for this specific mode
    const categoryCount = new Set(
      items.flatMap((item) => item.categories || []),
    );

    // Return the data in the expected format
    return {
      items,
      meta: {
        ...combinedData.meta,
        totalItems: items.length,
        validItems: items.length,
        categories: categoryCount.size,
        mode: gameMode === "pve" ? "pve" : "pvp",
      },
    };
  } catch (error) {
    console.error(`Error fetching Tarkov data (${gameMode}):`, error);
    throw error;
  }
}

async function fetchTarkovDataFromJson(
  gameMode: "pve" | "regular",
  language: string,
  options: TarkovRequestOptions,
): Promise<TarkovDataResult> {
  const cacheKey = `${gameMode}:${language}`;
  const cached = jsonSimplifiedDataCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const startTime = Date.now();
  const bundle = await fetchTarkovJsonBundle(gameMode, language, options);
  const items = Object.values(bundle.items.data.items).map((item) =>
    mapJsonSimplifiedItem(item, bundle),
  );
  const categoryCount = new Set(items.flatMap((item) => item.categories ?? []))
    .size;
  const result: TarkovDataResult = {
    items,
    meta: {
      totalItems: items.length,
      validItems: items.length,
      processTime: Date.now() - startTime,
      categories: categoryCount,
      mode: gameMode === "pve" ? "pve" : "pvp",
    },
  };

  jsonSimplifiedDataCache.set(cacheKey, { data: result, time: Date.now() });
  return result;
}

export async function fetchTarkovData(
  gameMode: "pve" | "regular",
  language: string = "en",
  options: TarkovRequestOptions = {},
): Promise<TarkovDataResult> {
  if (getDataSource() === "graphql") {
    return fetchTarkovDataFromGraphQL(gameMode, language, options);
  }

  try {
    return await fetchTarkovDataFromJson(gameMode, language, options);
  } catch (jsonError) {
    console.warn(
      `Tarkov.dev JSON fetch failed for ${gameMode}/${language}; falling back to GraphQL`,
      jsonError,
    );
    clearCooldown();
    return fetchTarkovDataFromGraphQL(gameMode, language, options);
  }
}

export interface MinimalItem {
  id: string;
  name: string;
  shortName: string;
  basePrice: number;
  lastLowPrice: number | null;
  avg24hPrice: number | null;
  categories: {
    name: string;
  }[];
  link: string;
  sellFor: {
    vendor: {
      normalizedName: string;
    };
    priceRUB: number;
  }[];
  buyFor: {
    priceRUB: number;
    vendor: {
      normalizedName: string;
      minTraderLevel?: number;
      buyLimit?: number;
    };
  }[];
}

interface FetchMinimalTarkovGraphQLResponse {
  data?: {
    pvpItems: MinimalItem[];
    pveItems: MinimalItem[];
  };
  errors?: Array<{ message: string }>;
}

async function fetchMinimalTarkovDataFromGraphQL(
  language: string = "en",
  options: TarkovRequestOptions = {},
): Promise<{ pvpItems: MinimalItem[]; pveItems: MinimalItem[] }> {
  const now = Date.now();

  // Return cached data if it's still fresh
  const cached = minimalDataCacheByLang.get(language);
  if (cached && now - cached.time < CACHE_TTL) {
    console.debug(`📦 Using cached minimal Tarkov data [${language}]`);
    return cached.data;
  }

  const startTime = Date.now();
  const query = `
    {
      pvpItems: items(gameMode: regular, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        avg24hPrice
        categories {
          name
        }
        link
        sellFor {
          vendor {
            normalizedName
          }
          priceRUB
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
              buyLimit
            }
          }
        }
      }
      pveItems: items(gameMode: pve, lang: ${language}) {
        id
        name
        shortName
        basePrice
        lastLowPrice
        avg24hPrice
        categories {
          name
        }
        link
        sellFor {
          vendor {
            normalizedName
          }
          priceRUB
        }
        buyFor {
          priceRUB
          vendor {
            normalizedName
            ... on TraderOffer {
              minTraderLevel
              buyLimit
            }
          }
        }
      }
    }
  `;

  try {
    console.debug("🔄 Fetching minimal Tarkov data");
    const result = await fetchTarkovGraphQL<FetchMinimalTarkovGraphQLResponse>(
      query,
      options,
    );

    if (!result.data || !result.data.pvpItems || !result.data.pveItems) {
      console.error("❌ No data in GraphQL response for minimal fetch");
      throw new Error("No data returned from Tarkov API for minimal fetch");
    }

    // Only throw on errors if they're critical (not just translation warnings)
    if (result.errors && result.errors.length > 0) {
      const hasNonTranslationErrors = result.errors.some(
        (e) => !e.message.includes("Missing translation for key"),
      );

      if (hasNonTranslationErrors) {
        console.error("❌ GraphQL errors on minimal fetch:", result.errors);
        throw new Error(
          `GraphQL error: ${result.errors.map((e) => e.message).join(", ")}`,
        );
      } else {
        console.warn(
          `⚠️ Translation warnings in minimal fetch (${result.errors.length} items missing translations for language: ${language})`,
        );
      }
    }

    const endTime = Date.now();
    console.debug(`✅ Minimal Tarkov data fetched in ${endTime - startTime}ms`);

    // Update the cache
    const data = {
      pvpItems: result.data.pvpItems,
      pveItems: result.data.pveItems,
    };
    minimalDataCacheByLang.set(language, { data, time: now });

    return data;
  } catch (error) {
    console.error("❌ Failed to fetch minimal Tarkov data:", error);
    throw error;
  }
}

async function fetchMinimalTarkovDataFromJson(
  gameMode: "pve" | "regular",
  language: string,
  options: TarkovRequestOptions,
): Promise<MinimalItem[]> {
  const cacheKey = `${gameMode}:${language}`;
  const cached = jsonMinimalDataCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const bundle = await fetchTarkovJsonBundle(gameMode, language, options);
  const items = Object.values(bundle.items.data.items).map((item) =>
    mapJsonMinimalItem(item, bundle),
  );
  jsonMinimalDataCache.set(cacheKey, { data: items, time: Date.now() });
  return items;
}

export async function fetchMinimalTarkovData(
  gameMode: "pve" | "regular",
  language: string = "en",
  options: TarkovRequestOptions = {},
): Promise<MinimalItem[]> {
  if (getDataSource() === "graphql") {
    const combined = await fetchMinimalTarkovDataFromGraphQL(language, options);
    return gameMode === "pve" ? combined.pveItems : combined.pvpItems;
  }

  try {
    return await fetchMinimalTarkovDataFromJson(gameMode, language, options);
  } catch (jsonError) {
    console.warn(
      `Tarkov.dev JSON minimal fetch failed for ${gameMode}/${language}; falling back to GraphQL`,
      jsonError,
    );
    clearCooldown();
    const combined = await fetchMinimalTarkovDataFromGraphQL(language, options);
    return gameMode === "pve" ? combined.pveItems : combined.pvpItems;
  }
}
