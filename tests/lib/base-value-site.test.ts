import { describe, expect, test } from "vitest";
import { solve, type LabTest, type Subject } from "@/lib/base-value-lab";
import {
  buildFillerOptions,
  cheapestOffer,
  pickNextTest,
  type ShopItem,
} from "@/lib/base-value-site";

const shop = (over: Partial<ShopItem> & { id: string }): ShopItem => ({
  name: over.id,
  basePrice: 10_000,
  lastLowPrice: null,
  categories: [{ name: "Barter item" }],
  buyFor: [],
  ...over,
});

describe("Base Value Lab site helpers", () => {
  test("cheapest offer prefers the lower of trader and flea", () => {
    const item = shop({
      id: "a",
      lastLowPrice: 9_000,
      buyFor: [
        {
          priceRUB: 12_000,
          vendor: { normalizedName: "prapor", minTraderLevel: 2 },
        },
        { priceRUB: 8_000, vendor: { normalizedName: "flea-market" } },
      ],
    });
    expect(cheapestOffer(item)).toEqual({ cost: 9_000, source: "Flea" });
    expect(cheapestOffer(item, { flea: false })).toEqual({
      cost: 12_000,
      source: "Prapor LL2",
    });
  });

  test("fillers leave out guns, armour and keys", () => {
    const offer = [
      {
        priceRUB: 5_000,
        vendor: { normalizedName: "therapist", minTraderLevel: 1 },
      },
    ];
    const options = buildFillerOptions([
      shop({ id: "lamp", buyFor: offer }),
      shop({
        id: "gun",
        categories: [{ name: "Weapon" }, { name: "Assault rifle" }],
        buyFor: offer,
      }),
      shop({
        id: "key",
        categories: [{ name: "Key" }, { name: "Mechanical Key" }],
        buyFor: offer,
      }),
      shop({ id: "nobuy" }),
    ]);
    expect(options.map((o) => o.itemId)).toEqual(["lamp"]);
    expect(options[0]).toMatchObject({
      cost: 5_000,
      source: "Therapist LL1",
      owned: false,
    });
  });

  test("asks for untested items first and skips passed ones", () => {
    const subjects: Subject[] = [
      {
        id: "tested",
        mode: "pve",
        name: "Tested gun",
        kind: "weapon",
        apiBaseValue: 40_000,
        owned: 5,
      },
      {
        id: "new",
        mode: "pve",
        name: "New gun",
        kind: "weapon",
        apiBaseValue: 20_000,
        owned: 1,
      },
    ];
    const tests: LabTest[] = [
      {
        id: "t",
        mode: "pve",
        createdAt: "2026-01-01T00:00:00.000Z",
        entries: [{ subjectId: "tested", qty: 1 }],
        fillers: [],
        timer: "4h",
      },
    ];
    const fillers = buildFillerOptions(
      [1_000, 3_000, 7_000, 15_000, 30_000].map((v) =>
        shop({
          id: `f${v}`,
          basePrice: v,
          buyFor: [{ priceRUB: v, vendor: { normalizedName: "jaeger" } }],
        }),
      ),
    );
    const args = {
      subjects,
      results: solve(subjects, tests),
      fillers,
      copyCost: () => 50_000,
    };
    expect(pickNextTest({ ...args, skip: new Set() })?.subject.id).toBe("new");
    expect(pickNextTest({ ...args, skip: new Set(["new"]) })?.subject.id).toBe(
      "tested",
    );
  });
});
