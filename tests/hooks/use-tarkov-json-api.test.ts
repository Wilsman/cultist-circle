import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchMinimalTarkovData,
  fetchTarkovData,
  resetTarkovApiCachesForTests,
  resetTarkovApiRetryStateForTests,
} from "@/hooks/use-tarkov-api";
import { SUPPORTED_LANGUAGES } from "@/contexts/language-context";

const originalDataSource = process.env.NEXT_PUBLIC_TARKOV_DATA_SOURCE;

const itemResponse = {
  data: {
    items: {
      item1: {
        id: "item1",
        name: "item1 Name",
        shortName: "item1 ShortName",
        basePrice: 100,
        lastLowPrice: null,
        avg24hPrice: 150,
        updated: "2026-07-10T00:00:00.000Z",
        width: 2,
        height: 1,
        lastOfferCount: 12,
        iconLink: "https://assets.tarkov.dev/item1-icon.webp",
        link: "https://tarkov.dev/item/test-item",
        categories: ["cat1"],
        buyFromTrader: [
          {
            trader: "trader1",
            priceRUB: 110,
            minTraderLevel: 2,
            buyLimit: 3,
          },
        ],
        sellToTrader: [{ trader: "trader1", priceRUB: 90 }],
      },
    },
    itemCategories: {
      cat1: {
        id: "cat1",
        name: "cat1 Name",
        normalizedName: "barter-item",
      },
    },
  },
  translations: ["$.data.items.*.name", "$.data.itemCategories.*.name"],
};

const englishResponse = {
  data: {
    "item1 Name": "Test Item",
    "item1 ShortName": "Item",
    "cat1 Name": "Barter item",
  },
};

const germanResponse = {
  data: {
    "item1 Name": "Testgegenstand",
    "item1 ShortName": "Gegenstand",
    "cat1 Name": "Tauschgegenstand",
  },
};

const traderResponse = {
  data: {
    trader1: {
      id: "trader1",
      normalizedName: "mechanic",
      name: "trader1 Nickname",
    },
  },
};

const response = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  }) as Response;

