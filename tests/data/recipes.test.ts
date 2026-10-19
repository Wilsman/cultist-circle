import { describe, expect, it } from "vitest";

import { tarkovRecipes } from "@/data/recipes";

describe("launcher promo recipe data", () => {
  it("keeps the Ferrum launcher recipe exact and marks it expired", () => {
    const recipe = tarkovRecipes[0];

    expect(recipe).toMatchObject({
      requiredItems: ["5x BD dogtag •| Ferrum"],
      craftingTime: "5:55:55",
      producedItems: ["1x Briefcase with documents"],
      expiredAt: "2026-10-19",
      isNew: false,
      specialFlow: {
        type: "launcher-promo",
        codes: [
          "6NU9-UFK1-W2TX-89RW-M96B",
          "6NU9-W2TX-UFK1-89RW-M96B",
          "UFK1-6NU9-W2TX-89RW-M96B",
          "UFK1-W2TX-6NU9-89RW-M96B",
          "W2TX-UFK1-6NU9-89RW-M96B",
        ],
        sacrificeItemUrl: "https://tarkov.dev/item/bd-dogtag-ferrum",
        rewardItemUrl: "https://tarkov.dev/item/briefcase-with-documents",
      },
    });
    expect(recipe.specialFlow?.codes).toHaveLength(5);
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
