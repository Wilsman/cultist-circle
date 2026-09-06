// Helpers for shareable recipe deep links (e.g. /recipes?recipe=recipe-abc123)

export const RECIPE_SHARE_PARAM = "recipe";

/**
 * Builds an absolute share URL pointing at a single recipe.
 */
export function buildRecipeShareUrl(
  origin: string,
  pathname: string,
  recipeId: string,
): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${cleanOrigin}${cleanPath}?${RECIPE_SHARE_PARAM}=${encodeURIComponent(recipeId)}`;
}

type KnownRecipeIdChecker =
  | Set<string>
  | { has: (id: string) => boolean }
  | ((id: string) => boolean);

function isKnownRecipeId(
  checker: KnownRecipeIdChecker,
  id: string,
): boolean {
  if (typeof checker === "function") {
    return checker(id);
  }
  return checker.has(id);
}

/**
 * Reads a shared recipe id from a URL search string (e.g. "?recipe=recipe-abc").
 * Returns null when the param is missing, empty, or not a known recipe id,
 * so shared links degrade gracefully to the full list.
 */
export function getSharedRecipeIdFromSearch(
  search: string,
  knownRecipeIds: KnownRecipeIdChecker,
): string | null {
  if (!search) return null;

  let id: string | null = null;
  try {
    id = new URLSearchParams(search).get(RECIPE_SHARE_PARAM)?.trim() ?? null;
  } catch {
    return null;
  }

  if (!id || !isKnownRecipeId(knownRecipeIds, id)) return null;
  return id;
}
