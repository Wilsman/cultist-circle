import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

export const MISSING_SUPABASE_ENV_ERROR =
  "Missing Supabase environment variables";

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const url =
    process.env.SUPABASE_URL?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

export function createSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(MISSING_SUPABASE_ENV_ERROR);
  }

  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: false,
    },
  });
}
