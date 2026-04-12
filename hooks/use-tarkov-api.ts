import type { SimplifiedItem } from "@/types/SimplifiedItem";

const DEFAULT_JSON_API_URL = "https://json.tarkov.dev";

const JSON_API_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_TARKOV_JSON_URL ?? DEFAULT_JSON_API_URL
    : process.env.TARKOV_JSON_URL ?? DEFAULT_JSON_API_URL;

const TRADER_NAME_BY_ID: Record<string, string> = {
  "54cb50c76803fa8b248b4571": "prapor",
  "54cb57776803fa99248b456e": "therapist",
  "579dc571d53a0658a154fbec": "fence",
  "58330581ace78e27b8b10cee": "skier",
  "5935c25fb3acc3127c3d8cd9": "peacekeeper",
  "5a7c2eca46aef81a7ca2145d": "mechanic",
  "5ac3b934156ae10c4430e83c": "ragman",
  "5c0647fdd443bc2504c2d371": "jaeger",
  "638f541a29ffd1183d187f57": "lightkeeper",
  "656f0f98d80a697f855d34b1": "btr-driver",
  "68fe15990f29ba3fdbba9d55": "radio-station",
  "68fe15910f29ba3fdbba9d54": "taran",
  "6617beeaa9cfa777ca915b7c": "ref",
  "688246518448b05efd61d461": "mr-kerman",
  "688246958448b05efd61d462": "voevoda",
};

type GameMode = "regular" | "pve";

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

interface JsonItemCategory {
  id: string;
  name: string;
  normalizedName: string;
  parent: string | null;
  children: string[];
}

interface JsonTraderOffer {
  trader: string;
  price: number;
  priceRUB: number;
  currency: string;
  currencyItem: string;
  minTraderLevel?: number;
  buyLimit?: number;
  taskUnlock?: string | null;
}

interface JsonItem {
  id: string;
  name: string;
  shortName: string;
  normalizedName: string;
  description: string;
  updated: string;
  width: number;
  height: number;
  lastOfferCount?: number | null;
  iconLink: string;
  link: string;
  basePrice: number;
  lastLowPrice: number | null;
  avg24hPrice: number | null;
  categories: string[];
  buyFromTrader?: JsonTraderOffer[];
  sellToTrader?: JsonTraderOffer[];
}

interface JsonItemsResponse {
  data: {
    items: Record<string, JsonItem>;
    itemCategories: Record<string, JsonItemCategory>;
  };
}

interface JsonTranslationResponse {
  data: Record<string, string>;
}

interface TranslationMaps {
  primary: Record<string, string>;
  fallback: Record<string, string>;
}

interface ModePayload {
  items: JsonItem[];
  itemCategories: Record<string, JsonItemCategory>;
}

export const CACHE_TTL = 900000; // 15 minutes

const combinedDataCacheByLang = new Map<
  string,
  { data: CombinedTarkovData; time: number }
>();

const modeDataCacheByModeAndLang = new Map<
  string,
  {
    data: {
      items: SimplifiedItem[];
      meta: {
        totalItems: number;
        validItems: number;
        processTime: number;
        categories: number;
        mode: string;
      };
    };
    time: number;
  }
>();

const minimalModeDataCacheByModeAndLang = new Map<
  string,
  { data: MinimalItem[]; time: number }
>();

const minimalDataCacheByLang = new Map<
  string,
  { data: { pvpItems: MinimalItem[]; pveItems: MinimalItem[] }; time: number }
>();

const rawModePayloadCacheByMode = new Map<
  GameMode,
  { data: ModePayload; time: number }
>();

const translationCacheByLang = new Map<
  string,
  { data: TranslationMaps; time: number }
>();
const inFlightTranslationRequests = new Map<string, Promise<TranslationMaps>>();

export function resetTarkovApiCachesForTests() {
  combinedDataCacheByLang.clear();
  modeDataCacheByModeAndLang.clear();
  minimalModeDataCacheByModeAndLang.clear();
  minimalDataCacheByLang.clear();
  rawModePayloadCacheByMode.clear();
  translationCacheByLang.clear();
  inFlightTranslationRequests.clear();
}

function normalizeLanguage(language: string) {
  return language.toLowerCase();
}

