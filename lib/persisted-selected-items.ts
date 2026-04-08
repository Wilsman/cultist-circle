import { SimplifiedItem } from "@/types/SimplifiedItem";

export const SELECTED_ITEM_IDS_STORAGE_KEY = "selectedItemIds";
export const SELECTED_ITEM_SLOT_COUNT = 5;

function createEmptySelectedItemIds(): Array<string | null> {
  return Array.from({ length: SELECTED_ITEM_SLOT_COUNT }, () => null);
}

function normalizePersistedSelectedItemIds(
  value: unknown,
): Array<string | null> {
  if (!Array.isArray(value)) {
    return createEmptySelectedItemIds();
  }

  return Array.from({ length: SELECTED_ITEM_SLOT_COUNT }, (_, index) => {
    const itemId = value[index];
    return typeof itemId === "string" && itemId.length > 0 ? itemId : null;
  });
}

export function getPersistedSelectedItemIds(
  selectedItems: Array<SimplifiedItem | null>,
): Array<string | null> {
  return Array.from({ length: SELECTED_ITEM_SLOT_COUNT }, (_, index) => {
    return selectedItems[index]?.id ?? null;
  });
}

export function parsePersistedSelectedItemIds(
  storedValue: string | null,
): Array<string | null> {
  if (!storedValue) {
    return createEmptySelectedItemIds();
  }

  try {
    return normalizePersistedSelectedItemIds(JSON.parse(storedValue));
  } catch {
    return createEmptySelectedItemIds();
  }
}

export function restoreSelectedItemsFromIds(
  itemIds: Array<string | null>,
  items: SimplifiedItem[],
): Array<SimplifiedItem | null> {
  const itemsById = new Map(items.map((item) => [item.id, item] as const));

  return normalizePersistedSelectedItemIds(itemIds).map((itemId) => {
    if (!itemId) {
      return null;
    }

    return itemsById.get(itemId) ?? null;
  });
}

export function remapSelectedItemsToCurrentData(
  selectedItems: Array<SimplifiedItem | null>,
  items: SimplifiedItem[],
): Array<SimplifiedItem | null> {
  return restoreSelectedItemsFromIds(
    getPersistedSelectedItemIds(selectedItems),
    items,
  );
}
