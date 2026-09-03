import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { handleRequest } from "@/cloudflare/feedback/src/index";

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

  function createRecipeEnvironment({
    existingVote = null,
    stats = {
      recipe_id: "recipe-alpha",
      worked_count: 1,
      didnt_work_count: 0,
      last_worked_at: "2026-09-03T12:00:00.000Z",
    },
  }: {
    existingVote?: "worked" | "didnt_work" | null;
    stats?: {
      recipe_id: string;
      worked_count: number;
      didnt_work_count: number;
      last_worked_at: string | null;
    };
  } = {}) {
    const batchMock = vi
      .fn()
      .mockResolvedValue([{ success: true }, { success: true }]);
    const limitMock = vi.fn().mockResolvedValue({ success: true });
    const prepareMock = vi.fn((query: string) => {
      const makeStatement = () => ({
        bind: vi.fn(() => makeStatement()),
        first: vi
          .fn()
          .mockResolvedValue(
            query.includes("SELECT vote")
              ? existingVote
                ? { vote: existingVote }
                : null
              : stats,
          ),
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
    expect(response.headers.get("cache-control")).toContain("max-age=60");
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        "recipe-alpha": {
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: "2026-09-03T12:00:00.000Z",
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
        recipeId: "recipe-alpha",
        vote: "worked",
        clientId,
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(limitMock).toHaveBeenCalledWith({ key: "recipe:203.0.113.20" });
    expect(batchMock).toHaveBeenCalledTimes(1);
    expect(batchMock.mock.calls[0][0]).toHaveLength(2);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        recipeId: "recipe-alpha",
        stats: {
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: "2026-09-03T12:00:00.000Z",
        },
        userVote: "worked",
      },
    });
  });

  test("does not rewrite an unchanged vote", async () => {
    const { env, batchMock } = createRecipeEnvironment({
      existingVote: "worked",
    });

    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: "recipe-alpha",
        vote: "worked",
        clientId,
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(batchMock).not.toHaveBeenCalled();
  });

  test("rejects malformed recipe identities and client IDs", async () => {
    const { env, batchMock } = createRecipeEnvironment();
    const response = await handleRequest(
      makeRecipeRequest("POST", {
        recipeId: "not-a-recipe",
        vote: "worked",
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
