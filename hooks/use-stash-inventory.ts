"use client";

import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import {
  parseStashInventory,
  STASH_INVENTORY_STORAGE_KEY,
  type StashInventory,
} from "@/lib/stash-inventory";

export function useStashInventory(): [
  StashInventory | null,
  (value: StashInventory | null | ((prev: StashInventory | null) => StashInventory | null)) => void,
] {
  return useLocalStorageState<StashInventory | null>(
    STASH_INVENTORY_STORAGE_KEY,
    null,
    {
      serialize: JSON.stringify,
      deserialize: (stored) => {
        try {
          return parseStashInventory(JSON.parse(stored));
        } catch {
          return null;
        }
      },
    },
  );
}
