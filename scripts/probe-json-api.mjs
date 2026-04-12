const BASE_URL = "https://json.tarkov.dev";
const PRIMARY_LANG = process.argv[2] ?? "fr";
const FALLBACK_LANG = "en";

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function translateValue(key, primary, fallback) {
  if (!key) {
    return undefined;
  }

  return primary[key] ?? fallback[key] ?? key;
}

function pickFirstKey(record) {
  const firstKey = Object.keys(record)[0];
  if (!firstKey) {
    throw new Error("Expected non-empty record");
  }

  return firstKey;
}

function summarizeTranslationEntries(translationMap, count = 8) {
  return Object.entries(translationMap)
    .slice(0, count)
    .map(([key, value]) => ({ key, value }));
}

function toCurrentShapeSample({
  item,
  itemCategories,
  traders,
  primaryTranslations,
  fallbackTranslations,
}) {
  return {
    id: item.id,
    name: translateValue(item.name, primaryTranslations, fallbackTranslations),
    shortName: translateValue(
      item.shortName,
      primaryTranslations,
      fallbackTranslations
    ),
    englishName: translateValue(
      item.name,
      fallbackTranslations,
      fallbackTranslations
    ),
    englishShortName: translateValue(
      item.shortName,
      fallbackTranslations,
      fallbackTranslations
    ),
    basePrice: item.basePrice,
    lastLowPrice: item.lastLowPrice,
    avg24hPrice: item.avg24hPrice,
    updated: item.updated,
    width: item.width,
    height: item.height,
    iconLink: item.iconLink,
    link: item.link,
    categories: item.categories,
    categories_display: item.categories.map((categoryId) => ({
      id: categoryId,
      name:
        translateValue(
          itemCategories[categoryId]?.name,
          primaryTranslations,
          fallbackTranslations
        ) ?? categoryId,
    })),
    categories_display_en: item.categories.map((categoryId) => ({
      id: categoryId,
      name:
        translateValue(
          itemCategories[categoryId]?.name,
          fallbackTranslations,
          fallbackTranslations
        ) ?? categoryId,
    })),
    buyFor: (item.buyFromTrader ?? []).map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: {
        normalizedName: traders[offer.trader]?.normalizedName ?? offer.trader,
        minTraderLevel: offer.minTraderLevel,
      },
    })),
    sellFor: (item.sellToTrader ?? []).map((offer) => ({
      priceRUB: offer.priceRUB,
      vendor: {
        normalizedName: traders[offer.trader]?.normalizedName ?? offer.trader,
      },
    })),
  };
}

