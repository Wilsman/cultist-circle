const FEEDBACK_PATH = "/api/submit-feedback";
const RECIPE_FEEDBACK_PATH = "/api/recipe-feedback";
const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_SECONDS = 60;
const FEEDBACK_TYPES = ["Issue", "Feature", "Suggestion", "Recipe"] as const;
const RECIPE_VOTES = ["worked", "didnt_work"] as const;
const RECIPE_GAME_MODES = ["pvp", "pve", "season"] as const;
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
type RecipeGameMode = (typeof RECIPE_GAME_MODES)[number];

const RECIPE_CATALOG = new Map(
  tarkovRecipes.map((recipe) => [recipe.id, recipe.modeRestriction] as const),
);

type FeedbackPayload = {
  type: FeedbackType;
  description: string;
  version?: string;
};

type RecipeFeedbackPayload = {
  recipeId: string;
  vote: RecipeVote | null;
  clientId: string;
  gameMode: RecipeGameMode | null;
};

type RecipeFeedbackModeCounts = {
  worked: number;
  didntWork: number;
};

type RecipeFeedbackStats = {
  workedCount: number;
  didntWorkCount: number;
  lastWorkedAt: string | null;
  lastWorkedMode: RecipeGameMode | null;
  modes: Record<RecipeGameMode, RecipeFeedbackModeCounts>;
};

type RecipeStatsRow = {
  recipe_id: string;
  worked_count: number;
  didnt_work_count: number;
  last_worked_at: string | null;
  last_worked_mode: RecipeGameMode | null;
  worked_pvp: number | null;
  worked_pve: number | null;
  worked_season: number | null;
  didnt_work_pvp: number | null;
  didnt_work_pve: number | null;
  didnt_work_season: number | null;
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
  const recipeRestriction =
    typeof payload.recipeId === "string"
      ? RECIPE_CATALOG.get(payload.recipeId)
      : undefined;
  if (
    typeof payload.recipeId !== "string" ||
    !RECIPE_CATALOG.has(payload.recipeId) ||
    (payload.vote !== null &&
      (typeof payload.vote !== "string" ||
        !RECIPE_VOTES.includes(payload.vote as RecipeVote))) ||
    (payload.gameMode !== undefined &&
      payload.gameMode !== null &&
      (typeof payload.gameMode !== "string" ||
        !RECIPE_GAME_MODES.includes(payload.gameMode as RecipeGameMode))) ||
    (payload.vote !== null &&
      (payload.gameMode === undefined || payload.gameMode === null)) ||
    (payload.vote === null &&
      payload.gameMode !== undefined &&
      payload.gameMode !== null) ||
    (payload.vote !== null &&
      recipeRestriction === "pvp-only" &&
      payload.gameMode !== "pvp") ||
    typeof payload.clientId !== "string" ||
    !CLIENT_ID_PATTERN.test(payload.clientId)
  ) {
    return null;
  }

  return {
    recipeId: payload.recipeId,
    vote: payload.vote as RecipeVote | null,
    clientId: payload.clientId,
    gameMode: (payload.gameMode ?? null) as RecipeGameMode | null,
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
    lastWorkedMode: row?.last_worked_mode ?? null,
    modes: {
      pvp: {
        worked: Number(row?.worked_pvp ?? 0),
        didntWork: Number(row?.didnt_work_pvp ?? 0),
      },
      pve: {
        worked: Number(row?.worked_pve ?? 0),
        didntWork: Number(row?.didnt_work_pve ?? 0),
      },
      season: {
        worked: Number(row?.worked_season ?? 0),
        didntWork: Number(row?.didnt_work_season ?? 0),
      },
    },
  };
}

