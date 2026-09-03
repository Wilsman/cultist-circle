import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

type CookieEntry = { name: string; value?: string };

async function loadRouteModule(cookieEntries: CookieEntry[]) {
  vi.resetModules();

  const getAllMock = vi.fn(() => cookieEntries);
  const setMock = vi.fn();
  const cookiesMock = vi.fn(async () => ({
    getAll: getAllMock,
    set: setMock,
  }));

  vi.doMock("next/headers", () => ({
    cookies: cookiesMock,
  }));

  const routeModule = await import("@/app/api/expire-cookies/route");

  return {
    ...routeModule,
    mocks: {
      cookiesMock,
      getAllMock,
      setMock,
    },
  };
}

describe("expire-cookies route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("expires every cookie", async () => {
    const { GET, mocks } = await loadRouteModule([
      { name: "theme" },
      { name: "sb-access-token" },
      { name: "session" },
      { name: "sb-refresh-token" },
    ]);

    const response = await GET();

    expect(mocks.cookiesMock).toHaveBeenCalledTimes(1);
    expect(mocks.getAllMock).toHaveBeenCalledTimes(1);
    expect(mocks.setMock).toHaveBeenCalledTimes(4);
    expect(mocks.setMock).toHaveBeenNthCalledWith(1, "theme", "", {
      maxAge: 0,
    });
    expect(mocks.setMock).toHaveBeenNthCalledWith(2, "sb-access-token", "", {
      maxAge: 0,
    });
    expect(mocks.setMock).toHaveBeenNthCalledWith(3, "session", "", {
      maxAge: 0,
    });
    expect(mocks.setMock).toHaveBeenNthCalledWith(4, "sb-refresh-token", "", {
      maxAge: 0,
    });
    await expect(response.json()).resolves.toEqual({
      message: "Cookies cleared",
    });
  });

  test("returns success when there are no cookies", async () => {
    const { GET, mocks } = await loadRouteModule([]);

    const response = await GET();

    expect(mocks.setMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      message: "Cookies cleared",
    });
  });
});
