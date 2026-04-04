import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const originalEnv = { ...process.env };

describe("supabaseClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock("@supabase/supabase-js");
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  test("does not throw on import when Supabase env vars are missing", async () => {
    const module = await import("@/lib/supabaseClient");

    expect(module.isSupabaseConfigured()).toBe(false);
    expect(() => module.createSupabaseClient()).toThrowError(
      "Missing Supabase environment variables"
    );
  });

  test("creates a client from NEXT_PUBLIC Supabase env vars when server vars are absent", async () => {
    const createClientMock = vi.fn(() => ({ from: vi.fn() }));

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: createClientMock,
    }));

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const module = await import("@/lib/supabaseClient");

    module.createSupabaseClient();

    expect(module.isSupabaseConfigured()).toBe(true);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      {
        auth: {
          persistSession: false,
        },
      }
    );
  });
});
