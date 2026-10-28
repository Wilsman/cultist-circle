/** Limits a recipe (and its community reports) to one game mode. */
export type RecipeModeRestriction = "pvp-only" | "season-only";

/** The only game mode a restricted recipe can be reported for. */
export const RESTRICTED_RECIPE_MODE = {
  "pvp-only": "pvp",
  "season-only": "season",
} as const satisfies Record<RecipeModeRestriction, string>;
