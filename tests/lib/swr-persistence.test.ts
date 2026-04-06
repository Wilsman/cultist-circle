import {
  isPlaceholderCacheData,
  isTruncatedItemArray,
} from "@/utils/swr-persistence";

describe("swr persistence helpers", () => {
  it("detects old truncated item arrays", () => {
    expect(
      isTruncatedItemArray([
        { id: "1", name: "Secure magnetic tape cassette" },
        { id: "2", name: "Diary", type: "item" },
      ]),
    ).toBe(true);
  });

  it("keeps full item records valid", () => {
    expect(
      isTruncatedItemArray([
        {
          id: "1",
          name: "Secure magnetic tape cassette",
          shortName: "SMT",
          basePrice: 42000,
          iconLink: "https://assets.tarkov.dev/example.webp",
        },
      ]),
    ).toBe(false);
  });

  it("detects placeholder cache objects", () => {
    expect(isPlaceholderCacheData({ cached: true, version: "2.1.2" })).toBe(
      true,
    );
    expect(isPlaceholderCacheData([{ id: "1", name: "Diary" }])).toBe(false);
  });
});
