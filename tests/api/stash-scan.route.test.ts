// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/stash-scan/route";

vi.mock("@/lib/stash-scan/index-store", () => ({
  getIconIndex: vi.fn(),
  isIndexUnavailable: vi.fn(),
}));
import { getIconIndex } from "@/lib/stash-scan/index-store";

function request(rects?: string) {
  const form = new FormData();
  form.set(
    "images",
    new File(["invalid image"], "sample.png", { type: "image/png" }),
  );
  if (rects) form.set("rects", rects);
  return new NextRequest("http://localhost/api/stash-scan", {
    method: "POST",
    body: form,
  });
}

describe("stash scan trial boundary", () => {
  beforeEach(() => {
    vi.stubEnv("STASH_SCAN_ENABLED", "true");
    vi.stubEnv("STASH_SCAN_TRIAL_EXPIRES_AT", "2099-01-01T00:00:00Z");
    vi.stubEnv("VERCEL_ENV", "preview");
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each(["production", "disabled", "expired", "missing-expiry"])(
    "refuses %s before parsing or loading the index",
    async (mode) => {
      if (mode === "production") vi.stubEnv("VERCEL_ENV", "production");
      if (mode === "disabled") vi.stubEnv("STASH_SCAN_ENABLED", "false");
      if (mode === "expired")
        vi.stubEnv("STASH_SCAN_TRIAL_EXPIRES_AT", "2000-01-01T00:00:00Z");
      if (mode === "missing-expiry")
        vi.stubEnv("STASH_SCAN_TRIAL_EXPIRES_AT", "");
      const req = request();
      const parse = vi.spyOn(req, "formData");
      expect((await POST(req)).status).toBe(503);
      expect(parse).not.toHaveBeenCalled();
      expect(getIconIndex).not.toHaveBeenCalled();
    },
  );
  it("checks availability without loading the index", async () => {
    expect((await GET()).status).toBe(200);
    expect(getIconIndex).not.toHaveBeenCalled();
  });
  it.each(["[null]", "[[]]", "[42]", "[{}]", "{", "[]"])(
    "rejects malformed rectangles %s with 400",
    async (rects) => {
      expect((await POST(request(rects))).status).toBe(400);
      expect(getIconIndex).not.toHaveBeenCalled();
    },
  );
  it("rejects multiple images before loading the index", async () => {
    const form = new FormData();
    for (let i = 0; i < 2; i++)
      form.append("images", new File(["x"], "x.png", { type: "image/png" }));
    const req = new NextRequest("http://localhost/api/stash-scan", {
      method: "POST",
      body: form,
    });
    expect((await POST(req)).status).toBe(400);
    expect(getIconIndex).not.toHaveBeenCalled();
  });
  it("allows a small trial budget per client, then rate-limits", async () => {
    const headers = { "x-forwarded-for": "trial-budget-client" };
    const upload = () => {
      const form = new FormData();
      form.set(
        "images",
        new File(["invalid image"], "sample.png", { type: "image/png" }),
      );
      return new NextRequest("http://localhost/api/stash-scan", {
        method: "POST",
        headers,
        body: form,
      });
    };
    for (let i = 0; i < 10; i++) {
      // The index is mocked away; 503 here proves the request was admitted.
      expect((await POST(upload())).status).toBe(503);
    }
    const limited = await POST(upload());
    expect(limited.status).toBe(429);
    expect(((await limited.json()) as { code: string }).code).toBe(
      "rate-limited",
    );
  });
});
