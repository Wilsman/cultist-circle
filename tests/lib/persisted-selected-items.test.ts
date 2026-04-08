import {
  getPersistedSelectedItemIds,
  parsePersistedSelectedItemIds,
  remapSelectedItemsToCurrentData,
  restoreSelectedItemsFromIds,
  SELECTED_ITEM_SLOT_COUNT,
} from "@/lib/persisted-selected-items";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

function createItem(id: string, name: string): SimplifiedItem {
  return {
    id,
    name,
    shortName: name,
    basePrice: 1000,
  };
}

describe("persisted selected items", () => {
  it("serializes slot ids in order and pads to five slots", () => {
    const selectedItems: Array<SimplifiedItem | null> = [
      createItem("item-1", "Alpha"),
      null,
      createItem("item-3", "Charlie"),
    ];

    expect(getPersistedSelectedItemIds(selectedItems)).toEqual([
      "item-1",
      null,
      "item-3",
      null,
      null,
    ]);
  });

  it("returns an empty slot list for invalid persisted data", () => {
    expect(parsePersistedSelectedItemIds("not-json")).toEqual(
      Array(SELECTED_ITEM_SLOT_COUNT).fill(null),
    );
    expect(parsePersistedSelectedItemIds(JSON.stringify("wrong-shape"))).toEqual(
      Array(SELECTED_ITEM_SLOT_COUNT).fill(null),
    );
  });

  it("restores items by id and drops ids that no longer exist", () => {
    const items = [
      createItem("item-1", "Alpha"),
      createItem("item-2", "Bravo"),
    ];

    expect(
      restoreSelectedItemsFromIds(
        ["item-2", "missing-item", null, "item-1", null],
        items,
      ),
    ).toEqual([items[1], null, null, items[0], null]);
  });

  it("remaps persisted selections onto the latest item objects", () => {
    const englishSelectedItems = [
      createItem("item-1", "Antique Vase"),
      null,
      createItem("item-3", "Roler"),
      null,
      null,
    ];
    const localizedItems = [
      createItem("item-1", "Antike Vase"),
      createItem("item-3", "Roler (DE)"),
    ];

    expect(
      remapSelectedItemsToCurrentData(englishSelectedItems, localizedItems),
    ).toEqual([localizedItems[0], null, localizedItems[1], null, null]);
  });
});
