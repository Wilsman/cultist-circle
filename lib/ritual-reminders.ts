import { updateRitual } from "@/lib/ritual-tracker-db";
import type { RitualRecord } from "@/types/ritual-tracker";

export const RITUAL_NOTIFICATION_PREFERENCE_KEY =
  "cultist-circle-ritual-notifications";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsEnabled(): boolean {
  return (
    notificationsSupported() &&
    Notification.permission === "granted" &&
    localStorage.getItem(RITUAL_NOTIFICATION_PREFERENCE_KEY) === "enabled"
  );
}

export async function enableRitualNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    localStorage.setItem(RITUAL_NOTIFICATION_PREFERENCE_KEY, "enabled");
  }
  return permission;
}

export function disableRitualNotifications(): void {
  localStorage.removeItem(RITUAL_NOTIFICATION_PREFERENCE_KEY);
}

export async function showRitualNotification(
  ritual: RitualRecord,
): Promise<boolean> {
  if (!notificationsEnabled() || ritual.notificationSentAt) return false;

  const title = `${ritual.mode.toUpperCase()} ritual ready`;
  const body = ritual.sacrifices
    .map((item) => `${item.quantity}x ${item.shortName}`)
    .join(", ");

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register(
        "/ritual-notifications-sw.js",
        { scope: "/" },
      );
      await registration.showNotification(title, {
        body,
        icon: "/images/Cultist-Calulator.webp",
        tag: `cultist-circle-ritual-${ritual.id}`,
        data: { url: "/tracker" },
      });
    } else {
      new Notification(title, { body, icon: "/images/Cultist-Calulator.webp" });
    }
    await updateRitual(ritual.id, { notificationSentAt: Date.now() });
    return true;
  } catch (error) {
    console.warn("Unable to display ritual notification", error);
    return false;
  }
}

export async function requestPersistentTrackerStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist)
    return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
