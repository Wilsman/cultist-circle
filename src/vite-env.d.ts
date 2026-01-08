/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TARKOV_GRAPHQL_URL?: string;
  readonly VITE_SHOW_MAINTENANCE_NOTICE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
