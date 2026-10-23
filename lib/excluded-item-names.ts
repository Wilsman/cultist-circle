import type { SimplifiedItem } from "@/types/SimplifiedItem";

type NamedItem = Pick<
  SimplifiedItem,
  "name" | "shortName" | "englishName" | "englishShortName"
>;

function itemNames(item: NamedItem): string[] {
  return [
    item.name,
    item.shortName,
    item.englishName,
    item.englishShortName,
  ].filter((name): name is string => !!name);
}

/** Lowercased copy of the stored exclusion names, for case-insensitive lookups. */
export function toExcludedNameLookup(names: Iterable<string>): Set<string> {
  return new Set(Array.from(names, (name) => name.toLowerCase()));
}

/**
 * True when any of the item's localized or English names is excluded.
 * `names` must be lowercased (see `toExcludedNameLookup`).
 */
export function isItemNameExcluded(
  item: NamedItem,
  names: ReadonlySet<string>,
): boolean {
  return itemNames(item).some((name) => names.has(name.toLowerCase()));
}

/**
 * Toggles an item's exclusion. Removes every stored name that matches the item
 * in any language; otherwise stores its English name so the exclusion keeps
 * working after the language changes.
 */
export function toggleItemExclusion(
  excluded: ReadonlySet<string>,
  item: NamedItem,
): Set<string> {
  const names = toExcludedNameLookup(itemNames(item));
  const next = new Set(excluded);
  const matches = Array.from(excluded).filter((name) =>
    names.has(name.toLowerCase()),
  );
  if (matches.length > 0) {
    for (const name of matches) next.delete(name);
  } else {
    next.add(item.englishName || item.name);
  }
  return next;
}
