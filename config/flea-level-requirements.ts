/**
 * Flea Market Level Requirements
 * 
 * Some items on the Flea Market are only purchasable once you reach a certain level.
 * This configuration supports:
 * 1. Category-level requirements (applies to all items in a category)
 * 2. Individual item requirements (overrides category requirements for specific items)
 * 
 * The filter can be toggled on/off and the player can input their current level
 * to automatically filter out items they don't have access to yet.
 */

export interface CategoryLevelRequirement {
  categoryId: string;
  categoryName: string; // For display/debugging purposes
  levelRequirement: number;
}

export interface ItemLevelRequirement {
  itemName: string; // English name of the item (case-insensitive matching)
  levelRequirement: number;
}

/**
 * Level requirements by category.
 * Categories not listed here are assumed to have no level requirement (accessible at any level).
 */
export const CATEGORY_LEVEL_REQUIREMENTS: CategoryLevelRequirement[] = [
  // Weapon Mods
  { categoryId: "55818af64bdc2d5b648b4570", categoryName: "Foregrip", levelRequirement: 20 },
  { categoryId: "55818b084bdc2d5b648b4571", categoryName: "Flashlight", levelRequirement: 25 },
  { categoryId: "55818b164bdc2ddc698b456c", categoryName: "Comb. tact. device", levelRequirement: 25 },
  { categoryId: "5448fe394bdc2d0d028b456c", categoryName: "Muzzle device", levelRequirement: 20 },
  { categoryId: "5448fe7a4bdc2d6f028b456b", categoryName: "Sights", levelRequirement: 25 },
  { categoryId: "55818a6f4bdc2db9688b456b", categoryName: "Charging handle", levelRequirement: 20 },
  { categoryId: "5448bc234bdc2d3c308b4569", categoryName: "Magazine", levelRequirement: 25 },
  { categoryId: "610720f290b75a49ff2e5e25", categoryName: "Cylinder Magazine", levelRequirement: 25 },
  { categoryId: "55818a594bdc2db9688b456a", categoryName: "Stock", levelRequirement: 20 },
  { categoryId: "5a74651486f7744e73386dd1", categoryName: "Auxiliary Mod", levelRequirement: 25 },
  { categoryId: "550aa4cd4bdc2dd8348b456c", categoryName: "Silencer", levelRequirement: 25 },
  
  // Weapons
  { categoryId: "5447b5f14bdc2d61278b4567", categoryName: "Assault rifle", levelRequirement: 25 },
  { categoryId: "5447b5fc4bdc2d87278b4567", categoryName: "Assault carbine", levelRequirement: 25 },
  { categoryId: "5447b6254bdc2dc3278b4568", categoryName: "Sniper rifle", levelRequirement: 20 },
  { categoryId: "5447bed64bdc2d97278b4568", categoryName: "Machinegun", levelRequirement: 25 },
  { categoryId: "5447b6194bdc2d67278b4567", categoryName: "Marksman rifle", levelRequirement: 25 },
  { categoryId: "5447b5e04bdc2d62278b4567", categoryName: "SMG", levelRequirement: 20 },
  
  // Throwables & Ammo
  { categoryId: "543be6564bdc2df4348b4568", categoryName: "Throwable weapon", levelRequirement: 25 },
  { categoryId: "543be5cb4bdc2deb348b4568", categoryName: "Ammo container", levelRequirement: 25 },
  
  // Medical
  { categoryId: "5448f3a64bdc2d60728b456a", categoryName: "Stimulant", levelRequirement: 30 },
  { categoryId: "5448f39d4bdc2d0a728b4568", categoryName: "Medikit", levelRequirement: 20 },
  { categoryId: "5448f3a14bdc2d27728b4569", categoryName: "Drug", levelRequirement: 20 },
  { categoryId: "57864c8c245977548867e7f1", categoryName: "Medical supplies", levelRequirement: 20 },
  
  // Keys
  { categoryId: "5c164d2286f774194c5e69fa", categoryName: "Keycard", levelRequirement: 30 },
  { categoryId: "5c99f98d86f7745c314214b3", categoryName: "Mechanical Key", levelRequirement: 25 },
  
  // Barter Items
  { categoryId: "590c745b86f7743cc433c5f2", categoryName: "Other", levelRequirement: 25 },
  { categoryId: "57864a66245977548f04a81f", categoryName: "Electronics", levelRequirement: 20 },
  { categoryId: "57864ee62459775490116fc1", categoryName: "Battery", levelRequirement: 20 },
  { categoryId: "5d650c3e815116009f6201d2", categoryName: "Fuel", levelRequirement: 20 },
  { categoryId: "57864e4c24597754843f8723", categoryName: "Lubricant", levelRequirement: 20 },
  { categoryId: "57864c322459775490116fbf", categoryName: "Household goods", levelRequirement: 20 },
  { categoryId: "57864a3d24597754843f8721", categoryName: "Jewelry", levelRequirement: 30 },
  
  // Gear
  { categoryId: "5448e53e4bdc2d60728b4567", categoryName: "Backpack", levelRequirement: 25 },
  { categoryId: "5448e5724bdc2ddf718b4568", categoryName: "Vis. observ. device", levelRequirement: 20 },
  { categoryId: "55802f3e4bdc2de7118b4584", categoryName: "Gear mod", levelRequirement: 30 },
  { categoryId: "5a341c4086f77401f2541505", categoryName: "Headwear", levelRequirement: 20 },
  { categoryId: "5795f317245977243854e041", categoryName: "Common container", levelRequirement: 25 },
  { categoryId: "5671435f4bdc2d96058b4569", categoryName: "Locking container", levelRequirement: 25 },
];

