const FEEDBACK_PATH = "/api/submit-feedback";
const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_SECONDS = 60;
const FEEDBACK_TYPES = ["Issue", "Feature", "Suggestion", "Recipe"] as const;
const ALLOWED_ORIGINS = new Set([
  "https://cultistcircle.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

type FeedbackType = (typeof FEEDBACK_TYPES)[number];

type FeedbackPayload = {
  type: FeedbackType;
  description: string;
  version?: string;
};

type JsonRecord = Record<string, unknown>;

function jsonResponse(
  body: JsonRecord,
  status = 200,
  headers?: HeadersInit,
  origin?: string,
) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  if (origin) {
    responseHeaders.set("Access-Control-Allow-Origin", origin);
    responseHeaders.set("Vary", "Origin");
  }

  return Response.json(body, {
    status,
    headers: responseHeaders,
  });
}

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return null;
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }

      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

function parseFeedbackPayload(value: unknown): FeedbackPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as JsonRecord;
  if (
    typeof payload.type !== "string" ||
    !FEEDBACK_TYPES.includes(payload.type as FeedbackType) ||
    typeof payload.description !== "string"
  ) {
    return null;
  }

  const description = payload.description.trim();
  if (description.length < 3 || description.length > 2000) {
    return null;
  }

  if (payload.version !== undefined && typeof payload.version !== "string") {
    return null;
  }

  const version = payload.version?.trim();
  if (version !== undefined && (version.length < 1 || version.length > 64)) {
    return null;
  }

  return {
    type: payload.type as FeedbackType,
    description,
    ...(version ? { version } : {}),
  };
}

function getRateLimitKey(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown-client"
  );
}

export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== FEEDBACK_PATH) {
    return jsonResponse({ success: false, error: "Not found" }, 404);
  }

  const origin = getAllowedOrigin(request);
  if (request.method === "OPTIONS") {
    if (!origin) {
      return jsonResponse({ success: false, error: "Origin not allowed" }, 403);
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405,
      { Allow: "POST" },
      origin ?? undefined,
    );
  }

  if (!origin) {
    return jsonResponse({ success: false, error: "Origin not allowed" }, 403);
  }

  const rateLimit = await env.FEEDBACK_RATE_LIMITER.limit({
    key: getRateLimitKey(request),
  });
  if (!rateLimit.success) {
    return jsonResponse(
      { success: false, error: "Too many requests. Please try again shortly." },
      429,
      { "Retry-After": String(RATE_LIMIT_SECONDS) },
      origin,
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonResponse(
      { success: false, error: "Invalid feedback payload." },
      400,
      undefined,
      origin,
    );
  }

  const body = await readBoundedBody(request);
  if (body === null) {
    return jsonResponse(
      { success: false, error: "Feedback payload is too large." },
      413,
      undefined,
      origin,
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(body);
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid feedback payload." },
      400,
      undefined,
      origin,
    );
  }

  const payload = parseFeedbackPayload(rawPayload);
  if (!payload) {
    return jsonResponse(
      { success: false, error: "Invalid feedback payload." },
      400,
      undefined,
      origin,
    );
  }

  const createdAt = new Date().toISOString();

  try {
    const result = await env.DB.prepare(
      `INSERT INTO feedback (
        feedback_type,
        description,
        app_version,
        created_at
      ) VALUES (?, ?, ?, ?)`,
    )
      .bind(
        payload.type,
        payload.description,
        payload.version ?? null,
        createdAt,
      )
      .run();

    if (!result.success) {
      throw new Error("D1 insert was unsuccessful");
    }

    return jsonResponse(
      {
        success: true,
        data: [
          {
            id: result.meta.last_row_id,
            feedback_type: payload.type,
            description: payload.description,
            app_version: payload.version ?? null,
            created_at: createdAt,
          },
        ],
      },
      200,
      undefined,
      origin,
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "feedback_insert_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    return jsonResponse(
      { success: false, error: "Failed to submit feedback" },
      500,
      undefined,
      origin,
    );
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
