"use client";

import {
    useLocalStorageState,
    useLocalStorageBool,
    useLocalStorageNumber,
    useLocalStorageString,
} from "@/hooks/use-local-storage-state";
import {
    TraderLevels,
    DEFAULT_TRADER_LEVELS,
} from "@/components/ui/trader-level-selector";
import {
    DEFAULT_USE_LEVEL_FILTER,
    DEFAULT_PLAYER_LEVEL,
} from "@/config/flea-level-requirements";

// Storage keys
const FLEA_PRICE_TYPE_KEY = "fleaPriceType";
const PRICE_MODE_KEY = "priceMode";
const TRADER_LEVELS_KEY = "traderLevels";
const USE_LAST_OFFER_COUNT_FILTER_KEY = "useLastOfferCountFilter";
const USE_LEVEL_FILTER_KEY = "useLevelFilter";
const PLAYER_LEVEL_KEY = "playerLevel";

// Types
export type FleaPriceType = "lastLowPrice" | "avg24hPrice";
export type PriceMode = "flea" | "trader";

const FLEA_PRICE_TYPES = ["lastLowPrice", "avg24hPrice"] as const;
const PRICE_MODES = ["flea", "trader"] as const;

/**
 * Consolidated hook for all app settings that persist to localStorage.
 * Returns all settings state and setters in a single object.
 */
export function useAppSettings() {
    // Game mode (PVE vs PVP)
    const [isPVE, setIsPVE] = useLocalStorageBool("isPVE", false);

    // Sort option
    const [sortOption, setSortOption] = useLocalStorageString("sortOption", "az");

    // Threshold
    const [threshold, setThreshold] = useLocalStorageNumber("userThreshold", 400000);

    // Flea market price type
    const [fleaPriceType, setFleaPriceType] = useLocalStorageString<FleaPriceType>(
        FLEA_PRICE_TYPE_KEY,
        "lastLowPrice",
        FLEA_PRICE_TYPES
    );

    // Price mode
    const [priceMode, setPriceMode] = useLocalStorageString<PriceMode>(
        PRICE_MODE_KEY,
        "flea",
        PRICE_MODES
    );

    // Trader levels
    const [traderLevels, setTraderLevels] = useLocalStorageState<TraderLevels>(
        TRADER_LEVELS_KEY,
        DEFAULT_TRADER_LEVELS,
        {
            deserialize: (s) => {
                try {
                    const parsed = JSON.parse(s) as Partial<TraderLevels>;
                    return { ...DEFAULT_TRADER_LEVELS, ...parsed } as TraderLevels;
                } catch {
                    return DEFAULT_TRADER_LEVELS;
                }
            },
        }
    );

    // Offer count filter
    const [useLastOfferCountFilter, setUseLastOfferCountFilter] = useLocalStorageBool(
        USE_LAST_OFFER_COUNT_FILTER_KEY,
        false
    );

    // Player level filter
    const [useLevelFilter, setUseLevelFilter] = useLocalStorageBool(
        USE_LEVEL_FILTER_KEY,
        DEFAULT_USE_LEVEL_FILTER
    );

    const [playerLevel, setPlayerLevel] = useLocalStorageNumber(
        PLAYER_LEVEL_KEY,
        DEFAULT_PLAYER_LEVEL,
        { min: 1, max: 79 }
    );

    return {
        // Game mode
        isPVE,
        setIsPVE,

        // Sorting
        sortOption,
        setSortOption,

        // Threshold
        threshold,
        setThreshold,

        // Pricing
        fleaPriceType,
        setFleaPriceType,
        priceMode,
        setPriceMode,
        traderLevels,
        setTraderLevels,

        // Filters
        useLastOfferCountFilter,
        setUseLastOfferCountFilter,
        useLevelFilter,
        setUseLevelFilter,
        playerLevel,
        setPlayerLevel,
    };
}

export type AppSettings = ReturnType<typeof useAppSettings>;