/**
 * Level requirements for individual items.
 * These take priority over category requirements.
 * Add items here that have specific level requirements different from their category.
 * 
 * Item names are matched case-insensitively against englishName, name, englishShortName, or shortName.
 */
export const ITEM_LEVEL_REQUIREMENTS: ItemLevelRequirement[] = [
  // High-value medical/electronics items
  { itemName: "Ledx Skin Transilluminator", levelRequirement: 35 },
  { itemName: "6-STEN-140-M Military Battery", levelRequirement: 40 },
  { itemName: "Greenbat Lithium Battery", levelRequirement: 35 },
  { itemName: "Gunpowder \"Eagle\"", levelRequirement: 30 },
  { itemName: "Gunpowder \"Hawk\"", levelRequirement: 30 },
  { itemName: "Graphics Card", levelRequirement: 40 },
  { itemName: "Military Circuit Board", levelRequirement: 35 },
  { itemName: "Military Power Filter", levelRequirement: 35 },
  { itemName: "Phased Array Element", levelRequirement: 40 },
  { itemName: "Tetriz Portable Game Console", levelRequirement: 35 },
  { itemName: "Uhf Rfid Reader", levelRequirement: 35 },
  { itemName: "Vpx Flash Storage Module", levelRequirement: 35 },
  { itemName: "Virtex Programmable Processor", levelRequirement: 35 },
  
  // Add more individual items as needed:
  // { itemName: "Item Name Here", levelRequirement: XX },
];

/**
 * Map of lowercase item name to level requirement for quick lookup
 */
export const ITEM_LEVEL_MAP = new Map<string, number>(
  ITEM_LEVEL_REQUIREMENTS.map((req) => [req.itemName.toLowerCase(), req.levelRequirement])
);

/**
 * Get the level requirement for a specific item by name
 * Returns undefined if no specific requirement exists (fall back to category)
 */
export function getItemLevelRequirement(itemName: string): number | undefined {
  return ITEM_LEVEL_MAP.get(itemName.toLowerCase());
}

/**
 * Check if a specific item is accessible at a given player level
 * Checks item-specific requirement first, returns undefined if no item-specific rule exists
 */
export function isItemAccessibleAtLevel(itemName: string, playerLevel: number): boolean | undefined {
  const requirement = getItemLevelRequirement(itemName);
  if (requirement === undefined) return undefined; // No item-specific rule
  return playerLevel >= requirement;
}

/**
 * Map of category ID to level requirement for quick lookup
 */
export const CATEGORY_LEVEL_MAP = new Map<string, number>(
  CATEGORY_LEVEL_REQUIREMENTS.map((req) => [req.categoryId, req.levelRequirement])
);

/**
 * Get the level requirement for a category ID
 * Returns 0 if no requirement exists (accessible at any level)
 */
export function getCategoryLevelRequirement(categoryId: string): number {
  return CATEGORY_LEVEL_MAP.get(categoryId) ?? 0;
}

/**
 * Check if a category is accessible at a given player level
 * Returns true if the player level meets or exceeds the requirement
 */
export function isCategoryAccessibleAtLevel(categoryId: string, playerLevel: number): boolean {
  const requirement = getCategoryLevelRequirement(categoryId);
  return playerLevel >= requirement;
}

/**
 * Get all categories that are inaccessible at a given player level
 */
export function getInaccessibleCategoriesAtLevel(playerLevel: number): string[] {
  return CATEGORY_LEVEL_REQUIREMENTS
    .filter((req) => playerLevel < req.levelRequirement)
    .map((req) => req.categoryId);
}

/**
 * Local storage key for player level setting
 */
export const PLAYER_LEVEL_KEY = "playerLevel";
export const USE_LEVEL_FILTER_KEY = "useLevelFilter";

/**
 * Default player level (max level, so no filtering by default)
 */
export const DEFAULT_PLAYER_LEVEL = 79;
export const DEFAULT_USE_LEVEL_FILTER = false;
