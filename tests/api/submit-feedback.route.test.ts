import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

type RouteTestOptions = {
  isConfigured?: boolean;
  insertResult?: { data: unknown; error: unknown };
  rateLimited?: boolean;
};

async function loadRouteModule({
  isConfigured = true,
  insertResult = { data: [{ id: 1 }], error: null },
  rateLimited = false,
}: RouteTestOptions = {}) {
  vi.resetModules();

  const insertMock = vi.fn().mockResolvedValue(insertResult);
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  const createSupabaseClientMock = vi.fn(() => ({ from: fromMock }));
  const isSupabaseConfiguredMock = vi.fn(() => isConfigured);
  const rateLimiterMock = vi.fn(() => (rateLimited ? { limited: true } : null));

  vi.doMock("@/lib/supabaseClient", () => ({
    createSupabaseClient: createSupabaseClientMock,
    isSupabaseConfigured: isSupabaseConfiguredMock,
  }));

  vi.doMock("@/app/lib/rateLimiter", () => ({
    createRateLimiter: vi.fn(() => rateLimiterMock),
  }));

  const routeModule = await import("@/app/api/submit-feedback/route");

  return {
    ...routeModule,
    mocks: {
      createSupabaseClientMock,
      fromMock,
      insertMock,
      isSupabaseConfiguredMock,
      rateLimiterMock,
    },
  };
}

function makeRequest(payload: unknown, headers?: Headers) {
  return {
    headers: headers ?? new Headers(),
    json: vi.fn().mockResolvedValue(payload),
  };
}

describe("submit-feedback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns 400 for an invalid payload", async () => {
    const { POST, mocks } = await loadRouteModule();

    const response = await POST(
      makeRequest({ type: "Issue", description: "x" }) as never,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Invalid feedback payload.",
    });
    expect(mocks.createSupabaseClientMock).not.toHaveBeenCalled();
  });

  test("returns 429 when the request is rate limited", async () => {
    const { POST, mocks } = await loadRouteModule({ rateLimited: true });

    const response = await POST(
      makeRequest({ type: "Issue", description: "valid description" }) as never,
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Too many requests. Please try again shortly.",
    });
    expect(mocks.rateLimiterMock).toHaveBeenCalledTimes(1);
    expect(mocks.createSupabaseClientMock).not.toHaveBeenCalled();
  });

  test("returns 503 when Supabase is not configured", async () => {
    const { POST, mocks } = await loadRouteModule({ isConfigured: false });

    const response = await POST(
      makeRequest({
        type: "Feature",
        description: "Add another recipe filter",
        version: "1.2.3",
      }) as never,
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Feedback submission is not configured for this deployment.",
    });
    expect(mocks.isSupabaseConfiguredMock).toHaveBeenCalledTimes(1);
    expect(mocks.createSupabaseClientMock).not.toHaveBeenCalled();
  });

  test("inserts trimmed feedback and returns success", async () => {
    const { POST, mocks } = await loadRouteModule({
      insertResult: { data: [{ id: 42 }], error: null },
    });

    const response = await POST(
      makeRequest({
        type: "Suggestion",
        description: "  Add a better summary panel  ",
        version: "  2.0.0  ",
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: 42 }],
    });
    expect(mocks.fromMock).toHaveBeenCalledWith("feedback");
    expect(mocks.insertMock).toHaveBeenCalledWith([
      {
        feedback_type: "Suggestion",
        description: "Add a better summary panel",
        app_version: "2.0.0",
      },
    ]);
  });

  test("returns 500 when Supabase insert fails", async () => {
    const error = new Error("insert failed");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { POST } = await loadRouteModule({
      insertResult: { data: null, error },
    });

    const response = await POST(
      makeRequest({
        type: "Recipe",
        description: "Please add another ritual recipe",
      }) as never,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Failed to submit feedback",
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
