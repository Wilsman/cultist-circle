import categoriesJson from "./categories-ids.json";

export interface ItemCategory {
  id: string;
  name: string;
}

interface CategoriesJsonShape {
  data?: {
    itemCategories?: ItemCategory[];
  };
}

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
 */
export function getCategoryDisplayName(originalName: string): string {
  return CATEGORY_ALIASES[originalName] || originalName;
}

export function getCategoryNameById(id: string): string | undefined {
  const found = CATEGORY_BY_ID.get(id);
  return found ? getCategoryDisplayName(found.name) : undefined;
}

// Flatten JSON into a simple array of { id, name }
const JSON_DATA = categoriesJson as CategoriesJsonShape;
const RAW_CATEGORIES: ItemCategory[] = JSON_DATA.data?.itemCategories ?? [];

export const ALL_ITEM_CATEGORIES: ItemCategory[] = RAW_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
}));

export const CATEGORY_BY_ID = new Map<string, ItemCategory>(
  ALL_ITEM_CATEGORIES.map((c) => [c.id, c])
);

export const CATEGORY_ID_BY_NAME = new Map<string, string>(
  ALL_ITEM_CATEGORIES.map((c) => [c.name, c.id])
);

// Back-compat: original defaults were English names. Map them to IDs.
const DEFAULT_NAMES = [
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

export const DEFAULT_EXCLUDED_CATEGORY_IDS = new Set(
  DEFAULT_NAMES
    .map((name) => CATEGORY_ID_BY_NAME.get(name))
    .filter((id): id is string => Boolean(id))
);
