/** Local fallback shown when an item has no icon or tarkov.dev returns its placeholder. */
export const UNKNOWN_ITEM_ICON = "/images/unknown-item.webp";

/** True when the URL is missing or is tarkov.dev's "unknown-item" placeholder. */
export function isMissingItemIcon(url: string | null | undefined): boolean {
  return !url || url.includes("unknown-item");
}

/** Returns the item's icon, or our local fallback when it is missing. */
export function resolveItemIcon(url: string | null | undefined): string {
  return isMissingItemIcon(url) ? UNKNOWN_ITEM_ICON : (url as string);
}