async function main() {
  const [
    endpointIndex,
    regularItems,
    pveItems,
    englishTranslations,
    primaryTranslations,
    traders,
    barters,
    maps,
    tasks,
    hideout,
    crafts,
  ] = await Promise.all([
    fetchJson("/endpoints"),
    fetchJson("/regular/items"),
    fetchJson("/pve/items"),
    fetchJson(`/regular/items_${FALLBACK_LANG}`),
    fetchJson(`/regular/items_${PRIMARY_LANG}`),
    fetchJson("/regular/traders"),
    fetchJson("/regular/barters"),
    fetchJson("/regular/maps"),
    fetchJson("/regular/tasks"),
    fetchJson("/regular/hideout"),
    fetchJson("/regular/crafts"),
  ]);

  const firstRegularItemId = pickFirstKey(regularItems.data.items);
  const firstRegularItem = regularItems.data.items[firstRegularItemId];
  const traderItem =
    Object.values(regularItems.data.items).find(
      (item) =>
        Array.isArray(item.buyFromTrader) &&
        item.buyFromTrader.length > 0 &&
        Array.isArray(item.sellToTrader) &&
        item.sellToTrader.length > 0
    ) ?? firstRegularItem;
  const itemIdsWithBuyFromTrader = new Set(
    Object.values(regularItems.data.items)
      .filter((item) => (item.buyFromTrader ?? []).length > 0)
      .map((item) => item.id)
  );
  const barterItemIds = new Set(
    barters.data
      .map((offer) => offer.offeredItem?.item)
      .filter(Boolean)
  );
  const bartersWithoutDirectBuy = [...barterItemIds].filter(
    (itemId) => !itemIdsWithBuyFromTrader.has(itemId)
  );

  const summary = {
    probedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    requestedPrimaryLanguage: PRIMARY_LANG,
    endpointIndex: endpointIndex.data,
    repoMapping: {
      requiredNow: [
        "/regular/items",
        "/pve/items",
        "/regular/items_en",
        "/pve/items_en",
        `/regular/items_${PRIMARY_LANG}`,
        `/pve/items_${PRIMARY_LANG}`,
      ],
      optionalNow: ["/lang"],
      notUsedByCurrentRepo: [
        "/regular/maps",
        "/regular/tasks",
        "/regular/hideout",
        "/regular/crafts",
        "/regular/barters",
        "/regular/traders",
        "/status",
        "/regular/prices/{itemId}",
      ],
    },
    items: {
      regularItemCount: Object.keys(regularItems.data.items).length,
      pveItemCount: Object.keys(pveItems.data.items).length,
      itemCategoryCount: Object.keys(regularItems.data.itemCategories).length,
      handbookCategoryCount: Object.keys(regularItems.data.handbookCategories)
        .length,
      topLevelSections: Object.keys(regularItems.data),
      translationPathCount: regularItems.translations?.length ?? 0,
      translationPathSamples: (regularItems.translations ?? []).slice(0, 8),
      firstItemShape: {
        itemId: firstRegularItemId,
        keys: Object.keys(firstRegularItem),
        categoryIds: firstRegularItem.categories,
        categoryLookupSample:
          regularItems.data.itemCategories[firstRegularItem.categories[0] ?? ""],
      },
      traderItemShape: {
        itemId: traderItem.id,
        rawName: traderItem.name,
        rawShortName: traderItem.shortName,
        buyFromTraderSample: traderItem.buyFromTrader?.[0] ?? null,
        sellToTraderSample: traderItem.sellToTrader?.[0] ?? null,
        adaptedCurrentShapeSample: toCurrentShapeSample({
          item: traderItem,
          itemCategories: regularItems.data.itemCategories,
          traders: traders.data,
          primaryTranslations: primaryTranslations.data,
          fallbackTranslations: englishTranslations.data,
        }),
      },
      parityGaps: {
        directTraderOffersExposeBuyLimit: Object.values(
          regularItems.data.items
        ).some((item) =>
          (item.buyFromTrader ?? []).some((offer) =>
            Object.prototype.hasOwnProperty.call(offer, "buyLimit")
          )
        ),
        barterOfferCount: barters.data.length,
        barterItemCount: barterItemIds.size,
        barterItemsWithoutDirectBuyFromTraderCount:
          bartersWithoutDirectBuy.length,
        barterItemsWithoutDirectBuySample: bartersWithoutDirectBuy
          .slice(0, 8)
          .map((itemId) => ({
            itemId,
            rawName: regularItems.data.items[itemId]?.name ?? null,
          })),
      },
    },
    translations: {
      englishEntrySamples: summarizeTranslationEntries(englishTranslations.data),
      primaryEntrySamples: summarizeTranslationEntries(primaryTranslations.data),
      itemBaseNameIsTranslationKey:
        firstRegularItem.name !==
        translateValue(
          firstRegularItem.name,
          englishTranslations.data,
          englishTranslations.data
        ),
    },
    adjacentEndpointShapes: {
      maps: {
        topLevelSections: Object.keys(maps.data),
        translationPathCount: maps.translations?.length ?? 0,
      },
      tasks: {
        topLevelSections: Object.keys(tasks.data),
        translationPathCount: tasks.translations?.length ?? 0,
      },
      hideout: {
        recordCount: Object.keys(hideout.data).length,
        translationPathCount: hideout.translations?.length ?? 0,
      },
      crafts: {
        count: crafts.data.length,
        firstEntryKeys: Object.keys(crafts.data[0] ?? {}),
      },
      barters: {
        count: barters.data.length,
        firstEntryKeys: Object.keys(barters.data[0] ?? {}),
      },
      traders: {
        count: Object.keys(traders.data).length,
        firstTraderId: pickFirstKey(traders.data),
        firstTraderKeys: Object.keys(traders.data[pickFirstKey(traders.data)]),
        translationPathCount: traders.translations?.length ?? 0,
      },
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