const RECIPE_STATS_COLUMNS = `recipe_id, worked_count, didnt_work_count, last_worked_at, last_worked_mode,
   worked_pvp, worked_pve, worked_season,
   didnt_work_pvp, didnt_work_pve, didnt_work_season`;

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
        `SELECT ${RECIPE_STATS_COLUMNS}
         FROM recipe_feedback_stats`,
      ).all<RecipeStatsRow>();
      const data = Object.fromEntries(
        result.results.map((row) => [row.recipe_id, mapRecipeStats(row)]),
      );

      return jsonResponse(
        { success: true, data },
        200,
        {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
          "CDN-Cache-Control": "public, max-age=60",
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
    const mutation = payload.vote
      ? env.DB.prepare(
          `INSERT INTO recipe_feedback
             (recipe_id, client_hash, vote, game_mode, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(recipe_id, client_hash) DO UPDATE SET
             vote = excluded.vote,
             game_mode = excluded.game_mode,
             updated_at = excluded.updated_at
           WHERE recipe_feedback.vote IS NOT excluded.vote
              OR recipe_feedback.game_mode IS NOT excluded.game_mode`,
        ).bind(
          payload.recipeId,
          clientHash,
          payload.vote,
          payload.gameMode,
          updatedAt,
        )
      : env.DB.prepare(
          `DELETE FROM recipe_feedback
           WHERE recipe_id = ? AND client_hash = ?`,
        ).bind(payload.recipeId, clientHash);

    const rebuildAggregate = env.DB.prepare(
      `INSERT INTO recipe_feedback_stats
         (recipe_id, worked_count, didnt_work_count, last_worked_at, last_worked_mode,
          worked_pvp, worked_pve, worked_season,
          didnt_work_pvp, didnt_work_pve, didnt_work_season)
       SELECT ?,
         COALESCE(SUM(CASE WHEN vote = 'worked' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN vote = 'didnt_work' THEN 1 ELSE 0 END), 0),
         MAX(CASE WHEN vote = 'worked' THEN updated_at END),
         (SELECT latest.game_mode
            FROM recipe_feedback AS latest
           WHERE latest.recipe_id = ? AND latest.vote = 'worked'
           ORDER BY latest.updated_at DESC
           LIMIT 1),
         COALESCE(SUM(CASE WHEN vote = 'worked' AND game_mode = 'pvp' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN vote = 'worked' AND game_mode = 'pve' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN vote = 'worked' AND game_mode = 'season' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN vote = 'didnt_work' AND game_mode = 'pvp' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN vote = 'didnt_work' AND game_mode = 'pve' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN vote = 'didnt_work' AND game_mode = 'season' THEN 1 ELSE 0 END), 0)
       FROM recipe_feedback
       WHERE recipe_id = ?
       ON CONFLICT(recipe_id) DO UPDATE SET
         worked_count = excluded.worked_count,
         didnt_work_count = excluded.didnt_work_count,
         last_worked_at = excluded.last_worked_at,
         last_worked_mode = excluded.last_worked_mode,
         worked_pvp = excluded.worked_pvp,
         worked_pve = excluded.worked_pve,
         worked_season = excluded.worked_season,
         didnt_work_pvp = excluded.didnt_work_pvp,
         didnt_work_pve = excluded.didnt_work_pve,
         didnt_work_season = excluded.didnt_work_season`,
    ).bind(payload.recipeId, payload.recipeId, payload.recipeId);
    const readAggregate = env.DB.prepare(
      `SELECT ${RECIPE_STATS_COLUMNS}
       FROM recipe_feedback_stats
       WHERE recipe_id = ?`,
    ).bind(payload.recipeId);

    const results = await env.DB.batch<RecipeStatsRow>([
      mutation,
      rebuildAggregate,
      readAggregate,
    ]);
    if (results.some((result) => !result.success)) {
      throw new Error("D1 recipe feedback transaction was unsuccessful");
    }
    const stats = mapRecipeStats(results[2]?.results?.[0] ?? null);
    return jsonResponse(
      {
        success: true,
        data: {
          recipeId: payload.recipeId,
          stats,
          userVote: payload.vote,
          userMode: payload.vote ? payload.gameMode : null,
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
import { tarkovRecipes } from "../../../data/recipes";
