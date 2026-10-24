import { renderHook } from "@testing-library/react";
import {
  createSWRPersistMiddleware,
  isPlaceholderCacheData,
  isTruncatedItemArray,
  pruneStaleSWRCache,
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

describe("createSWRPersistMiddleware", () => {
  const key = "tarkov-dev-api/pvp/en?v=test";
  const storageKey = `swr-cache-${key}-test`;

  afterEach(() => {
    localStorage.clear();
  });

  it("keeps the persisted fallback identity stable across renders", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        data: [{ id: "1", name: "Diary", shortName: "Diary", basePrice: 1 }],
        timestamp: Date.now(),
      }),
    );
    const middleware = createSWRPersistMiddleware("test", 60_000);
    const useSWRNext = (
      _key: string,
      _fetcher: unknown,
      config: {
        fallbackData?: unknown;
      },
    ) => ({ data: config.fallbackData });
    const useMiddlewareSWR = middleware(useSWRNext);

    const { result, rerender } = renderHook(() =>
      useMiddlewareSWR(key, null, {}),
    );
    const firstData = result.current.data;
    rerender();

    expect(firstData).toHaveLength(1);
    expect(result.current.data).toBe(firstData);
  });
});

describe("pruneStaleSWRCache", () => {
  it("removes item data saved under other cache keys only", () => {
    localStorage.clear();
    localStorage.setItem("swr-cache-tarkov-dev-api/pvp/en?v=2.1.2-2.1.2", "{}");
    localStorage.setItem("swr-cache-tarkov-dev-api/pvp/en?v=abc-abc", "{}");
    localStorage.setItem("selectedItemIds", "[1]");

    pruneStaleSWRCache("abc");

    expect(
      localStorage.getItem("swr-cache-tarkov-dev-api/pvp/en?v=2.1.2-2.1.2"),
    ).toBeNull();
    expect(
      localStorage.getItem("swr-cache-tarkov-dev-api/pvp/en?v=abc-abc"),
    ).toBe("{}");
    expect(localStorage.getItem("selectedItemIds")).toBe("[1]");
  });
});
