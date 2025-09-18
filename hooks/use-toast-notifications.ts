"use client";

import { useState, useEffect, useCallback } from "react";
import { toast as sonnerToast } from "sonner";

interface Notification {
  id: string;
  title: string;
  description: string;
  version: string;
  type: "info" | "welcome" | "feature";
  createdAt: string;
}

interface ToastNotificationsState {
  shownNotifications: Set<string>;
  dismissedNotifications: Set<string>;
  currentVersion: string;
}

const NOTIFICATIONS_STORAGE_KEY = "cultist_toast_notifications";
const CURRENT_APP_VERSION = "2.1.2";

// NextItemHints explanation notification
const NEXT_ITEM_HINTS_NOTIFICATION: Notification = {
  id: "next-item-hints-explanation",
  title: "🚀 Smart Item Suggestions",
  description: `✨ Smart suggestions appear below empty slots! 🟢 → Copy as slot above 🟡 → Single item to reach threshold ⚫ → Other options`,
  version: CURRENT_APP_VERSION,
  type: "feature",
  createdAt: new Date().toISOString(),
};

// PVP Flea Market prices notification
const PVP_FLEA_MARKET_NOTIFICATION: Notification = {
  id: "pvp-flea-market-online",
  title: "🛒 PVP Flea Market Online",
  description: `PVP Flea Market prices are back online and can be used now! Make sure to have the correct prices set in the settings for accurate calculations.`,
  version: CURRENT_APP_VERSION,
  type: "info",
  createdAt: new Date().toISOString(),
};

// Collection of all available notifications (ordered by priority)
const AVAILABLE_NOTIFICATIONS = [NEXT_ITEM_HINTS_NOTIFICATION, PVP_FLEA_MARKET_NOTIFICATION];

export function useToastNotifications() {
  const [state, setState] = useState<ToastNotificationsState>({
    shownNotifications: new Set(),
    dismissedNotifications: new Set(),
    currentVersion: CURRENT_APP_VERSION,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if we're on a new version - reset shown status if version changed
        if (parsed.currentVersion !== CURRENT_APP_VERSION) {
          setState({
            shownNotifications: new Set(),
            dismissedNotifications: parsed.dismissedNotifications || new Set(),
            currentVersion: CURRENT_APP_VERSION,
          });
        } else {
          setState({
            shownNotifications: new Set(parsed.shownNotifications || []),
            dismissedNotifications: new Set(
              parsed.dismissedNotifications || []
            ),
            currentVersion: CURRENT_APP_VERSION,
          });
        }
      }
    } catch (error) {
      console.error(
        "Failed to load toast notifications from localStorage:",
        error
      );
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      const dataToStore = {
        shownNotifications: Array.from(state.shownNotifications),
        dismissedNotifications: Array.from(state.dismissedNotifications),
        currentVersion: state.currentVersion,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(dataToStore)
      );
    } catch (error) {
      console.error(
        "Failed to save toast notifications to localStorage:",
        error
      );
    }
  }, [state]);

  const dismissNotification = useCallback((notificationId: string) => {
    // Save individual dismissed notification to localStorage
    const dismissedNotificationsKey = "cultist_dismissed_notifications";
    const currentDismissed = JSON.parse(
      localStorage.getItem(dismissedNotificationsKey) || "[]"
    );
    
    if (!currentDismissed.includes(notificationId)) {
      const updatedDismissed = [...currentDismissed, notificationId];
      localStorage.setItem(
        dismissedNotificationsKey,
        JSON.stringify(updatedDismissed)
      );
    }

    setState((prev) => ({
      ...prev,
      dismissedNotifications: new Set([
        ...prev.dismissedNotifications,
        notificationId,
      ]),
      shownNotifications: new Set([...prev.shownNotifications, notificationId]),
    }));
  }, []);

  const showNotification = useCallback(
    (notification: Notification) => {
      // Skip if already dismissed or shown
      if (
        state.dismissedNotifications.has(notification.id) ||
        state.shownNotifications.has(notification.id)
      ) {
        return;
      }

      sonnerToast(notification.title, {
        description: notification.description,
        duration: 10000, // 10 seconds for feature explanations
        action: {
          label: "Got it!",
          onClick: () => dismissNotification(notification.id),
        },
        onDismiss: () => {
          dismissNotification(notification.id);
        },
      });

      // Mark as shown
      setState((prev) => ({
        ...prev,
        shownNotifications: new Set([
          ...prev.shownNotifications,
          notification.id,
        ]),
      }));
    },
    [
      state.dismissedNotifications,
      state.shownNotifications,
      dismissNotification,
    ]
  );

  const showNextItemHintsExplanation = useCallback(() => {
    showNotification(NEXT_ITEM_HINTS_NOTIFICATION);
  }, [showNotification]);

  const showPvpFleaMarketNotification = useCallback(() => {
    showNotification(PVP_FLEA_MARKET_NOTIFICATION);
  }, [showNotification]);

  // Auto-show notifications on app load (for new users or new versions)
  const triggerNewNotifications = useCallback(() => {
    // Get individual dismissed notifications from localStorage
    const dismissedNotificationsKey = "cultist_dismissed_notifications";
    const dismissedFromStorage = JSON.parse(
      localStorage.getItem(dismissedNotificationsKey) || "[]"
    );

    // Prevent multiple triggers in same session
    const hasTriggered = sessionStorage.getItem("notification_triggered");
    if (hasTriggered) return;

    // Find all notifications that should be shown
    const notificationsToShow = AVAILABLE_NOTIFICATIONS.filter(notification =>
      !dismissedFromStorage.includes(notification.id) &&
      !state.shownNotifications.has(notification.id) &&
      notification.version === CURRENT_APP_VERSION
    );

    if (notificationsToShow.length === 0) return;

    // Show all applicable notifications with staggered timing
    notificationsToShow.forEach((notification, index) => {
      setTimeout(() => {
        // Double-check before showing (in case state changed during timeout)
        const currentDismissed = JSON.parse(
          localStorage.getItem(dismissedNotificationsKey) || "[]"
        );
        if (
          !currentDismissed.includes(notification.id) &&
          !state.shownNotifications.has(notification.id)
        ) {
          showNotification(notification);
        }
      }, 3000 + (index * 1000)); // Stagger by 1 second each
    });

    // Mark as triggered to prevent future triggers in same session
    sessionStorage.setItem("notification_triggered", "true");
  }, [
    state.shownNotifications,
    showNotification,
  ]);


  // Reset all notifications (useful for testing or manual reset)
  const resetNotifications = useCallback(() => {
    setState({
      shownNotifications: new Set(),
      dismissedNotifications: new Set(),
      currentVersion: CURRENT_APP_VERSION,
    });
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    localStorage.removeItem("cultist_dismissed_notifications");
    sessionStorage.removeItem("notification_triggered");
  }, []);

  return {
    showNotification,
    dismissNotification,
    showNextItemHintsExplanation,
    showPvpFleaMarketNotification,
    triggerNewNotifications,
    resetNotifications,
    // Utility functions
    isDismissed: (id: string) => state.dismissedNotifications.has(id),
    isShown: (id: string) => state.shownNotifications.has(id),
    // For debugging
    state,
  };
}

export type { Notification };
