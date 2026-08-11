import { afterEach, describe, expect, it, vi } from "vitest";
import {
  disableRitualNotifications,
  enableRitualNotifications,
  notificationsEnabled,
  notificationsSupported,
  RITUAL_NOTIFICATION_PREFERENCE_KEY,
  showRitualNotification,
} from "@/lib/ritual-reminders";
import {
  RITUAL_TRACKER_SCHEMA_VERSION,
  type RitualRecord,
} from "@/types/ritual-tracker";

const originalNotification = Object.getOwnPropertyDescriptor(
  globalThis,
  "Notification",
);

function setNotification(permission: NotificationPermission) {
  const requestPermission = vi.fn().mockResolvedValue(permission);
  class MockNotification {
    static permission = permission;
    static requestPermission = requestPermission;
  }
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: MockNotification,
  });
  return requestPermission;
}

function overdueRitual(): RitualRecord {
  return {
    schemaVersion: RITUAL_TRACKER_SCHEMA_VERSION,
    id: "overdue",
    mode: "pvp",
    status: "active",
    startedAt: Date.now() - 7_200_000,
    endsAt: Date.now() - 3_600_000,
    durationMinutes: 60,
    completedAt: null,
    cancelledAt: null,
    notificationSentAt: Date.now() - 1_000,
    sacredBonus: 0,
    inputPriceSource: "lastLowPrice",
    sacrifices: [],
    rewards: [],
    totals: {
      baseValue: 0,
      inputCost: 0,
      rewardFleaValue: null,
      rewardTraderValue: null,
    },
    notes: "",
    createdAt: Date.now() - 7_200_000,
    updatedAt: Date.now(),
  };
}

afterEach(() => {
  if (originalNotification) {
    Object.defineProperty(globalThis, "Notification", originalNotification);
  } else {
    Reflect.deleteProperty(globalThis, "Notification");
  }
});

describe("ritual reminders", () => {
  it("handles browsers without notification support", async () => {
    Reflect.deleteProperty(globalThis, "Notification");

    expect(notificationsSupported()).toBe(false);
    await expect(enableRitualNotifications()).resolves.toBe("denied");
  });

  it("stores explicit opt-in only after permission is granted", async () => {
    const requestPermission = setNotification("granted");

    await expect(enableRitualNotifications()).resolves.toBe("granted");
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(notificationsEnabled()).toBe(true);
    expect(localStorage.getItem(RITUAL_NOTIFICATION_PREFERENCE_KEY)).toBe(
      "enabled",
    );

    disableRitualNotifications();
    expect(notificationsEnabled()).toBe(false);
  });

  it("does not repeat an overdue notification already recorded as sent", async () => {
    setNotification("granted");
    localStorage.setItem(RITUAL_NOTIFICATION_PREFERENCE_KEY, "enabled");

    await expect(showRitualNotification(overdueRitual())).resolves.toBe(false);
  });
});
