/**
 * Maps original category names to their display aliases
 * Use this to change how category names appear in the UI without changing the underlying data
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  "Flyer": "Posters",
  // Add more aliases as needed
  // "Original": "Alias",
};

/**
 * Gets the display name for a category (alias if available, otherwise the original name)
 * @param category The original category name
 * @returns The display name to show in the UI
 */
export function getCategoryDisplayName(category: string): string {
  return CATEGORY_ALIASES[category] || category;
}

export const DEFAULT_EXCLUDED_CATEGORIES = new Set([
  "Ammo container",
  "Ammo",
  "Armor",
  "Armor Plate",
  "Armored equipment",
  "Chest rig",
  "Flyer",
  "Key",
  "Repair Kits",
  "Weapon",
]);

export const ALL_ITEM_CATEGORIES = [
  "Ammo container",
  "Ammo",
  "Armor",
  "Armor Plate",
  "Armored equipment",
  "Chest rig",
  "Flyer",
  "Key",
  "Repair Kits",
  "Weapon",
];