function installJsonFetchMock(
  options: {
    germanStatus?: number;
    germanBody?: { data: Record<string, string> };
  } = {},
) {
  return vi.spyOn(global, "fetch" as any).mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/regular/items")) return response(itemResponse);
    if (url.endsWith("/regular/items_en")) return response(englishResponse);
    if (url.endsWith("/regular/items_de")) {
      return response(
        options.germanBody ?? germanResponse,
        options.germanStatus ?? 200,
      );
    }
    if (url.endsWith("/regular/traders")) return response(traderResponse);
    if (url.endsWith("/pvp-season/items")) return response(itemResponse);
    if (url.endsWith("/pvp-season/items_en")) return response(englishResponse);
    if (url.endsWith("/pvp-season/items_de")) {
      return response(
        options.germanBody ?? germanResponse,
        options.germanStatus ?? 200,
      );
    }
    if (url.endsWith("/pvp-season/traders")) return response(traderResponse);
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe("Tarkov.dev JSON fetchers", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TARKOV_DATA_SOURCE = "json";
    resetTarkovApiCachesForTests();
    resetTarkovApiRetryStateForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalDataSource === undefined) {
      delete process.env.NEXT_PUBLIC_TARKOV_DATA_SOURCE;
    } else {
      process.env.NEXT_PUBLIC_TARKOV_DATA_SOURCE = originalDataSource;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("localizes the selected mode and reuses base resources across languages", async () => {
    const fetchMock = installJsonFetchMock();

    const english = await fetchTarkovData("regular", "en");
    const german = await fetchTarkovData("regular", "de");

    expect(english.items[0]).toMatchObject({
      id: "item1",
      name: "Test Item",
      shortName: "Item",
      categories: ["cat1"],
      categories_display: [{ id: "cat1", name: "Barter item" }],
      buyFor: [
        {
          priceRUB: 110,
          vendor: { normalizedName: "mechanic", minTraderLevel: 2 },
        },
      ],
    });
    expect(english.items[0].lastLowPrice).toBeUndefined();
    expect(german.items[0]).toMatchObject({
      name: "Testgegenstand",
      shortName: "Gegenstand",
      categories_display: [{ id: "cat1", name: "Tauschgegenstand" }],
    });
    expect(german.meta.mode).toBe("pvp");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.filter((url) => url.endsWith("/regular/items"))).toHaveLength(
      1,
    );
    expect(
      urls.filter((url) => url.endsWith("/regular/items_en")),
    ).toHaveLength(1);
    expect(
      urls.filter((url) => url.endsWith("/regular/items_de")),
    ).toHaveLength(1);
    expect(urls.filter((url) => url.endsWith("/regular/traders"))).toHaveLength(
      1,
    );
    expect(urls.some((url) => url.includes("/pve/"))).toBe(false);
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.cache === "no-cache"),
    ).toBe(true);
  });

  test("falls back to English when the requested translation file fails", async () => {
    const fetchMock = installJsonFetchMock({ germanStatus: 503 });

    const result = await fetchTarkovData("regular", "de");

    expect(result.items[0]).toMatchObject({
      name: "Test Item",
      shortName: "Item",
      categories_display: [{ id: "cat1", name: "Barter item" }],
    });
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes("graphql")),
    ).toBe(false);
  });

  test("falls back to English for individual missing translation keys", async () => {
    installJsonFetchMock({
      germanBody: {
        data: {
          "item1 Name": "Testgegenstand",
        },
      },
    });

    const result = await fetchTarkovData("regular", "de");

    expect(result.items[0]).toMatchObject({
      name: "Testgegenstand",
      shortName: "Item",
      categories_display: [{ id: "cat1", name: "Barter item" }],
    });
  });

  test("returns minimal items for only the requested mode", async () => {
    const fetchMock = installJsonFetchMock();

    const items = await fetchMinimalTarkovData("regular", "de");

    expect(items).toEqual([
      expect.objectContaining({
        id: "item1",
        name: "Testgegenstand",
        categories: [{ name: "Tauschgegenstand" }],
        sellFor: [{ priceRUB: 90, vendor: { normalizedName: "mechanic" } }],
        buyFor: [
          {
            priceRUB: 110,
            vendor: {
              normalizedName: "mechanic",
              minTraderLevel: 2,
              buyLimit: 3,
            },
          },
        ],
      }),
    ]);
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes("/pve/")),
    ).toBe(false);
  });

  test("loads Season from its dedicated JSON resources", async () => {
    const fetchMock = installJsonFetchMock();

    const result = await fetchTarkovData("pvp-season", "de");

    expect(result.meta.mode).toBe("season");
    expect(result.items[0]).toMatchObject({
      name: "Testgegenstand",
      shortName: "Gegenstand",
    });
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/pvp-season\/items$/),
        expect.stringMatching(/\/pvp-season\/items_en$/),
        expect.stringMatching(/\/pvp-season\/items_de$/),
        expect.stringMatching(/\/pvp-season\/traders$/),
      ]),
    );
    expect(urls.some((url) => url.includes("/regular/"))).toBe(false);
  });

  test("does not fall back to regular GraphQL data when Season JSON fails", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/pvp-season/items")) return response({}, 404);
        if (url.endsWith("/pvp-season/items_en")) {
          return response(englishResponse);
        }
        if (url.endsWith("/pvp-season/traders")) {
          return response(traderResponse);
        }
        throw new Error(`Unexpected request: ${url}`);
      });

    await expect(fetchTarkovData("pvp-season", "en")).rejects.toThrow(
      /pvp-season\/items/,
    );
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes("graphql")),
    ).toBe(false);
  });

  test("falls back to GraphQL when a required JSON resource fails", async () => {
    const graphqlResponse = {
      data: {
        pvpItems: [
          {
            id: "fallback",
            name: "GraphQL fallback",
            shortName: "Fallback",
            basePrice: 200,
            lastLowPrice: null,
            avg24hPrice: null,
            updated: "2026-07-10T00:00:00.000Z",
            width: 1,
            height: 1,
            lastOfferCount: 0,
            iconLink: "",
            link: "",
            categories: [],
            buyFor: [],
          },
        ],
        pveItems: [],
      },
    };
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.endsWith("/regular/items")) return response({}, 404);
        if (url.endsWith("/regular/items_en")) return response(englishResponse);
        if (url.endsWith("/regular/traders")) return response(traderResponse);
        if (url.includes("graphql") && init?.method === "POST") {
          return response(graphqlResponse);
        }
        throw new Error(`Unexpected request: ${url}`);
      });

    const result = await fetchTarkovData("regular", "en");

    expect(result.items[0].name).toBe("GraphQL fallback");
    expect(
      fetchMock.mock.calls.filter(
        ([input, init]) =>
          String(input).includes("graphql") && init?.method === "POST",
      ),
    ).toHaveLength(1);
  });

  test("all application languages are supported by the JSON API", () => {
    const jsonApiLanguages = new Set([
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

    expect(
      SUPPORTED_LANGUAGES.every(({ code }) => jsonApiLanguages.has(code)),
    ).toBe(true);
  });
});
