import { describe, expect, it } from "vitest";

import { HOT_SACRIFICES } from "@/components/hot-sacrifices-panel";
import { NOTIFICATIONS } from "@/components/notification-panel";

describe("Info dashboard alerts", () => {
  it("features the new Black Division recipe", () => {
    const recipeNotification = NOTIFICATIONS.find(
      (notification) => notification.id === "black-division-dogtag-recipe",
    );

    expect(recipeNotification).toMatchObject({
      type: "success",
      title: "New Ritual Discovered: Black Division",
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

  it("marks the THOR hot sacrifice as unavailable in PVP but working in PVE", () => {
    const thorCombo = HOT_SACRIFICES.find((combo) => combo.id === "sas-thor");

    expect(thorCombo).toBeDefined();
    expect(thorCombo?.availabilityNote).toContain("PVP");
    expect(thorCombo?.availabilityNote).toContain("PVE still works");
  });
});
