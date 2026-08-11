import { beforeEach, describe, expect, it } from "vitest";
import {
  applyTrackedItemLineCost,
  calculateTrackerInsights,
  formatCountdown,
  getCombinationKey,
  getSuggestedRitualDurations,
  isRitualReady,
  loadRitualCombinationIntoStorage,
} from "@/lib/ritual-tracker";
import {
  ActiveRitualExistsError,
  clearRitualHistory,
  listRituals,
  mergeRituals,
  startRitual,
  updateRitual,
} from "@/lib/ritual-tracker-db";
import {
  createRitualCalendar,
  createTrackerBackup,
  createTrackerCsv,
  importTrackerBackup,
  parseTrackerBackup,
} from "@/lib/ritual-tracker-export";
import { GAME_MODE_STORAGE_KEY } from "@/lib/game-mode";
import { SELECTED_ITEM_IDS_STORAGE_KEY } from "@/lib/persisted-selected-items";
import {
  RITUAL_TRACKER_SCHEMA_VERSION,
  type RitualRecord,
  type TrackedItemSnapshot,
} from "@/types/ritual-tracker";

function item(
  id: string,
  quantity = 1,
  values: {
    input?: number | null;
    flea?: number | null;
    trader?: number | null;
  } = {},
): TrackedItemSnapshot {
  return {
    key: id,
    itemId: id,
    name: `Item ${id}`,
    shortName: id,
    quantity,
    basePrice: 100_000,
    lastLowPrice: values.flea === undefined ? 80_000 : values.flea,
    avg24hPrice: 82_000,
    traderSellPrice: values.trader === undefined ? 60_000 : values.trader,
    inputPrice: values.input === undefined ? 50_000 : values.input,
    isManual: false,
  };
}