function modeCacheKey(gameMode: GameMode, language: string) {
  return `${gameMode}:${normalizeLanguage(language)}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${JSON_API_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`RATE_LIMIT:${response.status}`);
    }

    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function translateValue(
  key: string | undefined,
  primary: Record<string, string>,
  fallback: Record<string, string>
): string | undefined {
  if (!key) {
    return undefined;
  }

  return primary[key] ?? fallback[key] ?? key;
}

function getCategoryDisplay(
  categoryIds: string[],
  itemCategories: Record<string, JsonItemCategory>,
  translations: TranslationMaps,
  useFallbackOnly: boolean = false
) {
  return categoryIds.map((categoryId) => ({
    id: categoryId,
    name:
      translateValue(
        itemCategories[categoryId]?.name,
        useFallbackOnly ? translations.fallback : translations.primary,
        translations.fallback
      ) ?? categoryId,
  }));
}

function mapBuyOffers(offers?: JsonTraderOffer[]) {
  if (!offers || offers.length === 0) {
    return undefined;
  }

  const mapped = offers
    .filter((offer) => typeof offer?.priceRUB === "number")
    .map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: {
        normalizedName: TRADER_NAME_BY_ID[offer.trader] ?? offer.trader,
        minTraderLevel: offer.minTraderLevel,
        buyLimit: offer.buyLimit,
      },
    }));

  return mapped.length > 0 ? mapped : undefined;
}

function mapSellOffers(offers?: JsonTraderOffer[]) {
  if (!offers || offers.length === 0) {
    return undefined;
  }

  const mapped = offers
    .filter((offer) => typeof offer?.priceRUB === "number")
    .map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: {
        normalizedName: TRADER_NAME_BY_ID[offer.trader] ?? offer.trader,
      },
    }));

  return mapped.length > 0 ? mapped : undefined;
}

async function fetchItemTranslations(language: string): Promise<TranslationMaps> {
  const normalizedLanguage = normalizeLanguage(language);
  const cached = translationCacheByLang.get(normalizedLanguage);
  const now = Date.now();

  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const inFlight = inFlightTranslationRequests.get(normalizedLanguage);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const [fallbackTranslations, primaryTranslations] = await Promise.all([
      fetchJson<JsonTranslationResponse>("/regular/items_en"),
      normalizedLanguage === "en"
        ? Promise.resolve<JsonTranslationResponse>({ data: {} })
        : fetchJson<JsonTranslationResponse>(
            `/regular/items_${normalizedLanguage}`
          ),
    ]);

    const translations: TranslationMaps = {
      primary:
        normalizedLanguage === "en"
          ? fallbackTranslations.data
          : primaryTranslations.data,
      fallback: fallbackTranslations.data,
    };

    translationCacheByLang.set(normalizedLanguage, {
      data: translations,
      time: Date.now(),
    });
    return translations;
  })();

  inFlightTranslationRequests.set(normalizedLanguage, request);
  try {
    return await request;
  } finally {
    inFlightTranslationRequests.delete(normalizedLanguage);
  }
}

async function fetchModePayload(gameMode: GameMode): Promise<ModePayload> {
  const cached = rawModePayloadCacheByMode.get(gameMode);
  const now = Date.now();

  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const itemsResponse = await fetchJson<JsonItemsResponse>(`/${gameMode}/items`);
  const payload: ModePayload = {
    items: Object.values(itemsResponse.data.items),
    itemCategories: itemsResponse.data.itemCategories,
  };

  rawModePayloadCacheByMode.set(gameMode, { data: payload, time: now });
  return payload;
}

function transformCombinedItem(
  item: JsonItem,
  payload: ModePayload,
  translations: TranslationMaps
): SimplifiedItem {
  const englishName =
    translateValue(item.name, translations.fallback, translations.fallback) ??
    item.name;
  const englishShortName =
    translateValue(
      item.shortName,
      translations.fallback,
      translations.fallback
    ) ?? item.shortName;

  return {
    id: item.id,
    name:
      translateValue(item.name, translations.primary, translations.fallback) ??
      item.name,
    shortName:
      translateValue(
        item.shortName,
        translations.primary,
        translations.fallback
      ) ?? item.shortName,
    englishName,
    englishShortName,
    basePrice: item.basePrice,
    lastLowPrice: item.lastLowPrice ?? undefined,
    updated: item.updated,
    lastOfferCount: item.lastOfferCount ?? undefined,
    avg24hPrice: item.avg24hPrice ?? undefined,
    iconLink: item.iconLink,
    link: item.link,
    width: item.width,
    height: item.height,
    categories: item.categories,
    tags: [],
    isExcluded: false,
    categories_display: getCategoryDisplay(
      item.categories,
      payload.itemCategories,
      translations
    ),
    categories_display_en: getCategoryDisplay(
      item.categories,
      payload.itemCategories,
      translations,
      true
    ),
    buyFor: mapBuyOffers(item.buyFromTrader),
  };
}

function transformMinimalItem(
  item: JsonItem,
  payload: ModePayload,
  translations: TranslationMaps
): MinimalItem {
  return {
    id: item.id,
    name:
      translateValue(item.name, translations.primary, translations.fallback) ??
      item.name,
    shortName:
      translateValue(
        item.shortName,
        translations.primary,
        translations.fallback
      ) ?? item.shortName,
    basePrice: item.basePrice,
    lastLowPrice: item.lastLowPrice,
    avg24hPrice: item.avg24hPrice,
    categories: getCategoryDisplay(
      item.categories,
      payload.itemCategories,
      translations
    ).map((category) => ({
      name: category.name,
    })),
    link: item.link,
    sellFor: mapSellOffers(item.sellToTrader) ?? [],
    buyFor: mapBuyOffers(item.buyFromTrader) ?? [],
  };
}

export async function fetchCombinedTarkovData(
  language: string = "en"
): Promise<CombinedTarkovData> {
  const normalizedLanguage = normalizeLanguage(language);
  const now = Date.now();
  const cached = combinedDataCacheByLang.get(normalizedLanguage);

  if (cached && now - cached.time < CACHE_TTL) {
    console.debug(`📦 Using cached combined Tarkov data [${normalizedLanguage}]`);
    return cached.data;
  }

  const startTime = Date.now();

  try {
    const [pvpData, pveData] = await Promise.all([
      fetchTarkovData("regular", normalizedLanguage),
      fetchTarkovData("pve", normalizedLanguage),
    ]);

    const allCategories = new Set(
      [...pvpData.items, ...pveData.items].flatMap((item) => item.categories || [])
    );

    const combined: CombinedTarkovData = {
      pvp: pvpData.items,
      pve: pveData.items,
      meta: {
        totalItems: pvpData.items.length + pveData.items.length,
        validItems: pvpData.items.length + pveData.items.length,
        processTime: Date.now() - startTime,
        categories: allCategories.size,
      },
    };

    combinedDataCacheByLang.set(normalizedLanguage, { data: combined, time: now });
    return combined;
  } catch (error) {
    console.error("Error fetching combined Tarkov data:", error);
    throw error;
  }
}

export async function fetchTarkovData(
  gameMode: "pve" | "regular",
  language: string = "en"
): Promise<{
  items: SimplifiedItem[];
  meta: {
    totalItems: number;
    validItems: number;
    processTime: number;
    categories: number;
    mode: string;
  };
}> {
  const normalizedLanguage = normalizeLanguage(language);
  const cacheKey = modeCacheKey(gameMode, normalizedLanguage);
  const now = Date.now();
  const cached = modeDataCacheByModeAndLang.get(cacheKey);

  if (cached && now - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const startTime = Date.now();

  try {
    const [payload, translations] = await Promise.all([
      fetchModePayload(gameMode),
      fetchItemTranslations(normalizedLanguage),
    ]);

    const items = payload.items.map((item) =>
      transformCombinedItem(item, payload, translations)
    );
    const categoryCount = new Set(items.flatMap((item) => item.categories || []));

    const data = {
      items,
      meta: {
        totalItems: items.length,
        validItems: items.length,
        processTime: Date.now() - startTime,
        categories: categoryCount.size,
        mode: gameMode === "pve" ? "pve" : "pvp",
      },
    };

    modeDataCacheByModeAndLang.set(cacheKey, { data, time: now });
    return data;
  } catch (error) {
    console.error(`Error fetching Tarkov data (${gameMode}):`, error);
    throw error;
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

export async function fetchMinimalTarkovDataForMode(
  gameMode: "pve" | "regular",
  language: string = "en"
): Promise<MinimalItem[]> {
  const normalizedLanguage = normalizeLanguage(language);
  const cacheKey = modeCacheKey(gameMode, normalizedLanguage);
  const now = Date.now();
  const cached = minimalModeDataCacheByModeAndLang.get(cacheKey);

  if (cached && now - cached.time < CACHE_TTL) {
    console.debug(
      `📦 Using cached minimal Tarkov data [${gameMode}:${normalizedLanguage}]`
    );
    return cached.data;
  }

  const startTime = Date.now();

  try {
    const [payload, translations] = await Promise.all([
      fetchModePayload(gameMode),
      fetchItemTranslations(normalizedLanguage),
    ]);

    const items = payload.items.map((item) =>
      transformMinimalItem(item, payload, translations)
    );

    console.debug(
      `✅ Minimal Tarkov data fetched in ${Date.now() - startTime}ms for ${gameMode}`
    );

    minimalModeDataCacheByModeAndLang.set(cacheKey, { data: items, time: now });
    return items;
  } catch (error) {
    console.error(`❌ Failed to fetch minimal Tarkov data (${gameMode}):`, error);
    return [];
  }
}

export async function fetchMinimalTarkovData(
  language: string = "en"
): Promise<{ pvpItems: MinimalItem[]; pveItems: MinimalItem[] }> {
  const normalizedLanguage = normalizeLanguage(language);
  const now = Date.now();
  const cached = minimalDataCacheByLang.get(normalizedLanguage);

  if (cached && now - cached.time < CACHE_TTL) {
    console.debug(`📦 Using cached minimal Tarkov data [${normalizedLanguage}]`);
    return cached.data;
  }

  const [pvpItems, pveItems] = await Promise.all([
    fetchMinimalTarkovDataForMode("regular", normalizedLanguage),
    fetchMinimalTarkovDataForMode("pve", normalizedLanguage),
  ]);

  const data = { pvpItems, pveItems };
  minimalDataCacheByLang.set(normalizedLanguage, { data, time: now });
  return data;
}
