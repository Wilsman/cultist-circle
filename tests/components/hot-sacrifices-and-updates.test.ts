import { describe, expect, it } from "vitest";

import {
  HOT_SACRIFICES,
  comboLabel,
  comboSlotIngredients,
  findLoadedCombo,
  orderCombosForThreshold,
  sortCombosByCost,
  verifiedTotal,
} from "@/components/hot-sacrifices-panel";
import { NOTIFICATIONS } from "@/components/notification-panel";

const comboById = (id: string) => {
  const combo = HOT_SACRIFICES.find((candidate) => candidate.id === id);
  if (!combo) throw new Error(`Missing combo ${id}`);
  return combo;
};

describe("Update alerts", () => {
  it("features the Black Division recipe warning", () => {
    const recipeNotification = NOTIFICATIONS.find(
      (notification) => notification.id === "black-division-dogtag-recipe",
    );

    expect(recipeNotification).toMatchObject({
      type: "warning",
      title: "Black Division ritual may no longer work",
      priority: 0,
    });
  });

  it("removes retired priority notices", () => {
    const notificationIds = NOTIFICATIONS.map(
      (notification) => notification.id,
    );

    expect(notificationIds).not.toContain("tarkov-dev-api-issues");
    expect(notificationIds).not.toContain("new-figurine-recipes-round");
    expect(notificationIds).not.toContain("thor-hot-sacrifice-pvp-warning");
  });

  it("keeps standing notices out of the alerts list", () => {
    const notificationIds = NOTIFICATIONS.map(
      (notification) => notification.id,
    );

    expect(notificationIds).not.toContain("submit-recipe");
    expect(notificationIds).not.toContain("weapon-values-warning");
  });
});

describe("Hot sacrifices", () => {
  it("disables the THOR hot sacrifice in every game mode", () => {
    expect(comboById("sas-thor").disabled).toBe(true);
  });

  it("lists working hot sacrifices cheapest first, unpriced last", () => {
    const sorted = sortCombosByCost(HOT_SACRIFICES, {
      "5x-mp5": 300_000,
      "4x-mp5-diary": 200_000,
      "sas-thor": 1,
    });

    expect(sorted.map((combo) => combo.id).slice(0, 2)).toEqual([
      "4x-mp5-diary",
      "5x-mp5",
    ]);
    expect(sorted.some((combo) => combo.disabled)).toBe(false);
    expect(sorted).toHaveLength(
      HOT_SACRIFICES.filter((combo) => !combo.disabled).length,
    );
  });

  it("puts combos below the threshold after those that reach it", () => {
    const costs = { "3x-stm-saiga": 50_000, "5x-mp5": 300_000 };

    const at400k = orderCombosForThreshold(HOT_SACRIFICES, costs, 400_000);
    expect(at400k[0].id).toBe("5x-mp5");
    expect(at400k.at(-1)?.id).toBe("3x-stm-saiga");

    const at350k = orderCombosForThreshold(HOT_SACRIFICES, costs, 350_000);
    expect(at350k[0].id).toBe("3x-stm-saiga");
  });

  it("leaves the Labs card out of the G28 combo's slots", () => {
    expect(
      comboSlotIngredients(comboById("labs-g28")).map((item) => item.name),
    ).toEqual(["HK G28 7.62x51 marksman rifle Patrol"]);
    expect(comboSlotIngredients(comboById("4x-mp5-diary"))).toHaveLength(2);
  });

  it("labels combos with counts and their separator", () => {
    expect(comboLabel(comboById("4x-mp5-diary"))).toBe("4× MP5 + Diary");
    expect(comboLabel(comboById("labs-g28"))).toBe("Labs Card → G28");
  });

  it("detects a loaded combo only on an exact slot match", () => {
    const resolveId = (name: string) => name;
    const g28 = "HK G28 7.62x51 marksman rifle Patrol";
    const mp5 = comboSlotIngredients(comboById("4x-mp5-diary"))[0].name;
    const diary = comboSlotIngredients(comboById("4x-mp5-diary"))[1].name;

    expect(findLoadedCombo(HOT_SACRIFICES, [g28], resolveId)?.id).toBe(
      "labs-g28",
    );
    expect(
      findLoadedCombo(HOT_SACRIFICES, [diary, mp5, mp5, mp5, mp5], resolveId)
        ?.id,
    ).toBe("4x-mp5-diary");
    // An extra or missing item is no longer a tested combo.
    expect(findLoadedCombo(HOT_SACRIFICES, [g28, diary], resolveId)).toBeNull();
    expect(
      findLoadedCombo(HOT_SACRIFICES, [mp5, mp5, mp5, diary], resolveId),
    ).toBeNull();
    expect(findLoadedCombo(HOT_SACRIFICES, [], resolveId)).toBeNull();
  });

  it("raises the total to a verified combo's tested value", () => {
    const g28 = comboById("labs-g28");
    expect(verifiedTotal(163_790, g28)).toBe(g28.minBaseValue);
    expect(verifiedTotal(450_000, g28)).toBe(450_000);
    expect(verifiedTotal(163_790, null)).toBe(163_790);
  });
});
