import { describe, expect, it } from "vitest";

import { tarkovRecipes } from "@/data/recipes";

describe("launcher promo recipe data", () => {
  it("keeps the Ferrum recipe active, first and limited to PvP Season", () => {
    const recipe = tarkovRecipes[0];

    expect(recipe).toMatchObject({
      requiredItems: ["5x BD dogtag •| Ferrum"],
      craftingTime: "5:55:55",
      producedItems: ["1x Briefcase with documents"],
      isUpdated: true,
      modeRestriction: "season-only",
      specialFlow: {
        type: "launcher-promo",
        sacrificeItemUrl: "https://tarkov.dev/item/bd-dogtag-ferrum",
        rewardItemUrl: "https://tarkov.dev/item/briefcase-with-documents",
      },
    });
    expect(recipe.expiredAt).toBeUndefined();
    expect(recipe.specialFlow).not.toHaveProperty("codes");
    expect(recipe.id).toMatch(/^recipe-/);
  });

  it("never shows NEW or UPDATED on an expired recipe", () => {
    for (const recipe of tarkovRecipes.filter((entry) => entry.expiredAt)) {
      expect(recipe.isNew).toBeFalsy();
      expect(recipe.isUpdated).toBeFalsy();
      expect(recipe.expiredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
