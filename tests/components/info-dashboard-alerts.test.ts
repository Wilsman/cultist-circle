import { describe, expect, it } from "vitest";

import { HOT_SACRIFICES } from "@/components/hot-sacrifices-panel";
import { NOTIFICATIONS } from "@/components/notification-panel";

describe("Info dashboard alerts", () => {
  it("features the new Black Division recipe", () => {
    const recipeNotification = NOTIFICATIONS.find(
      (notification) => notification.id === "black-division-dogtag-recipe",
    );

    expect(recipeNotification).toMatchObject({
      type: "warning",
      title: "Update: Black Division ritual may no longer work",
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

  it("disables the THOR hot sacrifice in every game mode", () => {
    const thorCombo = HOT_SACRIFICES.find((combo) => combo.id === "sas-thor");

    expect(thorCombo).toBeDefined();
    expect(thorCombo?.disabled).toBe(true);
  });
});
