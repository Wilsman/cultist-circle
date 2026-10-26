import { describe, expect, test, vi } from "vitest";
import { handleRequest } from "@/cloudflare/feedback/src/index";

const URL = "https://cultist-circle-feedback.example/api/base-value-lab";
const valid = {
  testId: "6f1c6d2e-6c0b-4d4e-9a49-0b8c2a7e5d11",
  mode: "pve",
  entries: [{ subjectId: "mp5-default", qty: 5 }],
  fillers: [
    {
      itemId: "590a3d9c86f774385926e510",
      name: "Ultraviolet lamp",
      baseValue: 15554,
      qty: 1,
    },
  ],
  timer: "6h",
  hideoutSkill: 12,
  contributor: "Tester",
};

function createEnv({ known = 1, limited = false } = {}) {
  const run = vi.fn().mockResolvedValue({ success: true, meta: {} });
  const first = vi.fn().mockResolvedValue({ n: known });
  const bind = vi.fn().mockReturnValue({ run, first });
  const prepare = vi.fn().mockReturnValue({ bind });
  const batch = vi.fn().mockResolvedValue([
    {
      results: [
        {
          data_json: JSON.stringify({
            id: "mp5-default",
            mode: "pve",
            name: "MP5",
            kind: "weapon",
          }),
        },
      ],
    },
    {
      results: [
        {
          data_json: JSON.stringify({
            id: "t1",
            mode: "pve",
            entries: [],
            fillers: [],
            timer: "6h",
          }),
          source: "contributor",
          contributor: "Tester",
        },
        { data_json: "not json", source: "owner", contributor: null },
      ],
    },
  ]);
  const limit = vi.fn().mockResolvedValue({ success: !limited });
  const env = {
    DB: { prepare, batch },
    FEEDBACK_RATE_LIMITER: { limit },
  } as unknown as Env;
  return { env, prepare, bind, run, limit };
}

function post(body: unknown, origin = "https://cultistcircle.com") {
  return new Request(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "CF-Connecting-IP": "203.0.113.7",
    },
    body: JSON.stringify(body),
  });
}

describe("Base Value Lab API", () => {
  test("returns shared subjects and tests, skipping unreadable rows", async () => {
    const { env } = createEnv();
    const response = await handleRequest(
      new Request(URL, { headers: { Origin: "https://cultistcircle.com" } }),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { subjects: unknown[]; tests: unknown[] };
    };
    expect(body.data.subjects).toHaveLength(1);
    expect(body.data.tests).toEqual([
      expect.objectContaining({
        id: "t1",
        source: "contributor",
        contributor: "Tester",
      }),
    ]);
  });

  test("saves a contributor's test", async () => {
    const { env, bind, prepare, limit } = createEnv();
    const response = await handleRequest(post(valid), env);
    expect(response.status).toBe(201);
    expect(limit).toHaveBeenCalledWith({ key: "bvl:203.0.113.7" });
    expect(prepare.mock.calls[1][0]).toContain("ON CONFLICT(id) DO NOTHING");
    const [id, mode, json, contributor] = bind.mock.calls[1];
    expect([id, mode, contributor]).toEqual([valid.testId, "pve", "Tester"]);
    expect(JSON.parse(json)).toMatchObject({
      id: valid.testId,
      entries: valid.entries,
      fillers: valid.fillers,
      timer: "6h",
      hideoutSkill: 12,
    });
  });

  test("saves the game mode a contributor plays, when given", async () => {
    const { env, bind } = createEnv();
    await handleRequest(post({ ...valid, playedMode: "season" }), env);
    expect(JSON.parse(bind.mock.calls[1][2])).toMatchObject({
      playedMode: "season",
    });
    const plain = createEnv();
    await handleRequest(post(valid), plain.env);
    expect(JSON.parse(plain.bind.mock.calls[1][2])).not.toHaveProperty(
      "playedMode",
    );
  });

  test("rejects a test for an item that isn't being tested", async () => {
    const { env, run } = createEnv({ known: 0 });
    const response = await handleRequest(post(valid), env);
    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  test.each([
    { timer: "7h" },
    { mode: "season" },
    { entries: [] },
    { entries: [{ subjectId: "bad id!", qty: 1 }] },
    {
      entries: [
        { subjectId: "a", qty: 1 },
        { subjectId: "a", qty: 2 },
      ],
    },
    { hideoutSkill: 52 },
    { playedMode: "arena" },
    { fillers: [{ name: "x", baseValue: -1, qty: 1 }] },
    { extra: true },
  ])("rejects an invalid test %o", async (change) => {
    const { env, run } = createEnv();
    const response = await handleRequest(post({ ...valid, ...change }), env);
    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  test("blocks other sites and rate-limited clients", async () => {
    const blocked = createEnv();
    expect(
      (await handleRequest(post(valid, "https://evil.example"), blocked.env))
        .status,
    ).toBe(403);
    const limited = createEnv({ limited: true });
    expect((await handleRequest(post(valid), limited.env)).status).toBe(429);
    expect(limited.run).not.toHaveBeenCalled();
  });
});
