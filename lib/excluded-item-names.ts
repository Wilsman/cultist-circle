import type { SimplifiedItem } from "@/types/SimplifiedItem";

export function isItemNameExcluded(
  item: SimplifiedItem,
  names: ReadonlySet<string>,
): boolean {
  return [
    item.name,
    item.shortName,
    item.englishName,
    item.englishShortName,
  ].some((name) => !!name && names.has(name.toLowerCase()));
}
