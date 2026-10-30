import { renderHook } from "@testing-library/react";
import {
  createSWRPersistMiddleware,
  estimateSerializedChars,
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

  const otherModeKey = "swr-cache-tarkov-dev-api/pve/en?v=test-test";

  function renderWithData(data: unknown, maxChars?: number) {
    const middleware = createSWRPersistMiddleware("test", 60_000, maxChars);
    const useMiddlewareSWR = middleware(() => ({ data }));
    return renderHook(() => useMiddlewareSWR(key, null, {}));
  }

  function makeItems(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      shortName: `I${i}`,
      basePrice: i,
    }));
  }

  it("persists data that fits the budget", () => {
    renderWithData(makeItems(2));

    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    expect(stored.data).toHaveLength(2);
  });

  it("skips oversized data without stringifying all of it", () => {
    localStorage.setItem(storageKey, '{"data":[],"timestamp":0}');
    localStorage.setItem(otherModeKey, "{}");
    const items = makeItems(5_000);
    const stringify = vi.spyOn(JSON, "stringify");
    const setItem = vi.spyOn(localStorage, "setItem");

    renderWithData(items, 10_000);

    expect(setItem).not.toHaveBeenCalled();
    expect(stringify.mock.calls.some(([value]) => value === items)).toBe(false);
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(localStorage.getItem(otherModeKey)).toBe("{}");
  });

  it("keeps other cache entries when localStorage is full", () => {
    localStorage.setItem(otherModeKey, "{}");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(() => renderWithData(makeItems(2))).not.toThrow();

    expect(localStorage.getItem(otherModeKey)).toBe("{}");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(storageKey));
  });
});

describe("estimateSerializedChars", () => {
  it("is exact for small values and close for sampled arrays", () => {
    const small = [{ id: "1", name: "Diary" }];
    expect(estimateSerializedChars(small)).toBe(JSON.stringify(small).length);

    const large = Array.from({ length: 1_000 }, (_, i) => ({
      id: String(i).padStart(4, "0"),
      name: "Item",
    }));
    const actual = JSON.stringify(large).length;
    const estimate = estimateSerializedChars(large);
    expect(Math.abs(estimate - actual) / actual).toBeLessThan(0.05);
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
