import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import type { SimplifiedItem } from "@/types/SimplifiedItem";
import { createSWRPersistMiddleware } from "@/utils/swr-persistence";
import {
  fetchTarkovData,
  CACHE_TTL,
  clearTarkovApiCooldown,
  DEFAULT_TARKOV_REQUEST_STATUS,
  TarkovApiError,
  type TarkovRequestStatus,
} from "@/hooks/use-tarkov-api";
import { toast as sonnerToast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { CURRENT_VERSION } from "@/config/changelog";
import {
  GAME_MODES,
  toTarkovJsonGameMode,
  type GameMode,
} from "@/lib/game-mode";

// Create a single persistence middleware for the combined data
// The middleware handles localStorage quota errors and clears old cache when needed
const swrPersistMiddleware = createSWRPersistMiddleware(
  CURRENT_VERSION,
  CACHE_TTL,
); // Using centralized cache TTL

const lastData = Object.fromEntries(
  GAME_MODES.map((mode) => [mode, [] as SimplifiedItem[]]),
) as Record<GameMode, SimplifiedItem[]>;
const lastLang = Object.fromEntries(
  GAME_MODES.map((mode) => [mode, null as string | null]),
) as Record<GameMode, string | null>;
const requestTrackers = Object.fromEntries(
  GAME_MODES.map((mode) => [
    mode,
    {
      lastFetchTime: 0,
      inProgress: false,
      currentPromise: null as Promise<SimplifiedItem[]> | null,
      currentPromiseLang: null as string | null,
      retryCount: 0,
    },
  ]),
) as Record<
  GameMode,
  {
    lastFetchTime: number;
    inProgress: boolean;
    currentPromise: Promise<SimplifiedItem[]> | null;
    currentPromiseLang: string | null;
    retryCount: number;
  }
>;
const MAX_RETRIES = 3;

// Cross-instance in-flight dedupe keyed by SWR key to survive StrictMode re-mounts
const inFlightByKey = new Map<string, Promise<SimplifiedItem[]>>();

export function useItemsData(mode: GameMode) {
  const gameMode = toTarkovJsonGameMode(mode);
  const tracker = requestTrackers[mode];
  const { language } = useLanguage();
  const IS_TEST =
    typeof process !== "undefined" &&
    (process.env?.VITEST || process.env?.NODE_ENV === "test");
  const isMounted = useRef(true);
  const latestDataRef = useRef<{
    mode: GameMode;
    language: string;
    data: SimplifiedItem[];
  }>({ mode, language, data: [] });

  // Track mount state to avoid setState after unmount during async fetches
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Use separate SWR keys for each mode to ensure proper mode switching
  const swrKey = `tarkov-dev-api/${mode}/${language}?v=${CURRENT_VERSION}`;

  // Track mode changes without clearing cache
  useEffect(() => {
    console.debug(
      `🔄 [${mode.toUpperCase()}] Mode changed, using cache if available`,
    );
    // Reset retry count when mode changes
    tracker.retryCount = 0;
    // Also reset throttle/in-flight to avoid blocking next request on mode switch
    tracker.lastFetchTime = 0;
    tracker.inProgress = false;
    tracker.currentPromise = null;
    tracker.currentPromiseLang = null;
  }, [mode, tracker]); // Only depend on mode to track mode changes

  // Reset throttling when language changes to ensure immediate refetch on lang switch
  useEffect(() => {
    // Clear cached data so we don't reuse different-language items
    GAME_MODES.forEach((gameModeKey) => {
      const modeTracker = requestTrackers[gameModeKey];
      modeTracker.lastFetchTime = 0;
      modeTracker.currentPromise = null;
      modeTracker.currentPromiseLang = null;
      modeTracker.inProgress = false;
      lastData[gameModeKey] = [];
      lastLang[gameModeKey] = null;
    });
  }, [language]);
  // Using Sonner for notifications

  // State to track if we need to show a retry button
  const [needsManualRetry, setNeedsManualRetry] = useState(false);
  const [requestStatus, setRequestStatus] = useState<TarkovRequestStatus>(
    DEFAULT_TARKOV_REQUEST_STATUS,
  );
  // Note: StrictMode duplicate mounts are handled via inFlightByKey below

  const fetcher = async (): Promise<SimplifiedItem[]> => {
    const key = swrKey;
    // Cross-instance dedupe (StrictMode safe)
    const existing = inFlightByKey.get(key);
    if (existing) return await existing;
    // Simple request tracking to prevent duplicate fetches
    const now = Date.now();
    const cached = lastData[mode];
    const cachedLanguage = lastLang[mode];
    const renderedFallback =
      latestDataRef.current.mode === mode &&
      latestDataRef.current.language === language
        ? latestDataRef.current.data
        : [];
    const staleFallback =
      cached.length > 0 && cachedLanguage === language
        ? cached
        : renderedFallback;
    const hasUsableStaleData = staleFallback.length > 0;
    // If an identical request is already in-flight, await it
    if (
      tracker.inProgress &&
      tracker.currentPromise &&
      tracker.currentPromiseLang === language
    ) {
      return await tracker.currentPromise;
    }
    const withinThrottle =
      now - tracker.lastFetchTime < 2000 || tracker.inProgress;
    if (withinThrottle) {
      // Only return cached data if it's for the same language
      if (cached.length > 0 && cachedLanguage === language) {
        return cached;
      }
    }

    tracker.inProgress = true;
    tracker.lastFetchTime = now;
    // Set promise identity before starting to avoid race window for concurrent calls
    tracker.currentPromiseLang = language;

    const promise = (async () => {
      try {
        console.debug(
          `🔍 Fetching items [${mode}] language=${language} at ${new Date().toLocaleTimeString()}`,
        );

        // Always fetch English for filtering
        const onStatus = (status: TarkovRequestStatus) => {
          if (isMounted.current) {
            setRequestStatus({
              ...status,
              usingStaleData: status.usingStaleData || hasUsableStaleData,
            });
          }
        };

        const english = await fetchTarkovData(gameMode, "en", {
          onStatus,
          usingStaleData: hasUsableStaleData,
        });
        // If EN, do not fetch localized; use English for display/filters
        if (language === "en") {
          const mapped: SimplifiedItem[] = english.items.map(
            (en) =>
              ({
                ...en,
                categories: en.categories,
                categories_display: en.categories_display,
                categories_display_en: en.categories_display,
                englishName: en.name,
                englishShortName: en.shortName,
                name: en.name,
                shortName: en.shortName,
                iconLink: en.iconLink,
              }) as SimplifiedItem,
          );
          // Store
          lastData[mode] = mapped;
          lastLang[mode] = "en";
          if (isMounted.current) {
            setRequestStatus({
              phase: "success",
              attempt: MAX_RETRIES,
              maxAttempts: MAX_RETRIES,
              usingStaleData: false,
            });
          }
          return mapped;
        }
        // Fetch localized only when lang !== 'en'
        const localized = await fetchTarkovData(gameMode, language, {
          onStatus,
          usingStaleData: hasUsableStaleData,
        });

        // Use English count to determine emptiness
        if (english.items.length === 0) {
          console.warn(
            `⚠️ [${mode.toUpperCase()}] Received empty data from API`,
          );

          // Increment retry count
          tracker.retryCount++;

          // If we haven't exceeded max retries, throw an error to trigger retry
          if (tracker.retryCount < MAX_RETRIES) {
            throw new Error("Empty data received, retrying...");
          } else {
            // We've exceeded max retries, set flag to show manual retry button (only if still mounted)
            if (isMounted.current) setNeedsManualRetry(true);
            console.error(
              `❌ [${mode.toUpperCase()}] Max retries (${MAX_RETRIES}) exceeded with empty data`,
            );

            // Return empty array but don't cache it
            return [];
          }
        }
        // Reset retry count on successful fetch with data
        tracker.retryCount = 0;
        if (isMounted.current) setNeedsManualRetry(false);

        // Merge English with localized by id
        const localizedById = new Map(
          localized.items.map((it) => [it.id, it] as const),
        );
        const merged: SimplifiedItem[] = english.items.map((en) => {
          const loc = localizedById.get(en.id);
          return {
            ...en,
            // keep English categories for filtering logic
            categories: en.categories,
            // display localized categories if available
            categories_display:
              loc?.categories_display ?? en.categories_display,
            // always keep english categories for stable filtering by ID mapping
            categories_display_en: en.categories_display,
            // capture English names for filtering
            englishName: en.name,
            englishShortName: en.shortName,
            // display localized names when available
            name: loc?.name ?? en.name,
            shortName: loc?.shortName ?? en.shortName,
            // icon: prefer localized when available for non-EN
            iconLink: loc?.iconLink ?? en.iconLink,
          } as SimplifiedItem;
        });

        // Store the data in the appropriate cache
        lastData[mode] = merged;
        lastLang[mode] = language;

        if (isMounted.current) {
          setRequestStatus({
            phase: "success",
            attempt: MAX_RETRIES,
            maxAttempts: MAX_RETRIES,
            usingStaleData: false,
          });
        }

        return merged;
      } catch (error) {
        console.error(`❌ [${mode.toUpperCase()}] Fetch error:`, error);

        if (error instanceof TarkovApiError && error.status === 429) {
          sonnerToast("Rate Limit Hit", {
            description:
              "You've reached the API rate limit. Please wait a moment before refreshing the data again.",
          });
        }

        if (hasUsableStaleData) {
          if (isMounted.current) {
            setNeedsManualRetry(false);
            setRequestStatus((current) => ({
              ...current,
              phase:
                current.phase === "cooldown" || current.cooldownUntil
                  ? "cooldown"
                  : "error",
              lastError: error instanceof Error ? error.message : String(error),
              usingStaleData: true,
            }));
          }
          return staleFallback;
        }

        if (isMounted.current) setNeedsManualRetry(true);

        throw error;
      } finally {
        tracker.inProgress = false;
        tracker.currentPromise = null;
      }
    })();
    inFlightByKey.set(key, promise);
    tracker.currentPromise = promise;
    try {
      return await promise;
    } finally {
      inFlightByKey.delete(key);
    }
  };

  const { data, error, mutate } = useSWR<SimplifiedItem[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: IS_TEST ? 0 : 600000, // 10 minutes in prod
    revalidateOnMount: true,
    revalidateIfStale: true,
    keepPreviousData: false,
    // During tests, avoid any fallback to ensure fresh fetch
    fallbackData: IS_TEST
      ? []
      : lastLang[mode] === language
        ? lastData[mode]
        : [],
    suspense: false, // Disable suspense to prevent flashing
    errorRetryCount: 0,
    shouldRetryOnError: false,
    // Use our single persistence middleware (disabled in tests for determinism)
    use: IS_TEST ? [] : [swrPersistMiddleware],
  });

  useEffect(() => {
    if (data && data.length > 0) {
      latestDataRef.current = { mode, language, data };
    }
  }, [data, language, mode]);

  // Simplify effect to prevent extra renders
  useEffect(() => {
    if (error) {
      console.error(`❌ [${mode.toUpperCase()}] Error state:`, error);
    }
  }, [error, mode]);

  return {
    data: data || [],
    isLoading: !error && !data,
    hasError: !!error,
    mutate,
    needsManualRetry,
    requestStatus,
    resetRetryCount: () => {
      tracker.retryCount = 0;
      tracker.lastFetchTime = 0;
      tracker.inProgress = false;
      tracker.currentPromise = null;
      tracker.currentPromiseLang = null;
      clearTarkovApiCooldown();
      setNeedsManualRetry(false);
      setRequestStatus(DEFAULT_TARKOV_REQUEST_STATUS);
    },
  };
}
