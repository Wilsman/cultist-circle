import { describe, expect, test } from "vitest";
import {
  parseState,
  solve,
  type LabTest,
  type Subject,
  type SubjectResult,
} from "@/lib/base-value-lab";
import {
  buildFillerOptions,
  cheapestOffer,
  gunVersion,
  partsValue,
  pickNextTest,
  sharedMultiplier,
  shortGunName,
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

  test("stripped guns list the parts to remove under a short name", () => {
    const [mp5] = parseState({
      version: 1,
      subjects: [
        {
          id: "mp5-bare",
          mode: "pve",
          name: "HK MP5 9x19 submachine gun (Navy 3 Round Burst)",
          kind: "weapon-bare",
          parts: [
            { name: "HK MP5 Navy style end cap", count: 1 },
            { name: "HK MP5 20-round 9x19 magazine" },
            { count: 2 },
          ],
        },
      ],
      tests: [],
    }).subjects;
    expect(gunVersion(mp5)).toMatchObject({
      name: "HK MP5 (Navy 3 Round Burst)",
      tag: "Stripped",
      partsLabel: "Remove all of these:",
      parts: [
        { name: "HK MP5 Navy style end cap", count: 1 },
        { name: "HK MP5 20-round 9x19 magazine", count: 1 },
      ],
    });
  });

  test("tells default presets and custom builds apart", () => {
    const base = { id: "g", mode: "pve" as const, kind: "weapon" as const };
    expect(
      gunVersion({ ...base, name: "TOZ-106 20ga bolt-action shotgun Default" }),
    ).toMatchObject({ name: "TOZ-106", tag: "Default", partsLabel: undefined });
    expect(
      gunVersion({
        ...base,
        name: "TOZ-106 + Scope",
        build: {
          gunItemId: "x",
          mods: [{ name: "Scope", count: 1 }],
        } as unknown as Subject["build"],
      }),
    ).toMatchObject({
      tag: "Custom build",
      partsLabel: "Attach only these:",
      parts: [{ name: "Scope", count: 1 }],
    });
    expect(
      gunVersion({ ...base, kind: "armour", name: "6B3TM" } as Subject),
    ).toBeNull();
    expect(shortGunName("Saiga-12K 12ga automatic shotgun")).toBe("Saiga-12K");
  });

  test("measures attached parts against the frame's API value", () => {
    const gun: Subject = {
      id: "mp5",
      mode: "pve",
      name: "HK MP5 Default",
      kind: "weapon",
      apiBaseValue: 40_000,
      frameValue: 10_000,
    };
    const result = (lo: number, hi: number): SubjectResult => ({
      subjectId: "mp5",
      range: { lo, hi },
      confirmed: { lo: 0, hi: Infinity },
      status: "open",
      testCount: 1,
      suspects: [],
    });
    expect(partsValue(gun)).toEqual({ frame: 10_000, apiParts: 30_000 });
    const a = partsValue(gun, result(100_000, 160_000));
    expect(a).toMatchObject({
      measured: { lo: 90_000, hi: 150_000 },
      multiplier: { lo: 3, hi: 5 },
    });
    const b = partsValue(gun, result(130_000, 190_000));
    expect(sharedMultiplier([a, b, null])).toEqual({ lo: 4, hi: 5 });
    const c = partsValue(gun, result(40_000, 70_000));
    expect(sharedMultiplier([a, c])).toBe("conflict");
    expect(partsValue({ ...gun, frameValue: undefined })).toBeNull();
  });

  test("never asks for a bare frame", () => {
    const subjects: Subject[] = [
      { id: "bare", mode: "pve", name: "Bare", kind: "weapon-bare", owned: 1 },
    ];
    expect(
      pickNextTest({
        subjects,
        results: solve(subjects, []),
        fillers: [],
        skip: new Set(),
        copyCost: () => 1_000,
      }),
    ).toBeNull();
  });
});
