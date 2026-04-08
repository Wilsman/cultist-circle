/**
 * Flea Market Level Requirements
 * 
 * Level requirements are now fetched dynamically from the Tarkov Dev API
 * via the `minLevelForFlea` field on each item. This file now only contains
 * constants for localStorage keys and default values.
 * 
 * The filter can be toggled on/off and the player can input their current level
 * to automatically filter out items they don't have access to yet.
 */

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
