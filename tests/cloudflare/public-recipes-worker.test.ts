import { describe, expect, test, vi } from "vitest";
import { handleRequest } from "@/cloudflare/feedback/src/index";
import {
  formatRecipeText,
  searchRecipes,
} from "@/cloudflare/feedback/src/public-recipes";
import { tarkovRecipes, type Recipe } from "@/data/recipes";

type PublicRecipe = { votes: { worked: number } } & Record<string, unknown>;
type PublicRecipesBody = {
  success: boolean;
  total: number;
  expiredTotal: number;
  recipes: PublicRecipe[];
  expired: PublicRecipe[];
};

async function readBody(response: Response) {
  return (await response.json()) as PublicRecipesBody;
}

const fenceRecipe = tarkovRecipes.find(
  (recipe) => recipe.requiredItems[0] === "1x Fence figurine",
)!;

function statsRow(recipeId: string) {
  return {
    recipe_id: recipeId,
    worked_count: 12,
    didnt_work_count: 1,
    last_worked_at: "2026-09-03T10:00:00.000Z",
    last_worked_mode: "pvp",
    last_didnt_work_at: null,
    last_didnt_work_mode: null,
    worked_pvp: 12,
    worked_pve: 0,
    worked_season: 0,
    didnt_work_pvp: 1,
    didnt_work_pve: 0,
    didnt_work_season: 0,
    last_worked_pvp_at: "2026-09-03T10:00:00.000Z",
    last_worked_pve_at: null,
    last_worked_season_at: null,
    last_didnt_work_pvp_at: null,
    last_didnt_work_pve_at: null,
    last_didnt_work_season_at: null,
  };
}

function createEnv(
  allMock = vi.fn().mockResolvedValue({ results: [statsRow(fenceRecipe.id)] }),
) {
  const prepareMock = vi.fn((query: string) => {
    void query;
    return { all: allMock };
  });
  const env = {
    DB: { prepare: prepareMock },
    FEEDBACK_RATE_LIMITER: { limit: vi.fn() },
  } as unknown as Env;
  return { env, prepareMock };
}

function get(query: string, init?: RequestInit, path = "/api/recipes") {
  return new Request(
    `https://cultist-circle-feedback.cultistcircle.workers.dev${path}${query}`,
    init,
  );
}