function ritual(
  id: string,
  overrides: Partial<RitualRecord> = {},
): RitualRecord {
  const startedAt = 1_800_000_000_000;
  return {
    schemaVersion: RITUAL_TRACKER_SCHEMA_VERSION,
    id,
    mode: "pvp",
    status: "active",
    startedAt,
    endsAt: startedAt + 6 * 60 * 60_000,
    durationMinutes: 360,
    completedAt: null,
    cancelledAt: null,
    notificationSentAt: null,
    sacredBonus: 0,
    inputPriceSource: "lastLowPrice",
    sacrifices: [item("a", 2)],
    rewards: [],
    totals: {
      baseValue: 400_000,
      inputCost: 100_000,
      rewardFleaValue: null,
      rewardTraderValue: null,
    },
    notes: "",
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
}

describe("ritual tracker durations and status", () => {
  it.each([
    [0, [120]],
    [10_001, [180]],
    [25_001, [240]],
    [50_001, [300]],
    [100_001, [480]],
    [200_001, [720]],
    [350_001, [840]],
    [400_000, [360, 840]],
  ])("suggests the expected duration at %i", (value, expected) => {
    expect(getSuggestedRitualDurations(value)).toEqual(expected);
  });

  it("derives ready state from the absolute completion time", () => {
    const record = ritual("ready");
    expect(isRitualReady(record, record.endsAt - 1)).toBe(false);
    expect(isRitualReady(record, record.endsAt)).toBe(true);
    expect(formatCountdown(0)).toBe("Ready");
  });
});

describe("sacrifice cost overrides", () => {
  it("stores an edited line total as the average unit cost", () => {
    const adjusted = applyTrackedItemLineCost(item("scope", 3), 270_000);

    expect(adjusted.inputPrice).toBe(90_000);
  });

  it("supports items already owned at zero cost", () => {
    const adjusted = applyTrackedItemLineCost(item("owned", 2), 0);

    expect(adjusted.inputPrice).toBe(0);
  });
});

describe("ritual tracker database", () => {
  beforeEach(async () => {
    await clearRitualHistory();
  });

  it("allows one active ritual per mode and unlimited completed history", async () => {
    await startRitual(ritual("pvp-active"));
    await startRitual(ritual("pve-active", { mode: "pve" }));

    await expect(startRitual(ritual("pvp-second"))).rejects.toBeInstanceOf(
      ActiveRitualExistsError,
    );

    await updateRitual("pvp-active", {
      status: "completed",
      completedAt: Date.now(),
    });
    await startRitual(ritual("pvp-new"));
    expect(await listRituals()).toHaveLength(3);
  });

  it("keeps import atomic when an active mode conflicts", async () => {
    await startRitual(ritual("existing"));
    const completed = ritual("completed", {
      status: "completed",
      completedAt: Date.now(),
    });

    await expect(
      mergeRituals([completed, ritual("conflict")]),
    ).rejects.toBeInstanceOf(ActiveRitualExistsError);
    expect((await listRituals()).map((record) => record.id)).toEqual([
      "existing",
    ]);
  });

  it("validates and merges a versioned backup", async () => {
    const backup = createTrackerBackup([
      ritual("completed", {
        status: "completed",
        completedAt: Date.now(),
      }),
    ]);
    expect(parseTrackerBackup(backup)).toEqual(backup);
    expect(await importTrackerBackup(backup)).toBe(1);
    expect(await listRituals()).toHaveLength(1);
    expect(() => parseTrackerBackup({ ...backup, version: 99 })).toThrow();
  });
});

describe("ritual tracker insights and exports", () => {
  const win = ritual("win", {
    status: "completed",
    completedAt: 1_800_000_100_000,
    rewards: [item("reward", 2, { flea: 100_000, trader: 70_000 })],
    totals: {
      baseValue: 400_000,
      inputCost: 100_000,
      rewardFleaValue: 200_000,
      rewardTraderValue: 140_000,
    },
  });
  const incomplete = ritual("incomplete", {
    status: "completed",
    completedAt: 1_800_000_200_000,
    rewards: [item("unknown", 1, { flea: null, trader: null })],
    totals: {
      baseValue: 400_000,
      inputCost: 100_000,
      rewardFleaValue: null,
      rewardTraderValue: null,
    },
  });

  it("calculates ROI only from fully priced rituals without treating missing values as zero", () => {
    const insights = calculateTrackerInsights([win, incomplete], "flea");
    expect(insights.completedCount).toBe(2);
    expect(insights.pricedCount).toBe(1);
    expect(insights.netReturn).toBe(100_000);
    expect(insights.averageRoi).toBe(100);
    expect(insights.profitableRate).toBe(100);
    expect(insights.topRewards[0]).toMatchObject({
      key: "reward",
      quantity: 2,
    });
  });

  it("separates combination keys by mode, quantities, and sacred bonus", () => {
    expect(getCombinationKey(win)).not.toBe(
      getCombinationKey({ ...win, mode: "pve" }),
    );
    expect(getCombinationKey(win)).not.toBe(
      getCombinationKey({ ...win, sacredBonus: 25 }),
    );
    expect(getCombinationKey(win)).not.toBe(
      getCombinationKey({ ...win, sacrifices: [item("a", 1)] }),
    );
  });

  it("loads duplicate item slots and the saved Season mode into calculator storage", () => {
    const season = { ...win, mode: "season" as const };
    const slots = loadRitualCombinationIntoStorage(season, localStorage);
    expect(slots).toEqual(["a", "a", null, null, null]);
    expect(localStorage.getItem(GAME_MODE_STORAGE_KEY)).toBe("season");
    expect(
      JSON.parse(localStorage.getItem(SELECTED_ITEM_IDS_STORAGE_KEY)!),
    ).toEqual(slots);
  });

  it("creates escaped CSV and a UTC calendar reminder", () => {
    const record = { ...win, notes: 'quoted, "note"' };
    const csv = createTrackerCsv([record]);
    expect(csv).toContain('"quoted, ""note"""');
    const calendar = createRitualCalendar(record);
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain(`UID:${record.id}@cultistcircle.com`);
    expect(calendar).toContain("TRIGGER:PT0M");
    expect(calendar).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });
});
