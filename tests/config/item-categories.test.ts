import { getMessage } from "@/config/i18n";
import {
  CATEGORY_ID_BY_NAME,
  DEFAULT_EXCLUDED_CATEGORY_IDS,
  LEGACY_DEFAULT_EXCLUDED_CATEGORY_IDS_WITH_FLYER,
  getCategoryDisplayName,
  localizeCategories,
} from "@/config/item-categories";

describe("item category defaults", () => {
  it('keeps the "Flyer" category labeled as "Posters"', () => {
    expect(getCategoryDisplayName("Flyer")).toBe("Posters");
  });

  it('does not exclude the "Flyer" category by default', () => {
    const flyerCategoryId = CATEGORY_ID_BY_NAME.get("Flyer");

    expect(flyerCategoryId).toBeTruthy();
    expect(DEFAULT_EXCLUDED_CATEGORY_IDS.has(flyerCategoryId!)).toBe(false);
  });

  it('keeps the old "Flyer" default set available for migration checks', () => {
    const flyerCategoryId = CATEGORY_ID_BY_NAME.get("Flyer");

    expect(flyerCategoryId).toBeTruthy();
    expect(
      LEGACY_DEFAULT_EXCLUDED_CATEGORY_IDS_WITH_FLYER.has(flyerCategoryId!),
    ).toBe(true);
  });
});

describe("localizeCategories", () => {
  const translateJa = (name: string) => getMessage("ja", name);

  it("translates category names tarkov.dev leaves in English", () => {
    const result = localizeCategories(
      [
        { id: "thermal", name: "Thermal Vision" },
        { id: "ubgl", name: "UBGL" },
        { id: "flyer", name: "Flyer" },
      ],
      translateJa,
      "ja",
    );

    expect(result.map((category) => category.name)).not.toContain(
      "Thermal Vision",
    );
    expect(result).toContainEqual({ id: "flyer", name: "ポスター" });
    expect(result.every((category) => !/[A-Za-z]{3,}/.test(category.name))).toBe(
      true,
    );
  });

  it("keeps names tarkov.dev already localized", () => {
    const result = localizeCategories(
      [{ id: "armor", name: "アーマー" }],
      translateJa,
      "ja",
    );

    expect(result).toEqual([{ id: "armor", name: "アーマー" }]);
  });
});
