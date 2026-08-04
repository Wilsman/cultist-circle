import { describe, expect, it } from "vitest";

import { tarkovRecipes } from "@/data/recipes";

describe("launcher promo recipe data", () => {
  it("keeps the featured Ferrum recipe exact and first", () => {
    const recipe = tarkovRecipes[0];

    expect(recipe).toMatchObject({
      requiredItems: ["5x BD dogtag •| Ferrum"],
      craftingTime: "5:55:55",
      producedItems: ["1x Briefcase with documents"],
      isNew: true,
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
        sacrificeNote:
          "Any Black Division dogtag works: Ferrum, Green, or Red.",
      },
    });
    expect(recipe.specialFlow?.codes).toHaveLength(5);
    expect(recipe.id).toMatch(/^recipe-/);
  });
});
