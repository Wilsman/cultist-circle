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

// Create a single persistence middleware for the combined data
// The middleware handles localStorage quota errors and clears old cache when needed
const swrPersistMiddleware = createSWRPersistMiddleware(
  CURRENT_VERSION,
  CACHE_TTL,
); // Using centralized cache TTL

// Add request tracking outside component
const requestTracker = {
  lastFetchTime: 0,
  inProgress: false,
  lastDataPVP: [] as SimplifiedItem[],
  lastDataPVE: [] as SimplifiedItem[],
  lastLangPVP: null as string | null,
  lastLangPVE: null as string | null,
  currentPromise: null as Promise<SimplifiedItem[]> | null,
  currentPromiseLang: null as string | null,
  currentPromiseMode: null as "pvp" | "pve" | null,
  retryCount: 0,
  maxRetries: 3,
};

// Cross-instance in-flight dedupe keyed by SWR key to survive StrictMode re-mounts
const inFlightByKey = new Map<string, Promise<SimplifiedItem[]>>();

export function useItemsData(isPVE: boolean) {
  const mode = isPVE ? "pve" : "pvp";
  const gameMode = isPVE ? "pve" : "regular";
  const { language } = useLanguage();
  const IS_TEST =
    typeof process !== "undefined" &&
    (process.env?.VITEST || process.env?.NODE_ENV === "test");
  const isMounted = useRef(true);
  const latestDataRef = useRef<SimplifiedItem[]>([]);

  // Track mount state to avoid setState after unmount during async fetches
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Use separate SWR keys for PVE and PVP to ensure proper mode switching
  const swrKey = `tarkov-dev-api/${mode}/${language}?v=${CURRENT_VERSION}`;

  // Track mode changes without clearing cache
  useEffect(() => {
    console.debug(
      `🔄 [${mode.toUpperCase()}] Mode changed, using cache if available`,
    );
    // Reset retry count when mode changes
    requestTracker.retryCount = 0;
    // Also reset throttle/in-flight to avoid blocking next request on mode switch
    requestTracker.lastFetchTime = 0;
    requestTracker.inProgress = false;
    requestTracker.currentPromise = null;
    requestTracker.currentPromiseLang = null;
    requestTracker.currentPromiseMode = null;
  }, [mode]); // Only depend on mode to track mode changes

  // Reset throttling when language changes to ensure immediate refetch on lang switch
  useEffect(() => {
    requestTracker.lastFetchTime = 0;
    requestTracker.currentPromise = null;
    requestTracker.inProgress = false;
    // Clear cached data so we don't reuse different-language items
    requestTracker.lastDataPVP = [];
    requestTracker.lastDataPVE = [];
    requestTracker.lastLangPVP = null;
    requestTracker.lastLangPVE = null;
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
    const cached = isPVE
      ? requestTracker.lastDataPVE
      : requestTracker.lastDataPVP;
    const lastLang = isPVE
      ? requestTracker.lastLangPVE
      : requestTracker.lastLangPVP;
    const renderedFallback = latestDataRef.current;
    const staleFallback =
      cached.length > 0 && lastLang === language ? cached : renderedFallback;
    const hasUsableStaleData = staleFallback.length > 0;
    // If an identical request is already in-flight, await it
    if (
      requestTracker.inProgress &&
      requestTracker.currentPromise &&
      requestTracker.currentPromiseLang === language &&
      requestTracker.currentPromiseMode === (isPVE ? "pve" : "pvp")
    ) {
      return await requestTracker.currentPromise;
    }
    const withinThrottle =
      now - requestTracker.lastFetchTime < 2000 || requestTracker.inProgress;
    if (withinThrottle) {
      // Only return cached data if it's for the same language
      if (cached.length > 0 && lastLang === language) {
        return cached;
      }
    }

    requestTracker.inProgress = true;
    requestTracker.lastFetchTime = now;
    // Set promise identity before starting to avoid race window for concurrent calls
    requestTracker.currentPromiseLang = language;
    requestTracker.currentPromiseMode = isPVE ? "pve" : "pvp";

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

        const english = await fetchTarkovData(
          gameMode as "pve" | "regular",
          "en",
          {
            onStatus,
            usingStaleData: hasUsableStaleData,
          },
        );
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
          if (isPVE) {
            requestTracker.lastDataPVE = mapped;
            requestTracker.lastLangPVE = "en";
          } else {
            requestTracker.lastDataPVP = mapped;
            requestTracker.lastLangPVP = "en";
          }
          if (isMounted.current) {
            setRequestStatus({
              phase: "success",
              attempt: requestTracker.maxRetries,
              maxAttempts: requestTracker.maxRetries,
              usingStaleData: false,
            });
          }
          return mapped;
        }
        // Fetch localized only when lang !== 'en'
        const localized = await fetchTarkovData(
          gameMode as "pve" | "regular",
          language,
          {
            onStatus,
            usingStaleData: hasUsableStaleData,
          },
        );

        // Use English count to determine emptiness
        if (english.items.length === 0) {
          console.warn(
            `⚠️ [${mode.toUpperCase()}] Received empty data from API`,
          );

          // Increment retry count
          requestTracker.retryCount++;

          // If we haven't exceeded max retries, throw an error to trigger retry
          if (requestTracker.retryCount < requestTracker.maxRetries) {
            throw new Error("Empty data received, retrying...");
          } else {
            // We've exceeded max retries, set flag to show manual retry button (only if still mounted)
            if (isMounted.current) setNeedsManualRetry(true);
            console.error(
              `❌ [${mode.toUpperCase()}] Max retries (${requestTracker.maxRetries}) exceeded with empty data`,
            );

            // Return empty array but don't cache it
            return [];
          }
        }
        // Reset retry count on successful fetch with data
        requestTracker.retryCount = 0;
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
        if (isPVE) {
          requestTracker.lastDataPVE = merged;
          requestTracker.lastLangPVE = language;
        } else {
          requestTracker.lastDataPVP = merged;
          requestTracker.lastLangPVP = language;
        }

        if (isMounted.current) {
          setRequestStatus({
            phase: "success",
            attempt: requestTracker.maxRetries,
            maxAttempts: requestTracker.maxRetries,
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
        requestTracker.inProgress = false;
        requestTracker.currentPromise = null;
      }
    })();
    inFlightByKey.set(key, promise);
    requestTracker.currentPromise = promise;
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
      : (isPVE
          ? requestTracker.lastLangPVE === language
            ? requestTracker.lastDataPVE
            : []
          : requestTracker.lastLangPVP === language
            ? requestTracker.lastDataPVP
            : []) || [],
    suspense: false, // Disable suspense to prevent flashing
    errorRetryCount: 0,
    shouldRetryOnError: false,
    // Use our single persistence middleware (disabled in tests for determinism)
    use: IS_TEST ? [] : [swrPersistMiddleware],
  });

  useEffect(() => {
    if (data && data.length > 0) {
      latestDataRef.current = data;
    }
  }, [data]);

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
      requestTracker.retryCount = 0;
      requestTracker.lastFetchTime = 0;
      requestTracker.inProgress = false;
      requestTracker.currentPromise = null;
      requestTracker.currentPromiseLang = null;
      requestTracker.currentPromiseMode = null;
      clearTarkovApiCooldown();
      setNeedsManualRetry(false);
      setRequestStatus(DEFAULT_TARKOV_REQUEST_STATUS);
    },
  };
}
