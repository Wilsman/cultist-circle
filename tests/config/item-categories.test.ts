import {
  CATEGORY_ID_BY_NAME,
  DEFAULT_EXCLUDED_CATEGORY_IDS,
  LEGACY_DEFAULT_EXCLUDED_CATEGORY_IDS_WITH_FLYER,
  getCategoryDisplayName,
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
