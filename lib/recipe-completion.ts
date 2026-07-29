export const RECIPE_COMPLETION_STORAGE_KEY =
  "cultist-circle:completed-recipe-ids:v1";

export function isRecipeCompletionList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((recipeId) => typeof recipeId === "string")
  );
}

export function normalizeCompletedRecipeIds(
  recipeIds: string[],
  knownRecipeIds: ReadonlySet<string>,
): string[] {
  return Array.from(
    new Set(recipeIds.filter((recipeId) => knownRecipeIds.has(recipeId))),
  );
}

export function setRecipeCompletion(
  recipeIds: string[],
  recipeId: string,
  isCompleted: boolean,
  knownRecipeIds: ReadonlySet<string>,
): string[] {
  const normalizedIds = normalizeCompletedRecipeIds(recipeIds, knownRecipeIds);

  if (!knownRecipeIds.has(recipeId)) {
    return normalizedIds;
  }

  if (isCompleted) {
    return normalizedIds.includes(recipeId)
      ? normalizedIds
      : [...normalizedIds, recipeId];
  }

  return normalizedIds.filter((completedId) => completedId !== recipeId);
}
