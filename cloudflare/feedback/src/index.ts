const FEEDBACK_PATH = "/api/submit-feedback";
const RECIPE_FEEDBACK_PATH = "/api/recipe-feedback";
const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_SECONDS = 60;
const FEEDBACK_TYPES = ["Issue", "Feature", "Suggestion", "Recipe"] as const;
const RECIPE_VOTES = ["worked", "didnt_work"] as const;
const RECIPE_ID_PATTERN = /^recipe-[a-z0-9-]{1,64}$/;
const CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ORIGINS = new Set([
  "https://cultistcircle.com",
  "https://beta.cultistcircle.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

type FeedbackType = (typeof FEEDBACK_TYPES)[number];
type RecipeVote = (typeof RECIPE_VOTES)[number];

type FeedbackPayload = {
  type: FeedbackType;
  description: string;
  version?: string;
};

type RecipeFeedbackPayload = {
  recipeId: string;
  vote: RecipeVote | null;
  clientId: string;
};

type RecipeFeedbackStats = {
  workedCount: number;
  didntWorkCount: number;
  lastWorkedAt: string | null;
};

type RecipeStatsRow = {
  recipe_id: string;
  worked_count: number;
  didnt_work_count: number;
  last_worked_at: string | null;
};

type JsonRecord = Record<string, unknown>;

function jsonResponse(
  body: JsonRecord,
  status = 200,
  headers?: HeadersInit,
  origin?: string,
) {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("Cache-Control")) {
    responseHeaders.set("Cache-Control", "no-store");
  }
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

function parseRecipeFeedbackPayload(
  value: unknown,
): RecipeFeedbackPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as JsonRecord;
  if (
    typeof payload.recipeId !== "string" ||
    !RECIPE_ID_PATTERN.test(payload.recipeId) ||
    (payload.vote !== null &&
      (typeof payload.vote !== "string" ||
        !RECIPE_VOTES.includes(payload.vote as RecipeVote))) ||
    typeof payload.clientId !== "string" ||
    !CLIENT_ID_PATTERN.test(payload.clientId)
  ) {
    return null;
  }

  return {
    recipeId: payload.recipeId,
    vote: payload.vote as RecipeVote | null,
    clientId: payload.clientId,
  };
}

function getRateLimitKey(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown-client"
  );
}

