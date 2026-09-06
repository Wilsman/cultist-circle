import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { handleRequest } from "@/cloudflare/feedback/src/index";
import { tarkovRecipes } from "@/data/recipes";

type TestEnvironment = {
  env: Env;
  bindMock: ReturnType<typeof vi.fn>;
  limitMock: ReturnType<typeof vi.fn>;
  prepareMock: ReturnType<typeof vi.fn>;
  runMock: ReturnType<typeof vi.fn>;
};

function createEnvironment({
  rateLimitSuccess = true,
  insertSuccess = true,
  insertError,
}: {
  rateLimitSuccess?: boolean;
  insertSuccess?: boolean;
  insertError?: Error;
} = {}): TestEnvironment {
  const runMock = insertError
    ? vi.fn().mockRejectedValue(insertError)
    : vi.fn().mockResolvedValue({
        success: insertSuccess,
        meta: { last_row_id: 42 },
      });
  const bindMock = vi.fn(() => ({ run: runMock }));
  const prepareMock = vi.fn(() => ({ bind: bindMock }));
  const limitMock = vi.fn().mockResolvedValue({ success: rateLimitSuccess });

  const env: Env = {
    DB: {
      prepare: prepareMock,
      batch: vi.fn(),
      exec: vi.fn(),
      withSession: vi.fn(),
      dump: vi.fn(),
    },
    FEEDBACK_RATE_LIMITER: { limit: limitMock },
  };

  return { env, bindMock, limitMock, prepareMock, runMock };
}

function makeRequest(
  body: string,
  {
    method = "POST",
    headers = {},
  }: { method?: string; headers?: HeadersInit } = {},
) {
  return new Request("https://cultistcircle.com/api/submit-feedback", {
    method,
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.10",
      Origin: "https://cultistcircle.com",
      ...headers,
    },
    ...(method === "POST" ? { body } : {}),
  });
}

