import type { SimplifiedItem } from "@/types/SimplifiedItem";

/**
 * Items whose special recipe fires whenever they are anywhere in the circle.
 * The ritual then ignores the threshold, so every other item is consumed for
 * nothing. Auto Select and suggestions must never pick these.
 */
export const RECIPE_OVERRIDE_ITEM_NAMES: readonly string[] = [
  "Mazoni golden dumbbell",
];

const OVERRIDE_NAMES_LOWER = new Set(
  RECIPE_OVERRIDE_ITEM_NAMES.map((name) => name.toLowerCase()),
);

export function isRecipeOverrideItem(
  item: Pick<SimplifiedItem, "name" | "englishName">,
): boolean {
  return [item.name, item.englishName].some(
    (name) => !!name && OVERRIDE_NAMES_LOWER.has(name.toLowerCase()),
  );
}
