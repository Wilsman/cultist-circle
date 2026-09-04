import { describe, expect, it } from "vitest";

import {
  buildRecipeShareUrl,
  getSharedRecipeIdFromSearch,
  RECIPE_SHARE_PARAM,
} from "@/lib/recipe-share";

const knownIds = new Set(["recipe-alpha", "recipe-bravo"]);

describe("buildRecipeShareUrl", () => {
  it("builds an absolute recipe deep link", () => {
    expect(
      buildRecipeShareUrl(
        "https://beta.cultistcircle.com",
        "/recipes",
        "recipe-alpha",
      ),
    ).toBe(
      `https://beta.cultistcircle.com/recipes?${RECIPE_SHARE_PARAM}=recipe-alpha`,
    );
  });

  it("tolerates trailing slashes and missing leading slash", () => {
    expect(
      buildRecipeShareUrl("https://example.com/", "recipes", "recipe-alpha"),
    ).toBe(`https://example.com/recipes?${RECIPE_SHARE_PARAM}=recipe-alpha`);
  });

  it("encodes special characters in the recipe id", () => {
    expect(buildRecipeShareUrl("https://example.com", "/recipes", "a b&c")).toBe(
      `https://example.com/recipes?${RECIPE_SHARE_PARAM}=a%20b%26c`,
    );
  });
});

describe("getSharedRecipeIdFromSearch", () => {
  it("returns the shared id for a known recipe", () => {
    expect(
      getSharedRecipeIdFromSearch("?recipe=recipe-bravo", knownIds),
    ).toBe("recipe-bravo");
  });

  it("accepts a checker function or has() object", () => {
    expect(
      getSharedRecipeIdFromSearch("?recipe=recipe-alpha", (id) =>
        knownIds.has(id),
      ),
    ).toBe("recipe-alpha");
    expect(
      getSharedRecipeIdFromSearch("?recipe=recipe-alpha", {
        has: (id: string) => knownIds.has(id),
      }),
    ).toBe("recipe-alpha");
  });

  it("ignores other params and trims whitespace", () => {
    expect(
      getSharedRecipeIdFromSearch(
        "?sort=default&recipe=%20recipe-alpha%20",
        knownIds,
      ),
    ).toBe("recipe-alpha");
  });

  it("returns null for missing, empty, or unknown ids", () => {
    expect(getSharedRecipeIdFromSearch("", knownIds)).toBeNull();
    expect(getSharedRecipeIdFromSearch("?sort=default", knownIds)).toBeNull();
    expect(getSharedRecipeIdFromSearch("?recipe=", knownIds)).toBeNull();
    expect(
      getSharedRecipeIdFromSearch("?recipe=recipe-missing", knownIds),
    ).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(getSharedRecipeIdFromSearch("?recipe=%E0%A4%A", knownIds)).toBeNull();
  });
});