async function hashClientId(clientId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(clientId),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function mapRecipeStats(row: RecipeStatsRow | null): RecipeFeedbackStats {
  return {
    workedCount: Number(row?.worked_count ?? 0),
    didntWorkCount: Number(row?.didnt_work_count ?? 0),
    lastWorkedAt: row?.last_worked_at ?? null,
  };
}

async function readRecipeStats(
  env: Env,
  recipeId: string,
): Promise<RecipeFeedbackStats> {
  const row = await env.DB.prepare(
    `SELECT recipe_id, worked_count, didnt_work_count, last_worked_at
     FROM recipe_feedback_stats
     WHERE recipe_id = ?`,
  )
    .bind(recipeId)
    .first<RecipeStatsRow>();
  return mapRecipeStats(row);
}

async function handleRecipeFeedback(
  request: Request,
  env: Env,
): Promise<Response> {
  const origin = getAllowedOrigin(request);

  if (request.method === "OPTIONS") {
    if (!origin) {
      return jsonResponse({ success: false, error: "Origin not allowed" }, 403);
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  if (request.method === "GET") {
    if (request.headers.has("origin") && !origin) {
      return jsonResponse({ success: false, error: "Origin not allowed" }, 403);
    }

    try {
      const result = await env.DB.prepare(
        `SELECT recipe_id, worked_count, didnt_work_count, last_worked_at
         FROM recipe_feedback_stats`,
      ).all<RecipeStatsRow>();
      const data = Object.fromEntries(
        result.results.map((row) => [row.recipe_id, mapRecipeStats(row)]),
      );

      return jsonResponse(
        { success: true, data },
        200,
        {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "CDN-Cache-Control": "public, max-age=300",
        },
        origin ?? undefined,
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "recipe_feedback_read_failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return jsonResponse(
        { success: false, error: "Failed to load recipe feedback" },
        500,
        undefined,
        origin ?? undefined,
      );
    }
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405,
      { Allow: "GET, POST" },
      origin ?? undefined,
    );
  }

  if (!origin) {
    return jsonResponse({ success: false, error: "Origin not allowed" }, 403);
  }

  const rateLimit = await env.FEEDBACK_RATE_LIMITER.limit({
    key: `recipe:${getRateLimitKey(request)}`,
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
      { success: false, error: "Invalid recipe feedback payload." },
      400,
      undefined,
      origin,
    );
  }

  const body = await readBoundedBody(request);
  if (body === null) {
    return jsonResponse(
      { success: false, error: "Recipe feedback payload is too large." },
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
      { success: false, error: "Invalid recipe feedback payload." },
      400,
      undefined,
      origin,
    );
  }

  const payload = parseRecipeFeedbackPayload(rawPayload);
  if (!payload) {
    return jsonResponse(
      { success: false, error: "Invalid recipe feedback payload." },
      400,
      undefined,
      origin,
    );
  }

  const clientHash = await hashClientId(payload.clientId);
  const updatedAt = new Date().toISOString();

  try {
    const existing = await env.DB.prepare(
      `SELECT vote FROM recipe_feedback
       WHERE recipe_id = ? AND client_hash = ?`,
    )
      .bind(payload.recipeId, clientHash)
      .first<{ vote: RecipeVote }>();

    if ((existing?.vote ?? null) !== payload.vote) {
      const statements: D1PreparedStatement[] = [];

      if (!payload.vote && existing) {
        const removedWorked = existing.vote === "worked" ? 1 : 0;
        const removedDidntWork = existing.vote === "didnt_work" ? 1 : 0;
        statements.push(
          env.DB.prepare(
            `DELETE FROM recipe_feedback
             WHERE recipe_id = ? AND client_hash = ?`,
          ).bind(payload.recipeId, clientHash),
          env.DB.prepare(
            `UPDATE recipe_feedback_stats
             SET worked_count = MAX(0, worked_count - ?),
                 didnt_work_count = MAX(0, didnt_work_count - ?),
                 last_worked_at = CASE
                   WHEN ? = 1 THEN (
                     SELECT MAX(updated_at) FROM recipe_feedback
                     WHERE recipe_id = ? AND vote = 'worked'
                   )
                   ELSE last_worked_at
                 END
             WHERE recipe_id = ?`,
          ).bind(
            removedWorked,
            removedDidntWork,
            removedWorked,
            payload.recipeId,
            payload.recipeId,
          ),
        );
      } else if (payload.vote && !existing) {
        const addedWorked = payload.vote === "worked" ? 1 : 0;
        const addedDidntWork = payload.vote === "didnt_work" ? 1 : 0;
        statements.push(
          env.DB.prepare(
            `INSERT INTO recipe_feedback
               (recipe_id, client_hash, vote, updated_at)
             VALUES (?, ?, ?, ?)`,
          ).bind(payload.recipeId, clientHash, payload.vote, updatedAt),
          env.DB.prepare(
            `INSERT INTO recipe_feedback_stats
               (recipe_id, worked_count, didnt_work_count, last_worked_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(recipe_id) DO UPDATE SET
               worked_count = worked_count + excluded.worked_count,
               didnt_work_count = didnt_work_count + excluded.didnt_work_count,
               last_worked_at = COALESCE(
                 excluded.last_worked_at,
                 last_worked_at
               )`,
          ).bind(
            payload.recipeId,
            addedWorked,
            addedDidntWork,
            addedWorked ? updatedAt : null,
          ),
        );
      } else if (payload.vote && existing) {
        const addedWorked = payload.vote === "worked" ? 1 : 0;
        const addedDidntWork = payload.vote === "didnt_work" ? 1 : 0;
        const removedWorked = existing.vote === "worked" ? 1 : 0;
        const removedDidntWork = existing.vote === "didnt_work" ? 1 : 0;
        statements.push(
          env.DB.prepare(
            `UPDATE recipe_feedback
             SET vote = ?, updated_at = ?
             WHERE recipe_id = ? AND client_hash = ?`,
          ).bind(payload.vote, updatedAt, payload.recipeId, clientHash),
          env.DB.prepare(
            `UPDATE recipe_feedback_stats
             SET worked_count = MAX(
                   0,
                   worked_count + ? - ?
                 ),
                 didnt_work_count = MAX(
                   0,
                   didnt_work_count + ? - ?
                 ),
                 last_worked_at = CASE
                   WHEN ? = 1 THEN ?
                   WHEN ? = 1 THEN (
                     SELECT MAX(updated_at) FROM recipe_feedback
                     WHERE recipe_id = ? AND vote = 'worked'
                   )
                   ELSE last_worked_at
                 END
             WHERE recipe_id = ?`,
          ).bind(
            addedWorked,
            removedWorked,
            addedDidntWork,
            removedDidntWork,
            addedWorked,
            updatedAt,
            removedWorked,
            payload.recipeId,
            payload.recipeId,
          ),
        );
      }

      if (statements.length > 0) {
        const results = await env.DB.batch(statements);
        if (results.some((result) => !result.success)) {
          throw new Error("D1 recipe feedback update was unsuccessful");
        }
      }
    }

    const stats = await readRecipeStats(env, payload.recipeId);
    return jsonResponse(
      {
        success: true,
        data: {
          recipeId: payload.recipeId,
          stats,
          userVote: payload.vote,
        },
      },
      200,
      undefined,
      origin,
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "recipe_feedback_update_failed",
        recipeId: payload.recipeId,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    return jsonResponse(
      { success: false, error: "Failed to save recipe feedback" },
      500,
      undefined,
      origin,
    );
  }
}

export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === RECIPE_FEEDBACK_PATH) {
    return handleRecipeFeedback(request, env);
  }

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
