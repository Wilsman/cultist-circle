import { describe, expect, it } from "vitest";

import { tarkovRecipes } from "@/data/recipes";
import {
  isRecipeCompletionList,
  normalizeCompletedRecipeIds,
  setRecipeCompletion,
} from "@/lib/recipe-completion";

describe("recipe completion helpers", () => {
  const knownRecipeIds = new Set(["recipe-alpha", "recipe-bravo"]);

  it("provides every recipe with a unique stable ID", () => {
    const recipeIds = tarkovRecipes.map((recipe) => recipe.id);

    expect(recipeIds.every((recipeId) => recipeId.startsWith("recipe-"))).toBe(
      true,
    );
    expect(new Set(recipeIds).size).toBe(recipeIds.length);
  });

  it("validates the persisted recipe ID list", () => {
    expect(isRecipeCompletionList(["recipe-alpha"])).toBe(true);
    expect(isRecipeCompletionList(["recipe-alpha", 42])).toBe(false);
    expect(isRecipeCompletionList({ recipe: "recipe-alpha" })).toBe(false);
  });

  it("removes duplicate and unknown recipe IDs", () => {
    expect(
      normalizeCompletedRecipeIds(
        ["recipe-alpha", "recipe-missing", "recipe-alpha"],
        knownRecipeIds,
      ),
    ).toEqual(["recipe-alpha"]);
  });

  it("marks known recipes done and not done independently", () => {
    expect(
      setRecipeCompletion(
        ["recipe-alpha"],
        "recipe-bravo",
        true,
        knownRecipeIds,
      ),
    ).toEqual(["recipe-alpha", "recipe-bravo"]);

    expect(
      setRecipeCompletion(
        ["recipe-alpha", "recipe-bravo"],
        "recipe-alpha",
        false,
        knownRecipeIds,
      ),
    ).toEqual(["recipe-bravo"]);
  });
});