describe("Public recipes endpoint", () => {
  test("returns matching recipes with community votes as JSON", async () => {
    const { env, prepareMock } = createEnv();
    const response = await handleRequest(get("?q=fence"), env);

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toContain("max-age=60");
    const body = await readBody(response);
    expect(body.success).toBe(true);
    expect(body.recipes[0]).toMatchObject({
      id: fenceRecipe.id,
      requiredItems: ["1x Fence figurine"],
      craftingTime: "66 mins",
      rewards: ["3x Fence figurine"],
      url: `https://cultistcircle.com/recipes?recipe=${fenceRecipe.id}`,
      votes: { worked: 12, didntWork: 1, lastWorkedMode: "pvp" },
    });
    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(String(prepareMock.mock.calls[0][0])).toContain(
      "FROM recipe_feedback_stats",
    );
  });

  test("answers with one chat-ready line in text mode", async () => {
    const { env } = createEnv();
    const response = await handleRequest(
      get("?q=fence%20figurine&format=text"),
      env,
    );

    expect(response.headers.get("content-type")).toContain("text/plain");
    const text = await response.text();
    expect(text).toMatch(/^1x Fence figurine → 3x Fence figurine \(66 mins\)/);
    expect(text).toContain("✅ 12 / ❌ 1, last worked");
    expect(text).toContain(
      `cultistcircle.com/recipes?recipe=${fenceRecipe.id}`,
    );
    expect(text.length).toBeLessThanOrEqual(450);
  });

  test("still answers when the vote read fails", async () => {
    const { env } = createEnv(vi.fn().mockRejectedValue(new Error("D1 down")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handleRequest(get("?q=fence"), env);

    expect(response.status).toBe(200);
    const body = await readBody(response);
    expect(body.recipes[0].votes.worked).toBe(0);
  });

  test("reports no match and rejects writes", async () => {
    const { env } = createEnv();
    expect(
      await (
        await handleRequest(get("?q=zzznotanitem&format=text"), env)
      ).text(),
    ).toBe(
      'No recipe found for "zzznotanitem". Full list: https://cultistcircle.com/recipes',
    );
    expect((await handleRequest(get("", { method: "POST" }), env)).status).toBe(
      405,
    );
    expect(
      (await handleRequest(get("", { method: "OPTIONS" }), env)).status,
    ).toBe(204);
  });

  test("returns the whole catalog without a search, expired listed apart", async () => {
    const { env } = createEnv();
    const body = await readBody(await handleRequest(get(""), env));
    const activeCount = tarkovRecipes.filter((r) => !r.expiredAt).length;

    expect(body.total).toBe(activeCount);
    expect(body.recipes).toHaveLength(activeCount);
    expect(body.expired).toHaveLength(tarkovRecipes.length - activeCount);
    expect(body.expiredTotal).toBe(tarkovRecipes.length - activeCount);
    expect(body.recipes.every((r) => r.expired === false)).toBe(true);
    expect(body.expired.every((r) => r.expired === true)).toBe(true);
    expect(
      body.recipes.find((r) => r.id === fenceRecipe.id)?.votes.worked,
    ).toBe(12);
  });

  test("caps each JSON list with limit and reports the full totals", async () => {
    const { env } = createEnv();
    const body = await readBody(await handleRequest(get("?limit=2"), env));
    expect(body.recipes).toHaveLength(2);
    expect(body.expired.length).toBeLessThanOrEqual(2);
    expect(body.total).toBe(
      tarkovRecipes.filter((recipe) => !recipe.expiredAt).length,
    );
  });
});

describe("Public endpoints listing", () => {
  test("lists the public endpoints and rejects writes", async () => {
    const { env, prepareMock } = createEnv();
    const response = await handleRequest(
      get("", undefined, "/api/endpoints"),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = (await response.json()) as {
      baseUrl: string;
      endpoints: { path: string }[];
    };
    expect(body.baseUrl).toBe(
      "https://cultist-circle-feedback.cultistcircle.workers.dev",
    );
    expect(body.endpoints.map((endpoint) => endpoint.path)).toEqual([
      "/api/endpoints",
      "/api/recipes",
    ]);
    expect(prepareMock).not.toHaveBeenCalled();
    expect(
      (await handleRequest(get("", { method: "POST" }, "/api/endpoints"), env))
        .status,
    ).toBe(405);
  });
});

describe("Recipe search", () => {
  const recipes = [
    {
      id: "a",
      requiredItems: ["1x Gold skull"],
      craftingTime: "66 mins",
      producedItems: ["1x Fence figurine"],
    },
    {
      id: "b",
      requiredItems: ["1x Fence figurine"],
      craftingTime: "66 mins",
      producedItems: ["3x Fence figurine"],
    },
    {
      id: "c",
      requiredItems: ["1x Fence figurine", "1x Wedge"],
      craftingTime: "66 mins",
      producedItems: [],
      expiredAt: "2026-10-01",
    },
  ] satisfies Recipe[];

  test("ranks sacrifice matches first and puts expired recipes last", () => {
    expect(searchRecipes(recipes, "Fence").map((r) => r.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(searchRecipes(recipes, "wedge").map((r) => r.id)).toEqual(["c"]);
    expect(searchRecipes(recipes, "").map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  test("labels expired and unknown-reward recipes in chat text", () => {
    const text = formatRecipeText([recipes[2]], new Map(), "wedge");
    expect(text).toContain("reward unknown");
    expect(text).toContain("EXPIRED 2026-10-01");
  });
});