describe("Cloudflare feedback Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each(["Issue", "Feature", "Suggestion", "Recipe"])(
    "inserts trimmed %s feedback and preserves the response envelope",
    async (type) => {
      const { env, bindMock, limitMock, prepareMock } = createEnvironment();

      const response = await handleRequest(
        makeRequest(
          JSON.stringify({
            type,
            description: "  Add a clearer result panel  ",
            version: "  2.1.2  ",
          }),
        ),
        env,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://cultistcircle.com",
      );
      await expect(response.json()).resolves.toEqual({
        success: true,
        data: [
          {
            id: 42,
            feedback_type: type,
            description: "Add a clearer result panel",
            app_version: "2.1.2",
            created_at: expect.any(String),
          },
        ],
      });
      expect(limitMock).toHaveBeenCalledWith({ key: "203.0.113.10" });
      expect(prepareMock).toHaveBeenCalledTimes(1);
      expect(bindMock).toHaveBeenCalledWith(
        type,
        "Add a clearer result panel",
        "2.1.2",
        expect.any(String),
      );
    },
  );

  test("stores a missing version as null", async () => {
    const { env, bindMock } = createEnvironment();

    const response = await handleRequest(
      makeRequest(
        JSON.stringify({ type: "Issue", description: "Something is broken" }),
      ),
      env,
    );

    expect(response.status).toBe(200);
    expect(bindMock).toHaveBeenCalledWith(
      "Issue",
      "Something is broken",
      null,
      expect.any(String),
    );
  });

  test.each([
    ["malformed JSON", "{"],
    [
      "invalid type",
      JSON.stringify({ type: "Other", description: "Valid text" }),
    ],
    ["short description", JSON.stringify({ type: "Issue", description: "x" })],
    [
      "empty version",
      JSON.stringify({
        type: "Issue",
        description: "Valid text",
        version: "  ",
      }),
    ],
  ])("returns 400 for %s", async (_label, body) => {
    const { env, prepareMock } = createEnvironment();

    const response = await handleRequest(makeRequest(body), env);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Invalid feedback payload.",
    });
    expect(prepareMock).not.toHaveBeenCalled();
  });

  test("rejects a non-JSON content type", async () => {
    const { env } = createEnvironment();

    const response = await handleRequest(
      makeRequest("plain text", { headers: { "Content-Type": "text/plain" } }),
      env,
    );

    expect(response.status).toBe(400);
  });

  test("rejects a declared oversized body", async () => {
    const { env, prepareMock } = createEnvironment();

    const response = await handleRequest(
      makeRequest("{}", { headers: { "Content-Length": "8193" } }),
      env,
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Feedback payload is too large.",
    });
    expect(prepareMock).not.toHaveBeenCalled();
  });

  test("returns 405 without consuming the rate limit for unsupported methods", async () => {
    const { env, limitMock } = createEnvironment();

    const response = await handleRequest(
      makeRequest("", { method: "GET" }),
      env,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(limitMock).not.toHaveBeenCalled();
  });

  test("answers an allowed CORS preflight without consuming the rate limit", async () => {
    const { env, limitMock } = createEnvironment();

    const response = await handleRequest(
      makeRequest("", { method: "OPTIONS" }),
      env,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://cultistcircle.com",
    );
    expect(response.headers.get("access-control-allow-methods")).toBe("POST");
    expect(limitMock).not.toHaveBeenCalled();
  });

  test("rejects POST requests from an unapproved origin", async () => {
    const { env, limitMock } = createEnvironment();

    const response = await handleRequest(
      makeRequest(
        JSON.stringify({ type: "Issue", description: "Valid description" }),
        { headers: { Origin: "https://example.com" } },
      ),
      env,
    );

    expect(response.status).toBe(403);
    expect(limitMock).not.toHaveBeenCalled();
  });

  test("returns 404 outside the feedback route", async () => {
    const { env, limitMock } = createEnvironment();

    const response = await handleRequest(
      new Request("https://cultistcircle.com/api/other"),
      env,
    );

    expect(response.status).toBe(404);
    expect(limitMock).not.toHaveBeenCalled();
  });

  test("returns 429 with Retry-After when Cloudflare limits the client", async () => {
    const { env, prepareMock } = createEnvironment({ rateLimitSuccess: false });

    const response = await handleRequest(
      makeRequest(
        JSON.stringify({ type: "Recipe", description: "Add this recipe" }),
      ),
      env,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Too many requests. Please try again shortly.",
    });
    expect(prepareMock).not.toHaveBeenCalled();
  });

  test.each([
    ["an unsuccessful result", { insertSuccess: false }],
    ["a rejected insert", { insertError: new Error("D1 unavailable") }],
  ])("returns 500 for %s", async (_label, options) => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { env } = createEnvironment(options);

    const response = await handleRequest(
      makeRequest(
        JSON.stringify({ type: "Suggestion", description: "Valid suggestion" }),
      ),
      env,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Failed to submit feedback",
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Cloudflare recipe feedback API", () => {
  const clientId = "123e4567-e89b-42d3-a456-426614174000";
  const regularRecipeId = tarkovRecipes.find(
    (recipe) => recipe.modeRestriction !== "pvp-only",
  )!.id;
  const pvpOnlyRecipeId = tarkovRecipes.find(
    (recipe) => recipe.modeRestriction === "pvp-only",
  )!.id;

  function createRecipeEnvironment({
    batchSuccess = true,
    batchError,
    stats = {
      recipe_id: regularRecipeId,
      worked_count: 1,
      didnt_work_count: 0,
      last_worked_at: "2026-09-03T12:00:00.000Z",
      last_worked_mode: "pvp" as const,
      worked_pvp: 1,
      worked_pve: 0,
      worked_season: 0,
      didnt_work_pvp: 0,
      didnt_work_pve: 0,
      didnt_work_season: 0,
    },
  }: {
    batchSuccess?: boolean;
    batchError?: Error;
    stats?: {
      recipe_id: string;
      worked_count: number;
      didnt_work_count: number;
      last_worked_at: string | null;
      last_worked_mode: "pvp" | "pve" | "season" | null;
      worked_pvp: number;
      worked_pve: number;
      worked_season: number;
      didnt_work_pvp: number;
      didnt_work_pve: number;
      didnt_work_season: number;
    };
  } = {}) {
    const batchMock = batchError
      ? vi.fn().mockRejectedValue(batchError)
      : vi.fn().mockResolvedValue([
          { success: batchSuccess, results: [] },
          { success: batchSuccess, results: [] },
          { success: batchSuccess, results: [stats] },
        ]);
    const limitMock = vi.fn().mockResolvedValue({ success: true });
    const prepareMock = vi.fn((query: string) => {
      const makeStatement = () => ({
        bind: vi.fn(() => makeStatement()),
        first: vi.fn().mockResolvedValue(stats),
        all: vi.fn().mockResolvedValue({
          success: true,
          results: [stats],
          meta: {},
        }),
        run: vi.fn().mockResolvedValue({ success: true, meta: {} }),
        raw: vi.fn().mockResolvedValue([]),
      });
      return makeStatement();
    });

    const env = {
      DB: {
        prepare: prepareMock,
        batch: batchMock,
        exec: vi.fn(),
        withSession: vi.fn(),
        dump: vi.fn(),
      },
      FEEDBACK_RATE_LIMITER: { limit: limitMock },
    } as Env;

    return { env, batchMock, limitMock, prepareMock };
  }

  function makeRecipeRequest(
    method: "GET" | "POST" | "OPTIONS",
    body?: unknown,
    origin = "https://beta.cultistcircle.com",
  ) {
    return new Request("https://example.workers.dev/api/recipe-feedback", {
      method,
      headers: {
        Origin: origin,
        "CF-Connecting-IP": "203.0.113.20",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  test("returns all recipe totals in one cacheable request for beta", async () => {
    const { env, limitMock, prepareMock } = createRecipeEnvironment();

    const response = await handleRequest(makeRecipeRequest("GET"), env);

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://beta.cultistcircle.com",
    );
    expect(response.headers.get("cache-control")).toContain("max-age=30");
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        [regularRecipeId]: {
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: "2026-09-03T12:00:00.000Z",
          lastWorkedMode: "pvp",
          modes: {
            pvp: { worked: 1, didntWork: 0 },
            pve: { worked: 0, didntWork: 0 },
            season: { worked: 0, didntWork: 0 },
          },
        },
      },
    });
    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(limitMock).not.toHaveBeenCalled();
  });

  test("writes a new vote and returns authoritative totals", async () => {
    const { env, batchMock, limitMock } = createRecipeEnvironment();

    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: "worked",
        gameMode: "pvp",
        clientId,
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(limitMock).toHaveBeenCalledWith({ key: "recipe:203.0.113.20" });
    expect(batchMock).toHaveBeenCalledTimes(1);
    expect(batchMock.mock.calls[0][0]).toHaveLength(3);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        recipeId: regularRecipeId,
        stats: {
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: "2026-09-03T12:00:00.000Z",
          lastWorkedMode: "pvp",
          modes: {
            pvp: { worked: 1, didntWork: 0 },
            pve: { worked: 0, didntWork: 0 },
            season: { worked: 0, didntWork: 0 },
          },
        },
        userVote: "worked",
        userMode: "pvp",
      },
    });
  });

  test("guards unchanged rows while rebuilding totals in the same transaction", async () => {
    const { env, batchMock, prepareMock } = createRecipeEnvironment();

    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: "worked",
        gameMode: "pvp",
        clientId,
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(batchMock).toHaveBeenCalledTimes(1);
    expect(
      prepareMock.mock.calls.some(([query]) =>
        String(query).includes("SELECT vote, game_mode"),
      ),
    ).toBe(false);
    expect(String(prepareMock.mock.calls[0][0])).toContain(
      "WHERE recipe_feedback.vote IS NOT excluded.vote",
    );
  });

  test("accepts a game mode and stores it with the vote", async () => {
    const { env, batchMock, prepareMock } = createRecipeEnvironment();

    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: "didnt_work",
        gameMode: "pve",
        clientId,
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(batchMock).toHaveBeenCalledTimes(1);
    const insertQuery: string = prepareMock.mock.calls
      .map((call) => String(call[0]))
      .find((query) => query.includes("INSERT INTO recipe_feedback"))!;
    expect(insertQuery).toContain("game_mode");
  });

  test("rejects an invalid game mode", async () => {
    const { env, batchMock } = createRecipeEnvironment();
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: "worked",
        gameMode: "coop",
        clientId,
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(batchMock).not.toHaveBeenCalled();
  });

  test("requires a game mode for every non-null report", async () => {
    const { env, batchMock } = createRecipeEnvironment();
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: "worked",
        clientId,
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(batchMock).not.toHaveBeenCalled();
  });

  test("requires removals to omit their game mode", async () => {
    const { env, batchMock } = createRecipeEnvironment();
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: null,
        gameMode: "pvp",
        clientId,
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(batchMock).not.toHaveBeenCalled();
  });

  test("enforces PVP-only recipe restrictions", async () => {
    const blocked = createRecipeEnvironment();
    const blockedResponse = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: pvpOnlyRecipeId,
        vote: "worked",
        gameMode: "pve",
        clientId,
      }),
      blocked.env,
    );
    expect(blockedResponse.status).toBe(400);
    expect(blocked.batchMock).not.toHaveBeenCalled();

    const allowed = createRecipeEnvironment();
    const allowedResponse = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: pvpOnlyRecipeId,
        vote: "worked",
        gameMode: "pvp",
        clientId,
      }),
      allowed.env,
    );
    expect(allowedResponse.status).toBe(200);
    expect(allowed.batchMock).toHaveBeenCalledTimes(1);
  });

  test("removes a report and rebuilds totals atomically", async () => {
    const { env, batchMock, prepareMock } = createRecipeEnvironment();
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: null,
        clientId,
      }),
      env,
    );
    expect(response.status).toBe(200);
    expect(batchMock.mock.calls[0][0]).toHaveLength(3);
    expect(String(prepareMock.mock.calls[0][0])).toContain(
      "DELETE FROM recipe_feedback",
    );
    await expect(response.json()).resolves.toMatchObject({
      data: { userVote: null, userMode: null },
    });
  });

  test.each([
    ["an unsuccessful transaction", { batchSuccess: false }],
    ["a rejected transaction", { batchError: new Error("D1 unavailable") }],
  ])("returns 500 for %s", async (_label, options) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { env } = createRecipeEnvironment(options);
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: "didnt_work",
        gameMode: "season",
        clientId,
      }),
      env,
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Failed to save recipe feedback",
    });
  });

  test("rejects an unknown but well-shaped recipe ID", async () => {
    const { env, batchMock } = createRecipeEnvironment();
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: "recipe-fake",
        vote: "worked",
        gameMode: "pvp",
        clientId,
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(batchMock).not.toHaveBeenCalled();
  });

  test("rejects a malformed client ID", async () => {
    const { env, batchMock } = createRecipeEnvironment();
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: regularRecipeId,
        vote: "worked",
        gameMode: "pvp",
        clientId: "not-a-uuid",
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(batchMock).not.toHaveBeenCalled();
  });

  test("advertises both recipe methods in CORS preflight", async () => {
    const { env, limitMock } = createRecipeEnvironment();
    const response = await handleRequest(makeRecipeRequest("OPTIONS"), env);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, POST",
    );
    expect(limitMock).not.toHaveBeenCalled();
  });
});
