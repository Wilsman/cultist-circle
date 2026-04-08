import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchCombinedTarkovData,
  fetchMinimalTarkovData,
  fetchTarkovData,
  resetTarkovApiCachesForTests,
} from "@/hooks/use-tarkov-api";

const regularItemsResponse = {
  data: {
    items: {
      "item-regular": {
        id: "item-regular",
        name: "item-regular Name",
        shortName: "item-regular ShortName",
        normalizedName: "item-regular",
        description: "item-regular Description",
        updated: "2026-04-08T16:48:01.000Z",
        width: 1,
        height: 2,
        lastOfferCount: 10,
        iconLink: "https://assets.tarkov.dev/item-regular-icon.webp",
        link: "https://tarkov.dev/item/item-regular",
        basePrice: 100,
        lastLowPrice: 80,
        avg24hPrice: 120,
        categories: ["cat-weapon"],
        buyFromTrader: [
          {
            trader: "5a7c2eca46aef81a7ca2145d",
            price: 100,
            priceRUB: 100,
            currency: "RUB",
            currencyItem: "roubles",
            minTraderLevel: 2,
            taskUnlock: null,
          },
        ],
        sellToTrader: [
          {
            trader: "54cb50c76803fa8b248b4571",
            price: 40,
            priceRUB: 40,
            currency: "RUB",
            currencyItem: "roubles",
          },
        ],
      },
    },
    itemCategories: {
      "cat-weapon": {
        id: "cat-weapon",
        name: "cat-weapon Name",
        normalizedName: "weapon",
        parent: null,
        children: [],
      },
    },
  },
};

const pveItemsResponse = {
  data: {
    items: {
      "item-pve": {
        id: "item-pve",
        name: "item-pve Name",
        shortName: "item-pve ShortName",
        normalizedName: "item-pve",
        description: "item-pve Description",
        updated: "2026-04-08T16:48:01.000Z",
        width: 1,
        height: 1,
        lastOfferCount: 5,
        iconLink: "https://assets.tarkov.dev/item-pve-icon.webp",
        link: "https://tarkov.dev/item/item-pve",
        basePrice: 200,
        lastLowPrice: 150,
        avg24hPrice: 260,
        categories: ["cat-key"],
        buyFromTrader: [
          {
            trader: "54cb57776803fa99248b456e",
            price: 200,
            priceRUB: 200,
            currency: "RUB",
            currencyItem: "roubles",
            minTraderLevel: 1,
            taskUnlock: null,
          },
        ],
        sellToTrader: [
          {
            trader: "579dc571d53a0658a154fbec",
            price: 100,
            priceRUB: 100,
            currency: "RUB",
            currencyItem: "roubles",
          },
        ],
      },
    },
    itemCategories: {
      "cat-key": {
        id: "cat-key",
        name: "cat-key Name",
        normalizedName: "key",
        parent: null,
        children: [],
      },
    },
  },
};

const englishTranslations = {
  data: {
    "item-regular Name": "Regular Rifle",
    "item-regular ShortName": "RR",
    "cat-weapon Name": "Weapon",
    "item-pve Name": "PVE Key",
    "item-pve ShortName": "PK",
    "cat-key Name": "Key",
  },
};

const germanTranslations = {
  data: {
    "item-regular Name": "Regulares Gewehr",
    "item-regular ShortName": "RG",
    "cat-weapon Name": "Waffe",
    "item-pve Name": "PVE Schlussel",
    "item-pve ShortName": "PS",
    "cat-key Name": "Schlussel",
  },
};

function createMockResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}

function installJsonApiMock() {
  return vi.spyOn(global, "fetch" as never).mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith("/regular/items")) {
      return Promise.resolve(createMockResponse(regularItemsResponse));
    }
    if (url.endsWith("/pve/items")) {
      return Promise.resolve(createMockResponse(pveItemsResponse));
    }
    if (url.endsWith("/regular/items_en") || url.endsWith("/pve/items_en")) {
      return Promise.resolve(createMockResponse(englishTranslations));
    }
    if (url.endsWith("/regular/items_de") || url.endsWith("/pve/items_de")) {
      return Promise.resolve(createMockResponse(germanTranslations));
    }

    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

describe("use-tarkov-api JSON fetchers", () => {
  beforeEach(() => {
    resetTarkovApiCachesForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetchCombinedTarkovData calls JSON endpoints per language and caches results", async () => {
    const fetchMock = installJsonApiMock();

    await fetchCombinedTarkovData("de");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map((call) => String(call[0])).sort()).toEqual([
      "https://json.tarkov.dev/regular/items",
      "https://json.tarkov.dev/regular/items_en",
      "https://json.tarkov.dev/regular/items_de",
      "https://json.tarkov.dev/pve/items",
    ].sort());

    await fetchCombinedTarkovData("de");
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await fetchCombinedTarkovData("en");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test("fetchTarkovData returns localized items with stable category ids and trader names", async () => {
    installJsonApiMock();

    const pvp = await fetchTarkovData("regular", "de");
    expect(pvp.meta.mode).toBe("pvp");
    expect(pvp.items).toHaveLength(1);
    expect(pvp.items[0]).toMatchObject({
      id: "item-regular",
      name: "Regulares Gewehr",
      shortName: "RG",
      categories: ["cat-weapon"],
      categories_display: [{ id: "cat-weapon", name: "Waffe" }],
      categories_display_en: [{ id: "cat-weapon", name: "Weapon" }],
      buyFor: [
        {
          priceRUB: 100,
          vendor: {
            normalizedName: "mechanic",
            minTraderLevel: 2,
          },
        },
      ],
    });

    const pve = await fetchTarkovData("pve", "de");
    expect(pve.meta.mode).toBe("pve");
    expect(pve.items).toHaveLength(1);
    expect(pve.items[0]).toMatchObject({
      id: "item-pve",
      name: "PVE Schlussel",
      categories: ["cat-key"],
      categories_display: [{ id: "cat-key", name: "Schlussel" }],
      categories_display_en: [{ id: "cat-key", name: "Key" }],
      buyFor: [
        {
          priceRUB: 200,
          vendor: {
            normalizedName: "therapist",
            minTraderLevel: 1,
          },
        },
      ],
    });
  });

  test("fetchMinimalTarkovData returns localized categories and leaves missing buyLimit undefined", async () => {
    installJsonApiMock();

    const minimal = await fetchMinimalTarkovData("de");

    expect(minimal.pvpItems[0]).toMatchObject({
      id: "item-regular",
      name: "Regulares Gewehr",
      shortName: "RG",
      categories: [{ name: "Waffe" }],
      sellFor: [
        {
          priceRUB: 40,
          vendor: {
            normalizedName: "prapor",
          },
        },
      ],
      buyFor: [
        {
          priceRUB: 100,
          vendor: {
            normalizedName: "mechanic",
            minTraderLevel: 2,
          },
        },
      ],
    });
    expect(minimal.pvpItems[0].buyFor[0].vendor.buyLimit).toBeUndefined();
    expect(minimal.pveItems[0].categories).toEqual([{ name: "Schlussel" }]);
  });

  test("fetchMinimalTarkovData returns empty arrays on request failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(global, "fetch" as never).mockRejectedValue(new Error("boom"));

    const minimal = await fetchMinimalTarkovData("en");

    expect(minimal).toEqual({ pvpItems: [], pveItems: [] });
    expect(errorSpy).toHaveBeenCalled();
  });
});
