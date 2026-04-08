"use client";

import { useMemo } from "react";
import { SimplifiedItem } from "@/types/SimplifiedItem";
import { CATEGORY_ID_BY_NAME } from "@/config/item-categories";

export interface FilteredItemsOptions {
    /** Raw items data from API */
    rawItems: SimplifiedItem[];
    /** Whether data is still loading */
    loading: boolean;
    /** Category IDs to exclude */
    excludedCategories: Set<string>;
    /** Item names to individually exclude */
    excludedItems: Set<string>;
    /** Whether to apply individual exclusions */
    excludeIncompatible: boolean;
    /** Sort option key */
    sortOption: string;
    /** Whether to filter by player level */
    useLevelFilter: boolean;
    /** Current player level for filtering */
    playerLevel: number;
    /** Whether to bypass all filters */
    ignoreFilters: boolean;
}

/**
 * Hook to filter and sort items based on various criteria.
 * Extracted from app.tsx for better separation of concerns.
 */
export function useFilteredItems({
    rawItems,
    loading,
    excludedCategories,
    excludedItems,
    excludeIncompatible,
    sortOption,
    useLevelFilter,
    playerLevel,
    ignoreFilters,
}: FilteredItemsOptions): SimplifiedItem[] {
    return useMemo(() => {
        if (loading || !rawItems) {
            return [];
        }

        if (!Array.isArray(rawItems)) {
            console.error("rawItems is not an array:", rawItems);
            return [];
        }

        // Step 1: Filter by excluded categories
        const categoryFiltered = rawItems.filter((item: SimplifiedItem) => {
            if (item.name.toLowerCase() === "pestily plague mask") return true; // TEMP FIX
            if (ignoreFilters) return true;
            const ids =
                item.categories && item.categories.length > 0
                    ? item.categories
                    : (item.categories_display_en ?? [])
                        .map((c) => c.id ?? CATEGORY_ID_BY_NAME.get(c.name) ?? null)
                        .filter((x): x is string => Boolean(x));
            return !ids.some((id) => excludedCategories.has(id));
        });

        // Step 2: Filter by player level using minLevelForFlea from the API
        const levelFiltered = useLevelFilter
            ? categoryFiltered.filter((item: SimplifiedItem) => {
                // Use the minLevelForFlea directly from the item (from Tarkov Dev API)
                const itemReq = item.minLevelForFlea ?? 0;
                return playerLevel >= itemReq;
            })
            : categoryFiltered;

        // Step 3: Filter out individually excluded items
        const excludedItemNames = new Set(
            Array.from(excludedItems, (name) => name.toLowerCase())
        );
        const excludedFiltered = excludeIncompatible
            ? levelFiltered.filter((item: SimplifiedItem) => {
                if (ignoreFilters) return true;
                const candidates = [
                    item.name,
                    item.shortName,
                    item.englishName,
                    item.englishShortName,
                ].filter(Boolean) as string[];
                return !candidates.some((n) => excludedItemNames.has(n.toLowerCase()));
            })
            : levelFiltered;

        // Step 4: Sort items
        const sortedItems = [...excludedFiltered];
        switch (sortOption) {
            case "az":
                sortedItems.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "base-value":
                sortedItems.sort((a, b) => a.basePrice - b.basePrice);
                break;
            case "base-value-desc":
                sortedItems.sort((a, b) => b.basePrice - a.basePrice);
                break;
            case "most-recent":
                sortedItems.sort((a, b) => {
                    const dateA = a.updated ? new Date(a.updated) : new Date(0);
                    const dateB = b.updated ? new Date(b.updated) : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });
                break;
            case "ratio":
                sortedItems.sort((a, b) => {
                    if (!b.lastLowPrice) return -1;
                    if (!a.lastLowPrice) return 1;
                    return b.basePrice / b.lastLowPrice - a.basePrice / a.lastLowPrice;
                });
                break;
        }

        return sortedItems;
    }, [
        rawItems,
        sortOption,
        excludedCategories,
        excludeIncompatible,
        excludedItems,
        loading,
        useLevelFilter,
        playerLevel,
        ignoreFilters,
    ]);
}
