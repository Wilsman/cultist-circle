import { describe, expect, it } from "vitest";
import {
  createItemLookupIndex,
  findRelatedRecipes,
  getCircleRestriction,
  getFleaLevelRequirement,
  getTraderBuyOffers,
  getTraderSellOffers,
  isExcludedFrom6hRewards,
  searchLookupItems,
  searchLookupPages,
  LOOKUP_PAGES,
} from "@/lib/item-lookup";
import {
  buildItemLookupUrl,
  readItemLookupParam,
} from "@/lib/item-lookup-link";
import type { Recipe } from "@/data/recipes";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

const item = (
  id: string,
  name: string,
  shortName: string,
  extra: Partial<SimplifiedItem> = {},
): SimplifiedItem => ({ id, name, shortName, basePrice: 1000, ...extra });

const items = [
  item("a1", "LEDX Skin Transilluminator mount", "LEDXM"),
  item("a2", "Lead plate", "Lead"),
  item("a3", "LEDX Skin Transilluminator", "LEDX"),
  item("a4", "Gas analyzer", "GasAn"),
  item("a5", "Physical Bitcoin", "0.2BTC"),
  item("a6", "Analyseur de gaz", "AnalGaz", {
    englishName: "Gas analyzer",
    englishShortName: "GasAn",
  }),
];
const index = createItemLookupIndex(items);

describe("searchLookupItems", () => {
  it("puts an exact short-name match first", () => {
    expect(searchLookupItems(index, "ledx")[0].id).toBe("a3");
    expect(searchLookupItems(index, "LEDX").map((i) => i.id)).toContain("a1");
  });

  it("matches English names for translated items", () => {
    const ids = searchLookupItems(index, "gasan").map((i) => i.id);
    expect(ids.slice(0, 2).sort()).toEqual(["a4", "a6"]);
  });

  it("tolerates partial words and typos", () => {
    expect(searchLookupItems(index, "gas an")[0].id).toBe("a4");
    expect(searchLookupItems(index, "bitcion").map((i) => i.id)).toContain(
      "a5",
    );
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchLookupItems(index, "   ")).toEqual([]);
    expect(searchLookupItems(index, "l", 2)).toHaveLength(2);
  });
});

describe("searchLookupPages", () => {
  it("matches page labels and keywords by prefix", () => {
    expect(searchLookupPages(LOOKUP_PAGES, "rec").map((p) => p.href)).toEqual([
      "/recipes",
    ]);
    expect(
      searchLookupPages(LOOKUP_PAGES, "changelog").map((p) => p.href),
    ).toEqual(["/updates"]);
  });
});

describe("trader offers", () => {
  const priced = item("b1", "Bolts", "Bolts", {
    sellFor: [
      { priceRUB: 900, vendor: { normalizedName: "prapor" } },
      { priceRUB: 50000, vendor: { normalizedName: "flea-market" } },
      { priceRUB: 1200, vendor: { normalizedName: "therapist" } },
    ],
    buyFor: [
      {
        priceRUB: 9000,
        vendor: { normalizedName: "mechanic", minTraderLevel: 3 },
      },
      { priceRUB: 100, vendor: { normalizedName: "flea-market" } },
      {
        priceRUB: 7000,
        vendor: { normalizedName: "jaeger", minTraderLevel: 2 },
      },
    ],
  });

  it("ranks sell offers best first and ignores the flea market", () => {
    expect(
      getTraderSellOffers(priced).map((o) => o.vendor.normalizedName),
    ).toEqual(["therapist", "prapor"]);
  });

  it("ranks buy offers cheapest first and keeps the loyalty level", () => {
    const [cheapest] = getTraderBuyOffers(priced);
    expect(cheapest.vendor).toEqual({
      normalizedName: "jaeger",
      minTraderLevel: 2,
    });
    expect(getTraderBuyOffers(priced)).toHaveLength(2);
  });
});

describe("getFleaLevelRequirement", () => {
  it("uses the highest category requirement", () => {
    // Stimulant (30) and Medikit (20)
    const stim = item("c1", "Stim", "Stim", {
      categories: ["5448f39d4bdc2d0a728b4568", "5448f3a64bdc2d60728b456a"],
    });
    expect(getFleaLevelRequirement(stim)).toBe(30);
    expect(getFleaLevelRequirement(item("c2", "Bolts", "Bolts"))).toBe(0);
  });
});

describe("circle restrictions", () => {
  const roubles = item("d1", "Roubles", "RUB");

  it("flags FAQ incompatible items ahead of user exclusions", () => {
    expect(getCircleRestriction(roubles, new Set(["roubles"]))).toBe(
      "incompatible",
    );
    expect(
      getCircleRestriction(
        item("d2", "Rublos", "RUB", { englishName: "Roubles" }),
        new Set(),
      ),
    ).toBe("incompatible");
  });

  it("reports user exclusions and leaves other items alone", () => {
    const bolts = item("d3", "Bolts", "Bolts");
    expect(getCircleRestriction(bolts, new Set(["bolts"]))).toBe("excluded");
    expect(getCircleRestriction(bolts, new Set())).toBeNull();
  });

  it("matches 6h exclusions, including prefix entries", () => {
    expect(isExcludedFrom6hRewards(items[2])).toBe(true);
    expect(
      isExcludedFrom6hRewards(
        item("d4", "Advanced current converter", "AdvCurConv"),
      ),
    ).toBe(true);
    expect(isExcludedFrom6hRewards(items[3])).toBe(false);
  });
});

describe("findRelatedRecipes", () => {
  const recipes = [
    {
      id: "r1",
      requiredItems: ["1x Gas analyzer"],
      craftingTime: "6h",
      producedItems: ["1x Physical Bitcoin"],
    },
    {
      id: "r2",
      requiredItems: ["2x Physical Bitcoin"],
      craftingTime: "12h",
      producedItems: [
        {
          type: "multiple_possible",
          items: ["1x Gas analyzer"],
          explanation: "",
        },
      ],
    },
  ] as Recipe[];

  it("finds input and pooled output matches, outputs first", () => {
    const matches = findRelatedRecipes(items[3], recipes);
    expect(matches.map((m) => [m.recipe.id, m.asInput, m.asOutput])).toEqual([
      ["r2", false, true],
      ["r1", true, false],
    ]);
  });

  it("matches translated items through their English name", () => {
    expect(findRelatedRecipes(items[5], recipes)).toHaveLength(2);
  });
});

describe("item lookup links", () => {
  it("round-trips an item id through the share URL", () => {
    const url = buildItemLookupUrl(
      "https://cultistcircle.com",
      "5447a9cd4bdc2dbd208b4567",
    );
    expect(url).toBe(
      "https://cultistcircle.com/?item=5447a9cd4bdc2dbd208b4567",
    );
    expect(readItemLookupParam(new URL(url).search)).toBe(
      "5447a9cd4bdc2dbd208b4567",
    );
  });

  it("ignores malformed ids", () => {
    expect(readItemLookupParam("?item=<script>")).toBeNull();
    expect(readItemLookupParam("?other=1")).toBeNull();
  });
});
