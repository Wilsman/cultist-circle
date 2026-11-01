// app/base-values/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DEFAULT_TARKOV_REQUEST_STATUS,
  fetchMinimalTarkovData,
  MinimalItem,
  type TarkovRequestStatus,
} from "@/hooks/use-tarkov-api";
import { useDebounce } from "@/hooks/use-debounce";
import { useFavorites } from "@/hooks/use-favorites";
import {
  GAME_MODES,
  GAME_MODE_LABELS,
  GAME_MODE_STORAGE_KEY,
  LEGACY_PVE_STORAGE_KEY,
  getStoredGameMode,
  toTarkovJsonGameMode,
  type GameMode,
} from "@/lib/game-mode";
import { DEFAULT_EXCLUDED_ITEMS } from "@/config/excluded-items";
// UI components
import { Input } from "@/components/ui/input";
import { VirtualizedTable } from "@/components/ui/virtualized-table";
// Removed unused Switch import
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Star,
  Download,
  CircleAlert,
  // Info,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
// import { Alert, AlertDescription } from "@/components/ui/alert";
import { PriceRangeFilter } from "@/components/ui/price-range-filter";
import { Button } from "@/components/ui/button";
import { CategoryFilter } from "@/components/ui/category-filter";
import { useLanguage } from "@/contexts/language-context";
import { formatMessageSlots } from "@/lib/format-message-slots";

interface FilterState {
  name: string;
  shortName: string; // Keep shortName for potential filtering/sorting
  basePrice: [number, number];
  lastLowPrice: [number, number];
  avg24hPrice: [number, number];
  link: string;
  sort:
    | "name"
    | "shortName"
    | "basePrice"
    | "lastLowPrice"
    | "avg24hPrice"
    | "traderSellPrice"
    | "traderBuyPrice"
    | "buyLimit"
    | "bestValue"; // Add name/shortName back
  sortDir: "asc" | "desc";
}

function getMinMax(
  items: MinimalItem[],
  key: keyof MinimalItem,
): [number, number] {
  if (items.length === 0) {
    // Sensible fallback avoids Infinity/-Infinity propagation
    return [0, 0];
  }

  const nums = items.map((i) =>
    typeof i[key] === "number" ? (i[key] as number) : 0,
  );
  return [Math.min(...nums), Math.max(...nums)];
}

// The excluded list stores item names, so match on lowercased names.
const EXCLUDED_ITEM_NAMES = new Set(
  Array.from(DEFAULT_EXCLUDED_ITEMS, (name) => name.toLowerCase()),
);

// Items with no flea or trader price (quest items, secure containers) only
// add empty rows to price sorts, so they go to the bottom.
const hasAnyPrice = (item: MinimalItem) =>
  (item.lastLowPrice ?? 0) > 0 ||
  (item.avg24hPrice ?? 0) > 0 ||
  item.sellFor?.some(
    (offer) =>
      offer?.vendor?.normalizedName !== "flea-market" &&
      (offer?.priceRUB ?? 0) > 0,
  ) ||
  item.buyFor?.some((offer) => (offer?.priceRUB ?? 0) > 0);

