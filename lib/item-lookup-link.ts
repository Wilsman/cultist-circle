// Dependency-free so the globally mounted shortcut shell stays tiny

export const ITEM_LOOKUP_URL_PARAM = "item";
export const ITEM_LOOKUP_OPEN_EVENT = "cc:open-item-lookup";
export const ITEM_LOOKUP_PREWARM_EVENT = "cc:prewarm-item-lookup";

export function buildItemLookupUrl(origin: string, itemId: string): string {
  const url = new URL("/", origin);
  url.searchParams.set(ITEM_LOOKUP_URL_PARAM, itemId);
  return url.toString();
}

export function readItemLookupParam(search: string): string | null {
  const value = new URLSearchParams(search).get(ITEM_LOOKUP_URL_PARAM);
  return value && /^[a-z0-9]{6,32}$/i.test(value) ? value : null;
}
