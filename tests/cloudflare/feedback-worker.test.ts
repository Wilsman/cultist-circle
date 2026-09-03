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
