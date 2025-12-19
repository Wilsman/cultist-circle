"use client";

import { useMemo } from "react";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { HOT_SACRIFICES } from "@/components/hot-sacrifices-panel";

export interface DynamicNotification {
  id: string;
  type:
    | "success"
    | "warning"
    | "info"
    | "halloween"
    | "hot-sacrifice"
    | "weapon-warning";
  priority: number;
  title: string;
  description: string | React.ReactNode;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

export function useDynamicNotifications(selectedItems: SimplifiedItem[]) {
  return useMemo(() => {
    const notifications: DynamicNotification[] = [];

    // Check for hot sacrifice patterns
    const hotSacrificeNotifications = detectHotSacrificePatterns(selectedItems);
    notifications.push(...hotSacrificeNotifications);

    // Check for weapon warnings
    const weaponWarning = detectWeaponWarnings(selectedItems);
    if (weaponWarning) {
      notifications.push(weaponWarning);
    }

    // Sort by priority (lower number = higher priority)
    return notifications.sort((a, b) => a.priority - b.priority);
  }, [selectedItems]);
}

function detectHotSacrificePatterns(
  selectedItems: SimplifiedItem[]
): DynamicNotification[] {
  const notifications: DynamicNotification[] = [];

  // Create a map of selected items for easier lookup
  const selectedItemMap = new Map<string, number>();
  selectedItems.forEach((item) => {
    const key = item.shortName || item.name;
    selectedItemMap.set(key, (selectedItemMap.get(key) || 0) + 1);
  });

  HOT_SACRIFICES.forEach((combo) => {
    const isMatch = combo.ingredients.every((ingredient) => {
      const selectedCount =
        selectedItemMap.get(ingredient.shortName || ingredient.name) || 0;
      return selectedCount >= ingredient.count;
    });

    if (isMatch) {
      notifications.push({
        id: `hot-sacrifice-${combo.id}`,
        type: "hot-sacrifice",
        priority: 1,
        title: "🔥 Hot Sacrifice Pattern Detected!",
        description: (
          <div>
            <p className="mb-2">
              Your selection matches the{" "}
              <span className="font-semibold text-indigo-300">
                {combo.resultText}
              </span>{" "}
              community recipe!
            </p>
            <p className="text-xs text-slate-400">
              Check the Hot Sacrifices tab for more community-tested recipes
              like this one.
            </p>
          </div>
        ),
        actions: [
          {
            label: "View Hot Sacrifices",
            action: () => {
              // Scroll to hot sacrifices section
              const element = document.querySelector("[data-hot-sacrifices]");
              element?.scrollIntoView({ behavior: "smooth", block: "center" });
            },
          },
        ],
      });
    }
  });

  return notifications;
}

function detectWeaponWarnings(
  selectedItems: SimplifiedItem[]
): DynamicNotification | null {
  const weapons = selectedItems.filter(
    (item) =>
      item.categories?.includes("5422acb9af1c889c16000029") || // Weapon category ID
      item.categories_display?.some((cat) => cat.name === "Weapon") ||
      item.categories_display_en?.some((cat) => cat.name === "Weapon")
  );

  if (weapons.length > 0) {
    return {
      id: "weapon-base-value-warning",
      type: "weapon-warning",
      priority: 2,
      title: "⚠️ Weapon Base Values - Work in Progress",
      description: (
        <div>
          <p className="mb-2">
            Weapon base values may be inaccurate due to durability variations
            and attached weapon parts.
          </p>
          <p className="text-xs text-red-400 mb-2">
            Current weapons:{" "}
            {weapons.map((w) => w.shortName || w.name).join(", ")}
          </p>
          <p className="text-xs">
            Consider using the{" "}
            <a
              href="/base-values"
              className="underline hover:text-amber-300 transition-colors font-semibold"
            >
              Base Values lookup
            </a>{" "}
            page for verification.
          </p>
        </div>
      ),
    };
  }

  return null;
}