const TableSkeleton = () => (
  <div className="rounded-md border overflow-hidden">
    {/* Header skeleton */}
    <div className="flex border-b">
      <div className="font-medium p-2 flex-1 min-w-[200px]">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="text-right font-semibold p-2 w-[120px]">
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <div className="text-muted-foreground text-right p-2 w-[120px]">
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <div className="text-muted-foreground text-right p-2 w-[120px]">
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <div className="text-muted-foreground text-right p-2 w-[120px]">
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    </div>

    {/* Row skeletons */}
    {Array.from({ length: 10 }).map((_, index) => (
      <div className="flex border-b transition-colors" key={index}>
        <div className="px-4 py-2 font-medium flex-1 min-w-[200px]">
          <Skeleton className="h-4 w-[180px]" />
        </div>
        <div className="px-4 py-2 text-right font-semibold w-[120px]">
          <Skeleton className="h-4 w-[60px] ml-auto" />
        </div>
        <div className="px-4 py-2 text-muted-foreground text-right w-[120px]">
          <Skeleton className="h-4 w-[60px] ml-auto" />
        </div>
        <div className="px-4 py-2 text-muted-foreground text-right w-[120px]">
          <Skeleton className="h-4 w-[60px] ml-auto" />
        </div>
        <div className="px-4 py-2 text-muted-foreground text-right w-[120px]">
          <Skeleton className="h-4 w-[60px] ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

export default function ItemsTablePage() {
  const { t, language } = useLanguage();
  // Add isPending state for transitions
  const [isPending, startTransition] = useTransition();

  // Separate search input state from filter state
  const [searchInput, setSearchInput] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [itemsByMode, setItemsByMode] = useState<
    Record<GameMode, MinimalItem[]>
  >({ pvp: [], pve: [], season: [] });
  const itemsByModeRef = useRef<Record<GameMode, MinimalItem[]>>({
    pvp: [],
    pve: [],
    season: [],
  });
  const loadedLanguageByModeRef = useRef<Record<GameMode, string | null>>({
    pvp: null,
    pve: null,
    season: null,
  });
  const [mode, setMode] = useState<GameMode>(() =>
    typeof window === "undefined" ? "pvp" : getStoredGameMode(localStorage),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<TarkovRequestStatus>(
    DEFAULT_TARKOV_REQUEST_STATUS,
  );
  const [requestStatusNow, setRequestStatusNow] = useState(() => Date.now());

  useEffect(() => {
    localStorage.setItem(GAME_MODE_STORAGE_KEY, mode);
    localStorage.removeItem(LEGACY_PVE_STORAGE_KEY);
  }, [mode]);
  const [filter, setFilter] = useState<FilterState>({
    // Use full FilterState
    name: "",
    shortName: "", // Initialize shortName
    basePrice: [0, 0],
    lastLowPrice: [0, 0],
    avg24hPrice: [0, 0],
    link: "",
    sort: "basePrice", // Default sort
    sortDir: "desc",
  });

  // State for showing compatible items only
  const [showCompatibleOnly, setShowCompatibleOnly] = useState(false);

  // State for category filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // State for trader-only filtering
  const [showTraderOnly, setShowTraderOnly] = useState(false);

  // Initialize favorites functionality
  const {
    isFavorite,
    toggleFavorite,
    showOnlyFavorites,
    setShowOnlyFavorites,
    hasFavorites,
  } = useFavorites(mode);

  // Debounce the search input to prevent excessive re-renders
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  // Update filter when debounced search term changes
  useEffect(() => {
    startTransition(() => {
      setFilter((prev) => ({ ...prev, name: debouncedSearchTerm }));
    });
  }, [debouncedSearchTerm, startTransition]);

  useEffect(() => {
    let isMounted = true;
    const gameMode = toTarkovJsonGameMode(mode);
    const staleItems = itemsByModeRef.current[mode];

    if (loadedLanguageByModeRef.current[mode] === language) {
      setIsLoading(false);
      setLoadError(null);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(staleItems.length === 0);
    setLoadError(null);

    fetchMinimalTarkovData(gameMode, language, {
      usingStaleData: staleItems.length > 0,
      onStatus: (status) => {
        if (isMounted) {
          setRequestStatus(status);
        }
      },
    })
      .then((items: MinimalItem[]) => {
        if (isMounted) {
          itemsByModeRef.current[mode] = items;
          loadedLanguageByModeRef.current[mode] = language;
          setItemsByMode((current) => ({ ...current, [mode]: items }));
          setLoadError(null);
          setFilter((f) => ({
            ...f,
            basePrice: getMinMax(items, "basePrice"),
            lastLowPrice: getMinMax(items, "lastLowPrice"),
            avg24hPrice: getMinMax(items, "avg24hPrice"),
          }));
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : String(error));
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [language, mode]);

  useEffect(() => {
    if (!requestStatus.nextRetryAt && !requestStatus.cooldownUntil) {
      return;
    }

    const interval = window.setInterval(() => {
      setRequestStatusNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [requestStatus.nextRetryAt, requestStatus.cooldownUntil]);

  const retrySeconds = requestStatus.nextRetryAt
    ? Math.max(
        0,
        Math.ceil((requestStatus.nextRetryAt - requestStatusNow) / 1000),
      )
    : 0;
  const cooldownSeconds = requestStatus.cooldownUntil
    ? Math.max(
        0,
        Math.ceil((requestStatus.cooldownUntil - requestStatusNow) / 1000),
      )
    : 0;
  const isRetryingTarkovRequest =
    requestStatus.phase === "retrying" && Boolean(requestStatus.nextRetryAt);
  const isCoolingDownTarkovRequest =
    requestStatus.phase === "cooldown" && cooldownSeconds > 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && searchInput && !isEditable) {
        event.preventDefault();
        setSearchInput("");
        searchInputRef.current?.focus();
        return;
      }

      if (
        event.key === "Escape" &&
        searchInput &&
        target === searchInputRef.current
      ) {
        event.preventDefault();
        setSearchInput("");
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Enter" && event.shiftKey && !isEditable) {
        event.preventDefault();
        setIsAdvancedOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchInput]);

  const parsedQuery = useMemo(() => {
    const tokens = debouncedSearchTerm.trim().split(/\s+/).filter(Boolean);
    const textTerms: string[] = [];
    const filters = {
      baseMin: null as number | null,
      baseMax: null as number | null,
      lastLowMin: null as number | null,
      lastLowMax: null as number | null,
      avgMin: null as number | null,
      avgMax: null as number | null,
      category: null as string | null,
      favoritesOnly: false,
      traderOnly: false,
      compatibleOnly: false,
    };

    const parseRangeToken = (token: string, prefix: string) => {
      const match = token.match(new RegExp(`^${prefix}([<>]=?|=)(\\d+)$`, "i"));
      if (!match) return null;
      const op = match[1];
      const value = Number(match[2]);
      return { op, value };
    };

    for (const token of tokens) {
      const lower = token.toLowerCase();
      const baseToken = parseRangeToken(lower, "bp");
      const lastLowToken = parseRangeToken(lower, "llp");
      const avgToken = parseRangeToken(lower, "avg");

      if (baseToken) {
        if (baseToken.op === "<") filters.baseMax = baseToken.value - 1;
        if (baseToken.op === "<=") filters.baseMax = baseToken.value;
        if (baseToken.op === ">") filters.baseMin = baseToken.value + 1;
        if (baseToken.op === ">=") filters.baseMin = baseToken.value;
        if (baseToken.op === "=") {
          filters.baseMin = baseToken.value;
          filters.baseMax = baseToken.value;
        }
        continue;
      }

      if (lastLowToken) {
        if (lastLowToken.op === "<")
          filters.lastLowMax = lastLowToken.value - 1;
        if (lastLowToken.op === "<=") filters.lastLowMax = lastLowToken.value;
        if (lastLowToken.op === ">")
          filters.lastLowMin = lastLowToken.value + 1;
        if (lastLowToken.op === ">=") filters.lastLowMin = lastLowToken.value;
        if (lastLowToken.op === "=") {
          filters.lastLowMin = lastLowToken.value;
          filters.lastLowMax = lastLowToken.value;
        }
        continue;
      }

      if (avgToken) {
        if (avgToken.op === "<") filters.avgMax = avgToken.value - 1;
        if (avgToken.op === "<=") filters.avgMax = avgToken.value;
        if (avgToken.op === ">") filters.avgMin = avgToken.value + 1;
        if (avgToken.op === ">=") filters.avgMin = avgToken.value;
        if (avgToken.op === "=") {
          filters.avgMin = avgToken.value;
          filters.avgMax = avgToken.value;
        }
        continue;
      }

      if (lower.startsWith("cat:") || lower.startsWith("category:")) {
        filters.category = token.split(":").slice(1).join(":").trim();
        continue;
      }

      if (lower === "fav" || lower === "favorite" || lower === "favorites") {
        filters.favoritesOnly = true;
        continue;
      }

      if (lower === "trader") {
        filters.traderOnly = true;
        continue;
      }

      if (lower === "compat" || lower === "compatible") {
        filters.compatibleOnly = true;
        continue;
      }

      textTerms.push(token);
    }

    return { textTerms, filters };
  }, [debouncedSearchTerm]);

  // Memoize the header sort handler to prevent recreating on each render
  const handleHeaderSort = useCallback(
    (
      sortKey:
        | "name"
        | "shortName"
        | "basePrice"
        | "lastLowPrice"
        | "avg24hPrice"
        | "traderSellPrice"
        | "traderBuyPrice"
        | "buyLimit"
        | "bestValue",
    ) => {
      // Use startTransition to mark UI updates as non-urgent
      startTransition(() => {
        setFilter((f) => ({
          ...f,
          sort: sortKey,
          // Toggle direction if same key, else default (asc for name/shortName, desc for prices)
          sortDir:
            f.sort === sortKey
              ? f.sortDir === "asc"
                ? "desc"
                : "asc"
              : sortKey === "name" || sortKey === "shortName"
                ? "asc"
                : "desc",
        }));
      });
    },
    [startTransition],
  );

  // Export to Excel function
  const exportToExcel = (items: MinimalItem[]) => {
    if (items.length === 0) {
      return;
    }

    // Create CSV content
    const headers = [
      "Name",
      "Short Name",
      "Categories",
      "Base Price",
      "Last Low Price",
      "Average 24h Price",
      "Sell to Trader",
      "Buy from Trader",
      "Buy from Trader Name",
      "Buy from Trader Level",
      "Buy Limit",
      "Link",
    ];

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...items.map((item) => {
        // Calculate best trader price
        const bestTraderPrice =
          item.sellFor?.length > 0
            ? Math.max(
                ...item.sellFor
                  .filter(
                    (seller) =>
                      seller?.vendor?.normalizedName !== "flea-market" &&
                      seller?.priceRUB != null,
                  )
                  .map((seller) => seller.priceRUB || 0),
              )
            : 0;

        // Find best buy offer (lowest price, excluding flea market)
        const validBuyOffers =
          item.buyFor?.filter(
            (offer) =>
              offer.vendor?.normalizedName !== "flea-market" &&
              offer.priceRUB != null,
          ) || [];

        const bestBuyOffer =
          validBuyOffers.length > 0
            ? validBuyOffers.reduce((prev, curr) =>
                (prev.priceRUB || Infinity) < (curr.priceRUB || Infinity)
                  ? prev
                  : curr,
              )
            : null;

        const bestBuyPrice = bestBuyOffer ? bestBuyOffer.priceRUB : 0;
        const bestBuyTraderName = bestBuyOffer?.vendor?.normalizedName || "";
        const bestBuyTraderLevel = bestBuyOffer?.vendor?.minTraderLevel || "";
        const bestBuyLimit = bestBuyOffer?.vendor?.buyLimit;

        // Escape categories properly
        const categories = item.categories?.map((c) => c.name).join(", ") || "";

        return [
          `"${(item.name || "").replace(/"/g, '""')}"`,
          `"${(item.shortName || "").replace(/"/g, '""')}"`,
          `"${categories.replace(/"/g, '""')}"`,
          item.basePrice || 0,
          item.lastLowPrice || 0,
          item.avg24hPrice || 0,
          bestTraderPrice,
          bestBuyPrice === Infinity ? 0 : bestBuyPrice,
          `"${bestBuyTraderName.replace(/"/g, '""')}"`,
          bestBuyTraderLevel,
          bestBuyLimit === undefined
            ? "N/A"
            : bestBuyLimit === null
              ? "∞"
              : bestBuyLimit,
          `"${(item.link || "").replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `cultist-circle-items-${mode}-${
        new Date().toISOString().split("T")[0]
      }.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const items = useMemo(() => {
    const allItems = itemsByMode[mode];

    // Filter by favorites if enabled
    if (showOnlyFavorites) {
      return allItems.filter((item) => isFavorite(item.id));
    }

    let filtered = allItems;

    // Apply compatibility filter
    if (showCompatibleOnly) {
      filtered = filtered.filter((item) => {
        const isExcluded = EXCLUDED_ITEM_NAMES.has(item.name.toLowerCase());
        const hasValidPrice = item.basePrice > 0;
        return !isExcluded && hasValidPrice;
      });
    }

    // Apply trader-only filter
    if (showTraderOnly) {
      filtered = filtered.filter((item) => {
        if (!item.buyFor || item.buyFor.length === 0) return false;

        // Match the exact logic from VirtualizedTable component
        const bestBuyPrice = item.buyFor
          .filter(
            (offer) =>
              offer?.vendor?.normalizedName !== "flea-market" &&
              offer?.priceRUB != null,
          )
          .reduce<(typeof item.buyFor)[0] | null>((prev, curr) => {
            if (!prev) return curr;
            if (!curr?.priceRUB) return prev;
            return (prev?.priceRUB ?? 0) < curr.priceRUB ? prev : curr;
          }, null);

        return bestBuyPrice !== null;
      });
    }

    return filtered;
  }, [
    mode,
    itemsByMode,
    showOnlyFavorites,
    isFavorite,
    showCompatibleOnly,
    showTraderOnly,
  ]);

  // Memoize unique categories from all items
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    items.forEach((item) => {
      if (item.categories && Array.isArray(item.categories)) {
        item.categories.forEach((category) => {
          if (category && category.name) {
            categorySet.add(category.name);
          }
        });
      }
    });
    return Array.from(categorySet).sort();
  }, [items]);
  const filtered = useMemo(() => {
    const qTerms = parsedQuery.textTerms.map((term) =>
      term.trim().toLowerCase(),
    );
    const parsedFilters = parsedQuery.filters;

    // Only filter if we have items and either search term or price filters
    if (!items.length) return [];

    let filteredItems = items;

    // Only apply name filter if search term exists
    if (qTerms.length) {
      filteredItems = filteredItems.filter((item) => {
        const lowerName = item.name.toLowerCase();
        const lowerShortName = item.shortName.toLowerCase();

        // Check if all search terms appear in either name or shortName
        return qTerms.every(
          (term) => lowerName.includes(term) || lowerShortName.includes(term),
        );
      });
    }

    if (parsedFilters.category) {
      const match = parsedFilters.category.toLowerCase();
      filteredItems = filteredItems.filter((item) =>
        item.categories?.some((category) =>
          category.name.toLowerCase().includes(match),
        ),
      );
    }

    if (parsedFilters.favoritesOnly) {
      filteredItems = filteredItems.filter((item) => isFavorite(item.id));
    }

    if (parsedFilters.compatibleOnly) {
      filteredItems = filteredItems.filter((item) => {
        const isExcluded = EXCLUDED_ITEM_NAMES.has(item.name.toLowerCase());
        const hasValidPrice = item.basePrice > 0;
        return !isExcluded && hasValidPrice;
      });
    }

    if (parsedFilters.traderOnly) {
      filteredItems = filteredItems.filter((item) => {
        if (!item.buyFor || item.buyFor.length === 0) return false;

        const bestBuyPrice = item.buyFor
          .filter(
            (offer) =>
              offer?.vendor?.normalizedName !== "flea-market" &&
              offer?.priceRUB != null,
          )
          .reduce<(typeof item.buyFor)[0] | null>((prev, curr) => {
            if (!prev) return curr;
            if (!curr?.priceRUB) return prev;
            return (prev?.priceRUB ?? 0) < curr.priceRUB ? prev : curr;
          }, null);

        return bestBuyPrice !== null;
      });
    }

    // Apply price filters
    filteredItems = filteredItems.filter(
      (item) =>
        item.basePrice >= filter.basePrice[0] &&
        item.basePrice <= filter.basePrice[1] &&
        (parsedFilters.baseMin == null ||
          item.basePrice >= parsedFilters.baseMin) &&
        (parsedFilters.baseMax == null ||
          item.basePrice <= parsedFilters.baseMax) &&
        (typeof item.lastLowPrice !== "number" ||
          (item.lastLowPrice >= filter.lastLowPrice[0] &&
            item.lastLowPrice <= filter.lastLowPrice[1] &&
            (parsedFilters.lastLowMin == null ||
              item.lastLowPrice >= parsedFilters.lastLowMin) &&
            (parsedFilters.lastLowMax == null ||
              item.lastLowPrice <= parsedFilters.lastLowMax))) &&
        (typeof item.avg24hPrice !== "number" ||
          (item.avg24hPrice >= filter.avg24hPrice[0] &&
            item.avg24hPrice <= filter.avg24hPrice[1] &&
            (parsedFilters.avgMin == null ||
              item.avg24hPrice >= parsedFilters.avgMin) &&
            (parsedFilters.avgMax == null ||
              item.avg24hPrice <= parsedFilters.avgMax))),
    );

    if (selectedCategory && selectedCategory !== "All Categories") {
      filteredItems = filteredItems.filter((item) =>
        item.categories?.some((category) => category.name === selectedCategory),
      );
    }

    if (filter.sort === "bestValue") {
      filteredItems = [...filteredItems].sort((a, b) => {
        const aVal =
          a.lastLowPrice && a.basePrice ? a.basePrice / a.lastLowPrice : 0;
        const bVal =
          b.lastLowPrice && b.basePrice ? b.basePrice / b.lastLowPrice : 0;
        return filter.sortDir === "desc" ? bVal - aVal : aVal - bVal; // Best value is always desc
      });
    } else {
      // Precompute best trader sell prices if we're sorting by traderSellPrice
      const bestSellPrices =
        filter.sort === "traderSellPrice"
          ? new Map<string, number>(
              filteredItems.map((item) => {
                let bestPrice = 0;
                if (item.sellFor?.length) {
                  for (const offer of item.sellFor) {
                    if (
                      offer?.vendor?.normalizedName &&
                      offer.vendor.normalizedName.toLowerCase() !==
                        "flea-market" &&
                      offer.priceRUB &&
                      offer.priceRUB > bestPrice
                    ) {
                      bestPrice = offer.priceRUB;
                    }
                  }
                }
                return [item.id, bestPrice];
              }),
            )
          : null;

      // Precompute best buy prices if we're sorting by traderBuyPrice or buyLimit
      const bestBuyPrices =
        filter.sort === "traderBuyPrice" || filter.sort === "buyLimit"
          ? new Map<string, { price: number; limit: number }>(
              filteredItems.map((item) => {
                let bestPrice = 0;
                let buyLimit = 0;
                if (item.buyFor?.length) {
                  for (const offer of item.buyFor) {
                    if (
                      offer?.vendor?.normalizedName &&
                      offer.vendor.normalizedName.toLowerCase() !==
                        "flea-market" &&
                      offer.priceRUB &&
                      (offer.priceRUB < bestPrice || bestPrice === 0)
                    ) {
                      bestPrice = offer.priceRUB;
                      buyLimit = offer.vendor.buyLimit || 0;
                    }
                  }
                }
                return [item.id, { price: bestPrice, limit: buyLimit }];
              }),
            )
          : null;

      // Handle header sorting (name, shortName, prices)
      filteredItems = [...filteredItems].sort((a, b) => {
        if (filter.sort === "traderSellPrice" && bestSellPrices) {
          const aPrice = bestSellPrices.get(a.id) || 0;
          const bPrice = bestSellPrices.get(b.id) || 0;
          return filter.sortDir === "desc" ? bPrice - aPrice : aPrice - bPrice;
        }
        if (filter.sort === "traderBuyPrice" && bestBuyPrices) {
          const aData = bestBuyPrices.get(a.id) || { price: 0 };
          const bData = bestBuyPrices.get(b.id) || { price: 0 };
          return filter.sortDir === "desc"
            ? bData.price - aData.price
            : aData.price - bData.price;
        }
        if (filter.sort === "buyLimit" && bestBuyPrices) {
          const aData = bestBuyPrices.get(a.id) || { limit: 0 };
          const bData = bestBuyPrices.get(b.id) || { limit: 0 };
          return filter.sortDir === "desc"
            ? bData.limit - aData.limit
            : aData.limit - bData.limit;
        }
        const sortKey = filter.sort as
          "name" | "shortName" | "basePrice" | "lastLowPrice" | "avg24hPrice"; // Include name/shortName
        const aVal =
          sortKey === "name" || sortKey === "shortName"
            ? (a[sortKey] as string).toLowerCase()
            : (a[sortKey] as number) || 0;
        const bVal =
          sortKey === "name" || sortKey === "shortName"
            ? (b[sortKey] as string).toLowerCase()
            : (b[sortKey] as number) || 0;

        if (aVal < bVal) return filter.sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return filter.sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (filter.sort !== "name" && filter.sort !== "shortName") {
      filteredItems = [
        ...filteredItems.filter(hasAnyPrice),
        ...filteredItems.filter((item) => !hasAnyPrice(item)),
      ];
    }
    return filteredItems;
  }, [
    items,
    parsedQuery,
    filter.sort,
    filter.sortDir,
    filter.basePrice,
    filter.lastLowPrice,
    filter.avg24hPrice,
    selectedCategory,
    isFavorite,
  ]); // Update dependencies

  return (
    <div className="relative z-0 mx-auto my-4 w-[calc(100%_-_1.5rem)] max-w-7xl rounded-xl border border-gray-800 p-4 shadow-2xl before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-my_bg_image before:bg-cover before:bg-fixed before:bg-no-repeat before:content-[''] after:pointer-events-none after:absolute after:inset-px after:z-[-5] after:rounded-[11px] after:bg-gray-900/80 after:backdrop-blur-md after:content-[''] sm:my-6 sm:w-[calc(100%_-_2rem)] md:p-8">
      {/* Header Section */}
      <div className="mb-6 text-center space-y-2">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {t("Base Values")}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("Item Base Values")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Search fast. Base price first, extra details when you need them.",
          )}
        </p>
      </div>

      {/* Primary Search Surface */}
      <div className="sticky top-2 z-10 mb-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-3 backdrop-blur-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={t("Search items by name or short name...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 w-full rounded-lg border-border/60 bg-transparent pl-9 pr-16 text-sm shadow-none transition-colors focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={t("Search items")}
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t("Clear")}
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
                /
              </kbd>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div
              className="inline-flex items-center rounded-lg bg-muted/50 p-0.5"
              role="radiogroup"
              aria-label={t("Game mode")}
            >
              {GAME_MODES.map((gameMode) => (
                <button
                  key={gameMode}
                  type="button"
                  role="radio"
                  aria-checked={mode === gameMode}
                  onClick={() => {
                    startTransition(() => {
                      setMode(gameMode);
                      const newItems = itemsByModeRef.current[gameMode];
                      setFilter((current) => ({
                        ...current,
                        basePrice: getMinMax(newItems, "basePrice"),
                        lastLowPrice: getMinMax(newItems, "lastLowPrice"),
                        avg24hPrice: getMinMax(newItems, "avg24hPrice"),
                      }));
                    });
                  }}
                  className={`h-7 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    mode === gameMode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {GAME_MODE_LABELS[gameMode]}
                </button>
              ))}
            </div>

            <div className="text-xs tabular-nums text-muted-foreground">
              {isLoading
                ? isRetryingTarkovRequest
                  ? t(
                      "Retrying Tarkov.dev in {seconds}s... attempt {attempt} of {max}",
                      {
                        seconds: retrySeconds,
                        attempt: requestStatus.attempt,
                        max: requestStatus.maxAttempts,
                      },
                    )
                  : t("Loading items...")
                : debouncedSearchTerm
                  ? t("{count} items for \"{query}\"", {
                      count: filtered.length.toLocaleString(),
                      query: debouncedSearchTerm,
                    })
                  : t("{count} items", {
                      count: filtered.length.toLocaleString(),
                    })}
            </div>
          </div>
        </div>

        <p className="mt-2 hidden px-1 text-[11px] text-muted-foreground/70 sm:block">
          {formatMessageSlots(
            t(
              "Pro tips: use {examples}. Press {focusKey} to focus, {toggleKey} to toggle filters.",
            ),
            {
              examples: (
                <>
                  <span className="font-mono">bp&gt;50000</span>,{" "}
                  <span className="font-mono">avg&lt;200000</span>,{" "}
                  <span className="font-mono">cat:weapon</span>,{" "}
                  <span className="font-mono">trader</span>,{" "}
                  <span className="font-mono">fav</span>
                </>
              ),
              focusKey: <span className="font-mono">/</span>,
              toggleKey: <span className="font-mono">Shift+Enter</span>,
            },
          )}
        </p>
      </div>

      {(isRetryingTarkovRequest || isCoolingDownTarkovRequest || loadError) && (
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 shadow-sm dark:text-amber-100">
          <div className="flex items-start gap-3">
            {isRetryingTarkovRequest ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-medium">
                {isRetryingTarkovRequest
                  ? t(
                      "Tarkov.dev is not responding. Retrying in {seconds}s... attempt {attempt} of {max}.",
                      {
                        seconds: retrySeconds,
                        attempt: requestStatus.attempt,
                        max: requestStatus.maxAttempts,
                      },
                    )
                  : isCoolingDownTarkovRequest
                    ? t(
                        "Tarkov.dev is unavailable. Using cached data where possible. Try again in {seconds}s.",
                        { seconds: cooldownSeconds },
                      )
                    : t("Tarkov.dev item data could not be loaded.")}
              </p>
              {(requestStatus.usingStaleData ||
                Object.values(itemsByMode).some(
                  (items) => items.length > 0,
                )) && (
                <p className="mt-1 text-xs opacity-80">
                  {t("Base Values is showing the last loaded item data.")}
                </p>
              )}
              {loadError &&
                !isRetryingTarkovRequest &&
                !isCoolingDownTarkovRequest && (
                  <p className="mt-1 text-xs opacity-80">{loadError}</p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Sorting */}
      <details
        className="group/filters mb-4 rounded-xl border border-border/60"
        open={isAdvancedOpen}
        onToggle={(event) => setIsAdvancedOpen(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            {t("Filters and sorting")}
          </span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
            <span className="hidden sm:inline">
              {t("Expand for advanced controls")}
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open/filters:rotate-180" />
          </span>
        </summary>
        <div className="space-y-5 border-t border-border/60 px-4 py-4">
          <div>
            <PriceRangeFilter
              min={getMinMax(items, "basePrice")[0]}
              max={getMinMax(items, "basePrice")[1]}
              value={filter.basePrice}
              onChange={(value) => {
                startTransition(() => {
                  setFilter((f) => ({ ...f, basePrice: value }));
                });
              }}
              onReset={() => {
                startTransition(() => {
                  const [min, max] = getMinMax(items, "basePrice");
                  setFilter((f) => ({ ...f, basePrice: [min, max] }));
                });
              }}
              label={t("Filter by Base Price")}
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("Presets:")}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs shadow-none"
              onClick={() => {
                startTransition(() => {
                  const [min, max] = getMinMax(items, "basePrice");
                  setFilter((f) => ({
                    ...f,
                    basePrice: [Math.max(min, 100000), max],
                    sort: "basePrice",
                    sortDir: "desc",
                  }));
                });
              }}
            >
              {t("High base")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs shadow-none"
              onClick={() => {
                startTransition(() => {
                  setFilter((f) => ({
                    ...f,
                    sort: "bestValue",
                    sortDir: "desc",
                  }));
                });
              }}
            >
              {t("Best value")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              variant="outline"
              aria-label={t("Show only favorites")}
              pressed={showOnlyFavorites}
              onPressedChange={(pressed) => {
                startTransition(() => {
                  setShowOnlyFavorites(pressed);
                });
              }}
              disabled={!hasFavorites}
              className="h-8 px-3 text-xs shadow-none"
            >
              <Star
                className={`h-4 w-4 mr-2 ${
                  showOnlyFavorites
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
              <span className="text-xs font-medium">{t("Favorites")}</span>
            </Toggle>

            <Toggle
              pressed={showCompatibleOnly}
              onPressedChange={setShowCompatibleOnly}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <span className="text-xs">{t("Compatible Only")}</span>
            </Toggle>

            <Toggle
              pressed={showTraderOnly}
              onPressedChange={setShowTraderOnly}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <span className="text-xs">{t("Trader Only")}</span>
            </Toggle>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {t("Sort by:")}
              </span>
              <Select
                value={filter.sort}
                onValueChange={(value) => {
                  startTransition(() => {
                    setFilter((f) => ({
                      ...f,
                      sort: value as
                        | "name"
                        | "shortName"
                        | "basePrice"
                        | "lastLowPrice"
                        | "avg24hPrice"
                        | "traderSellPrice"
                        | "traderBuyPrice"
                        | "buyLimit"
                        | "bestValue",
                      sortDir:
                        value === "name" || value === "shortName"
                          ? "asc"
                          : "desc",
                    }));
                  });
                }}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs shadow-none">
                  <SelectValue placeholder={t("Sort by...")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basePrice">{t("Base Price")}</SelectItem>
                  <SelectItem value="lastLowPrice">
                    {t("Last Low Price")}
                  </SelectItem>
                  <SelectItem value="avg24hPrice">
                    {t("24h Avg Price")}
                  </SelectItem>
                  <SelectItem value="traderSellPrice">
                    {t("Sell to Trader")}
                  </SelectItem>
                  <SelectItem value="traderBuyPrice">
                    {t("Buy from Trader")}
                  </SelectItem>
                  <SelectItem value="buyLimit">{t("Buy Limit")}</SelectItem>
                  <SelectItem value="name">{t("Name")}</SelectItem>
                  <SelectItem value="shortName">{t("Short Name")}</SelectItem>
                  <SelectItem value="bestValue">{t("Best Value")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  startTransition(() => {
                    setFilter((f) => ({
                      ...f,
                      sortDir: f.sortDir === "asc" ? "desc" : "asc",
                    }));
                  });
                }}
              >
                {filter.sortDir === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              onClick={() => exportToExcel(filtered)}
              variant="outline"
              size="sm"
              className="ml-auto h-8 gap-2 text-xs shadow-none"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Export")}</span>
            </Button>
          </div>
        </div>
      </details>

      {/* Table Section with loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center h-12 mt-2">
          <Loader2 className="animate-spin h-5 w-5 text-blue-500 mr-2" />
          <span className="text-sm text-muted-foreground">
            {t("Updating...")}
          </span>
        </div>
      )}

      {/* No results messages */}
      {showOnlyFavorites && filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <Star className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t("No favorite items")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {hasFavorites
              ? t(
                  "No favorites match the current filters. Try adjusting your search or filters.",
                )
              : t(
                  "You haven't added any items to your favorites yet. Click the star icon next to an item to add it to your favorites.",
                )}
          </p>
        </div>
      )}

      {showCompatibleOnly && filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <CircleAlert className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t("No compatible items")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t(
              "No items match the compatibility criteria with your current filters.",
            )}
          </p>
        </div>
      )}

      {showTraderOnly && filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <CircleAlert className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t("No trader items")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("No items with trader buy prices match your current filters.")}
          </p>
        </div>
      )}

      {/* Virtualized Table with skeleton fallback during loading */}
      {!showOnlyFavorites || filtered.length > 0 ? (
        isLoading ? (
          <TableSkeleton />
        ) : (
          <VirtualizedTable
            items={filtered}
            sortKey={filter.sort}
            sortDir={filter.sortDir}
            onHeaderSort={handleHeaderSort}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        )
      ) : null}
    </div>
  );
}
