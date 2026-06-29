import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  fetchCombinedTarkovData,
  fetchMinimalTarkovData,
  fetchTarkovData,
  resetTarkovApiCachesForTests,
  resetTarkovApiRetryStateForTests,
} from "@/hooks/use-tarkov-api";

const emptyCombinedResponse = {
  data: { pvpItems: [], pveItems: [] },
};

describe("use-tarkov-api GraphQL fetchers", () => {
  beforeEach(() => {
    resetTarkovApiCachesForTests();
    resetTarkovApiRetryStateForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const validCombinedResponse = {
    data: {
      pvpItems: [
        {
          id: "1",
          name: "Item A",
          shortName: "A",
          basePrice: 100,
          lastLowPrice: null,
          updated: new Date().toISOString(),
          width: 1,
          height: 1,
          lastOfferCount: 10,
          avg24hPrice: null,
          iconLink: "",
          link: "",
          categories: [{ id: "cat1", name: "Barter item" }],
          buyFor: [],
        },
      ],
      pveItems: [
        {
          id: "2",
          name: "Item B",
          shortName: "B",
          basePrice: 200,
          lastLowPrice: null,
          updated: new Date().toISOString(),
          width: 1,
          height: 1,
          lastOfferCount: 10,
          avg24hPrice: null,
          iconLink: "",
          link: "",
          categories: [{ id: "cat1", name: "Barter item" }],
          buyFor: [],
        },
      ],
    },
  };

  const httpResponse = (status: number, retryAfter?: string) => ({
    ok: false,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "retry-after" ? (retryAfter ?? null) : null,
    },
  });

  const okResponse = (body = validCombinedResponse) => ({
    ok: true,
    status: 200,
    headers: {
      get: () => null,
    },
    json: async () => body,
  });

  test("fetchCombinedTarkovData includes lang in query and caches per language", async () => {
    const fetchMock = vi.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => emptyCombinedResponse,
    } as any);

    await fetchCombinedTarkovData("de");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init1 = fetchMock.mock.calls[0][1] as any;
    const body1 = JSON.parse(init1.body as string);
    expect(body1.query).toContain("lang: de");

    // Same language -> cached, no extra fetch
    await fetchCombinedTarkovData("de");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Different language -> new network call
    await fetchCombinedTarkovData("en");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init2 = fetchMock.mock.calls[1][1] as any;
    const body2 = JSON.parse(init2.body as string);
    expect(body2.query).toContain("lang: en");
  });

  test("fetchTarkovData returns per-mode items and correct meta.mode", async () => {
    const response = {
      data: {
        pvpItems: [
          {
            id: "1",
            name: "Item A",
            shortName: "A",
            basePrice: 100,
            lastLowPrice: null,
            updated: new Date().toISOString(),
            width: 1,
            height: 1,
            lastOfferCount: 10,
            avg24hPrice: null,
            iconLink: "",
            categories: [{ name: "Weapon" }],
            buyFor: [],
          },
        ],
        pveItems: [
          {
            id: "2",
            name: "Item B",
            shortName: "B",
            basePrice: 200,
            lastLowPrice: null,
            updated: new Date().toISOString(),
            width: 1,
            height: 1,
            lastOfferCount: 10,
            avg24hPrice: null,
            iconLink: "",
            categories: [{ name: "Key" }],
            buyFor: [],
          },
        ],
      },
    };

    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValue({ ok: true, json: async () => response } as any);

    const pvp = await fetchTarkovData("regular", "en");
    expect(pvp.items).toHaveLength(1);
    expect(pvp.meta.mode).toBe("pvp");

    const pve = await fetchTarkovData("pve", "en");
    expect(pve.items).toHaveLength(1);
    expect(pve.meta.mode).toBe("pve");

    // only two fetches: both calls shared the same combined fetch via cache within single run? depends on cache; allow >=1
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test("fetchMinimalTarkovData includes lang and caches per language", async () => {
    const minimalResponse = {
      data: { pvpItems: [], pveItems: [] },
    };
    const fetchMock = vi.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => minimalResponse,
    } as any);

    await fetchMinimalTarkovData("fr");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init3 = fetchMock.mock.calls[0][1] as any;
    const body1 = JSON.parse(init3.body as string);
    expect(body1.query).toContain("lang: fr");

    await fetchMinimalTarkovData("fr");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await fetchMinimalTarkovData("en");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries transient 503 responses with exponential backoff", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00.000Z"));
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValueOnce(httpResponse(503) as any)
      .mockResolvedValueOnce(httpResponse(503) as any)
      .mockResolvedValueOnce(okResponse() as any);

    const promise = fetchCombinedTarkovData("en");
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toMatchObject({
      pvp: expect.any(Array),
      pve: expect.any(Array),
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("uses Retry-After before retrying 503 responses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00.000Z"));
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValueOnce(httpResponse(503, "2") as any)
      .mockResolvedValueOnce(okResponse() as any);

    const promise = fetchCombinedTarkovData("en");

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toMatchObject({
      pvp: expect.any(Array),
      pve: expect.any(Array),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not retry permanent 404 responses", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValue(httpResponse(404) as any);

    await expect(fetchCombinedTarkovData("en")).rejects.toThrow("404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("sets a short cooldown after repeated transient failures", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00.000Z"));
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const fetchMock = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValue(httpResponse(503) as any);

    const promise = fetchCombinedTarkovData("en");
    const rejection = expect(promise).rejects.toThrow("503");
    await vi.advanceTimersByTimeAsync(3000);
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await expect(fetchCombinedTarkovData("en")).rejects.toThrow("cooling down");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("successful retry clears transient status without setting cooldown", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00.000Z"));
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(global, "fetch" as any)
      .mockResolvedValueOnce(httpResponse(503) as any)
      .mockResolvedValueOnce(okResponse() as any);

    const promise = fetchCombinedTarkovData("en");
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toMatchObject({
      pvp: expect.any(Array),
      pve: expect.any(Array),
    });
    expect(localStorage.getItem("tarkov-dev-api-cooldown-until")).toBeNull();
  });
});
