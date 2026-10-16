"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Ban,
  Check,
  ChevronRight,
  Clock,
  Copy,
  CornerDownLeft,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Star,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useItemsData } from "@/hooks/use-items-data";
import { useLanguage } from "@/contexts/language-context";
import { tarkovRecipes } from "@/data/recipes";
import {
  GAME_MODES,
  GAME_MODE_LABELS,
  getStoredGameMode,
  type GameMode,
} from "@/lib/game-mode";
import { getTraderAvatar } from "@/lib/trader-avatars";
import {
  LOOKUP_PAGES,
  createItemLookupIndex,
  findRelatedRecipes,
  getCircleRestriction,
  getFleaLevelRequirement,
  getItemSlots,
  getTraderBuyOffers,
  getTraderSellOffers,
  isExcludedFrom6hRewards,
  pushRecentItemId,
  readExcludedItemNames,
  readFavoriteItemIds,
  readRecentItemIds,
  searchLookupItems,
  searchLookupPages,
  toggleFavoriteItemId,
  type CircleRestriction,
  type ItemLookupIndex,
  type LookupPage,
} from "@/lib/item-lookup";
import { buildItemLookupUrl } from "@/lib/item-lookup-link";
import { cn, getRelativeDate } from "@/lib/utils";
import type { SimplifiedItem } from "@/types/SimplifiedItem";

type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

const ITEM_PREFIX = "item:";
const PAGE_PREFIX = "page:";
const EMPTY_STATE_LIMIT = 12;

const formatRub = (value: number | undefined) =>
  typeof value === "number" && value > 0
    ? `₽ ${Math.round(value).toLocaleString("en-US")}`
    : "—";

const formatTrader = (name: string) =>
  name.charAt(0).toUpperCase() + name.slice(1);

// tarkov.dev serves a larger render next to each icon
const getLargeImage = (iconLink?: string) =>
  iconLink?.replace(/-icon\.(webp|png|jpg)$/, "-512.$1");

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/10 bg-white/[0.04] px-1 font-sans text-[10px] font-medium text-slate-400">
      {children}
    </kbd>
  );
}

function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true));
      }}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-300" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function ItemRow({
  item,
  favorite,
  restriction,
  onSelect,
  t,
}: {
  item: SimplifiedItem;
  favorite: boolean;
  restriction: CircleRestriction;
  onSelect: (value: string) => void;
  t: Translate;
}) {
  const bestSell = getTraderSellOffers(item)[0];
  return (
    <CommandItem
      value={`${ITEM_PREFIX}${item.id}`}
      onSelect={onSelect}
      className="gap-3 rounded-lg px-2.5 py-2 data-[selected=true]:bg-cyan-300/[0.08] data-[selected=true]:text-slate-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.iconLink}
        alt=""
        loading="lazy"
        className="h-10 w-10 shrink-0 rounded-md border border-white/[0.06] bg-slate-950/60 object-contain"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-slate-100">
            {item.name}
          </span>
          {favorite && (
            <Star className="h-3 w-3 shrink-0 fill-amber-300 text-amber-300" />
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="truncate">{item.shortName}</span>
          {restriction === "incompatible" && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-rose-400/30 bg-rose-400/[0.1] px-1 text-[9px] font-semibold uppercase tracking-wide text-rose-300">
              <Ban className="h-2.5 w-2.5" />
              {t("Incompatible")}
            </span>
          )}
          {restriction === "excluded" && (
            <span className="shrink-0 rounded-sm border border-white/[0.08] bg-white/[0.03] px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              {t("Excluded")}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <div className="text-[13px] font-semibold text-amber-300">
          {formatRub(item.basePrice)}
        </div>
        <div className="text-[11px] text-slate-500">
          {bestSell
            ? `${formatRub(bestSell.priceRUB)} · ${formatTrader(bestSell.vendor.normalizedName)}`
            : t("No trader")}
        </div>
      </div>
    </CommandItem>
  );
}

function PageRow({
  page,
  onSelect,
  t,
}: {
  page: LookupPage;
  onSelect: (value: string) => void;
  t: Translate;
}) {
  return (
    <CommandItem
      value={`${PAGE_PREFIX}${page.href}`}
      onSelect={onSelect}
      className="gap-3 rounded-lg px-2.5 py-2 data-[selected=true]:bg-cyan-300/[0.08] data-[selected=true]:text-slate-100"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-slate-950/60 text-slate-500">
        <FileText className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="flex-1 truncate text-[13px] text-slate-200">
        {t(page.label)}
      </span>
      <span className="text-[11px] text-slate-500">{page.href}</span>
    </CommandItem>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "text-slate-100",
  copyValue,
  t,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: string;
  copyValue?: number;
  t: Translate;
}) {
  return (
    <div className="group relative rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
      <div className={cn("mt-1 text-lg font-bold tabular-nums", tone)}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
      {copyValue ? (
        <CopyButton
          value={String(Math.round(copyValue))}
          label={t("Copy {label}", { label })}
          className="absolute right-1.5 top-1.5 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        />
      ) : null}
    </div>
  );
}

function ItemNotice({
  tone,
  icon: Icon,
  title,
  description,
  href,
  onNavigate,
  t,
}: {
  tone: "danger" | "info";
  icon: typeof Ban;
  title: string;
  description: string;
  href: string;
  onNavigate: (href: string) => void;
  t: Translate;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "note"}
      className={cn(
        "flex gap-3 rounded-xl border px-3.5 py-3",
        tone === "danger"
          ? "border-rose-400/30 bg-rose-400/[0.08]"
          : "border-sky-300/20 bg-sky-300/[0.05]",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "danger" ? "text-rose-300" : "text-sky-300",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] font-semibold",
            tone === "danger" ? "text-rose-200" : "text-sky-200",
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
          {description}
        </p>
        <button
          type="button"
          onClick={() => onNavigate(href)}
          className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-slate-300 underline-offset-2 hover:text-slate-100 hover:underline"
        >
          {t("Read the FAQ")}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function ItemDetail({
  item,
  mode,
  favorite,
  restriction,
  onToggleFavorite,
  onNavigate,
  onBack,
  t,
}: {
  item: SimplifiedItem;
  mode: GameMode;
  favorite: boolean;
  restriction: CircleRestriction;
  onToggleFavorite: () => void;
  onNavigate: (href: string) => void;
  onBack: () => void;
  t: Translate;
}) {
  const [imageFailed, setImageFailed] = useState<string | null>(null);
  const sellOffers = getTraderSellOffers(item);
  const buyOffers = getTraderBuyOffers(item);
  const bestSell = sellOffers[0];
  const cheapestBuy = buyOffers[0];
  const slots = getItemSlots(item);
  const fleaLevel = getFleaLevelRequirement(item);
  const noSixHourReward = isExcludedFrom6hRewards(item);
  const recipes = useMemo(
    () => findRelatedRecipes(item, tarkovRecipes).slice(0, 4),
    [item],
  );
  const largeImage = getLargeImage(item.iconLink);
  const imageSrc =
    largeImage && imageFailed !== item.id ? largeImage : item.iconLink;
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : buildItemLookupUrl(window.location.origin, item.id);

  return (
    <div className="space-y-3 p-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-slate-100 md:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("Back to results")}
      </button>

      <div className="flex gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_40%,rgba(103,232,249,0.08),transparent_70%)] bg-slate-950/60 p-2 sm:h-28 sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={item.id}
            src={imageSrc}
            alt={item.name}
            onError={() => setImageFailed(item.id)}
            className="max-h-full max-w-full object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-slate-100 sm:text-lg">
            {item.name}
          </h3>
          <p className="text-xs text-slate-500">{item.shortName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
            <span className="rounded border border-white/[0.08] px-1.5 py-0.5 text-slate-400">
              {item.width ?? 1}x{item.height ?? 1}
            </span>
            {fleaLevel > 0 && (
              <span className="rounded border border-cyan-300/20 bg-cyan-300/[0.06] px-1.5 py-0.5 text-cyan-200/90">
                {t("Flea Lv. {level}", { level: fleaLevel })}
              </span>
            )}
            {restriction === "excluded" && (
              <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-slate-400">
                {t("Not used by auto-select")}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-0.5">
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? t("Remove favourite") : t("Add favourite")}
              title={favorite ? t("Remove favourite") : t("Add favourite")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-amber-200"
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  favorite && "fill-amber-300 text-amber-300",
                )}
              />
            </button>
            {shareUrl && (
              <CopyButton value={shareUrl} label={t("Copy share link")} />
            )}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("Open on tarkov.dev")}
                title={t("Open on tarkov.dev")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {restriction === "incompatible" && (
        <ItemNotice
          tone="danger"
          icon={Ban}
          title={t("Can't be placed in the Cultist Circle")}
          description={t(
            "The game won't accept this item in the circle, so it can't count toward a ritual's value.",
          )}
          href="/faq#incompatible"
          onNavigate={onNavigate}
          t={t}
        />
      )}
      {noSixHourReward && (
        <ItemNotice
          tone="info"
          icon={Clock}
          title={t("Never a 6h ritual reward")}
          description={t(
            "You can still sacrifice it, and it can come from 14h rituals, but the 6h ritual never returns it.",
          )}
          href="/faq#6h-exclusions"
          onNavigate={onNavigate}
          t={t}
        />
      )}

      <div className="group relative rounded-xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.09] to-amber-300/[0.02] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/70">
          {t("Base value")}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-3xl font-black tabular-nums text-amber-200">
            {formatRub(item.basePrice)}
          </div>
          {slots > 1 && (
            <div className="text-xs tabular-nums text-amber-200/60">
              {t("{price} / slot", {
                price: formatRub(item.basePrice / slots),
              })}
            </div>
          )}
        </div>
        <CopyButton
          value={String(item.basePrice)}
          label={t("Copy base value")}
          className="absolute right-2 top-2 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label={t("Flea low")}
          value={
            item.lastLowPrice ? formatRub(item.lastLowPrice) : t("Not on flea")
          }
          tone="text-emerald-300"
          sub={
            item.lastLowPrice && slots > 1
              ? t("{price} / slot", {
                  price: formatRub(item.lastLowPrice / slots),
                })
              : undefined
          }
          copyValue={item.lastLowPrice}
          t={t}
        />
        <StatCard
          label={t("Flea 24h avg")}
          value={formatRub(item.avg24hPrice)}
          tone="text-cyan-200"
          copyValue={item.avg24hPrice}
          t={t}
        />
        <StatCard
          label={t("Trader sell")}
          value={formatRub(bestSell?.priceRUB)}
          sub={
            bestSell ? formatTrader(bestSell.vendor.normalizedName) : undefined
          }
          copyValue={bestSell?.priceRUB}
          t={t}
        />
        <StatCard
          label={t("Trader buy")}
          value={formatRub(cheapestBuy?.priceRUB)}
          sub={
            cheapestBuy
              ? `${formatTrader(cheapestBuy.vendor.normalizedName)} LL${cheapestBuy.vendor.minTraderLevel ?? 1}`
              : t("Not sold by traders")
          }
          copyValue={cheapestBuy?.priceRUB}
          t={t}
        />
      </div>

      {(sellOffers.length > 1 || buyOffers.length > 1) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            {
              title: t("Sell to"),
              offers: sellOffers.slice(0, 4).map((offer) => ({
                trader: offer.vendor.normalizedName,
                price: offer.priceRUB,
                level: undefined as number | undefined,
              })),
            },
            {
              title: t("Buy from"),
              offers: buyOffers.slice(0, 4).map((offer) => ({
                trader: offer.vendor.normalizedName,
                price: offer.priceRUB,
                level: offer.vendor.minTraderLevel,
              })),
            },
          ]
            .filter(({ offers }) => offers.length > 0)
            .map(({ title, offers }) => (
              <div
                key={title}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
              >
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {title}
                </div>
                <ul className="space-y-1">
                  {offers.map(({ trader, price, level }, index) => {
                    const avatar = getTraderAvatar(trader);
                    return (
                      <li
                        key={`${trader}-${index}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatar}
                            alt=""
                            className="h-5 w-5 rounded-sm"
                          />
                        ) : (
                          <span className="h-5 w-5 rounded-sm bg-white/[0.05]" />
                        )}
                        <span className="flex-1 truncate text-slate-300">
                          {formatTrader(trader)}
                          {level ? (
                            <span className="ml-1 text-slate-500">
                              LL{level}
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular-nums text-slate-200">
                          {formatRub(price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}

      {recipes.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            {t("Known recipes")}
          </div>
          <ul className="space-y-2">
            {recipes.map(({ recipe, asInput, asOutput }) => (
              <li key={recipe.id} className="text-xs">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-sm bg-amber-300/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-amber-200/90">
                    {recipe.craftingTime}
                  </span>
                  {asOutput && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">
                      {t("Reward")}
                    </span>
                  )}
                  {asInput && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">
                      {t("Sacrifice")}
                    </span>
                  )}
                </div>
                <p className="text-slate-400">
                  {recipe.requiredItems.join(", ")}
                  <span className="mx-1 text-slate-600">→</span>
                  <span className="text-slate-300">
                    {recipe.producedItems
                      .flatMap((entry) =>
                        typeof entry === "string" ? [entry] : entry.items,
                      )
                      .join(", ")}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-slate-600">
        {GAME_MODE_LABELS[mode]}
        {item.updated
          ? ` · ${t("Prices updated {time}", { time: getRelativeDate(item.updated) })}`
          : null}
      </p>
    </div>
  );
}

function PaletteBody({
  index,
  itemsById,
  isLoading,
  hasError,
  mode,
  onCycleMode,
  initialItemId,
  onClose,
}: {
  index: ItemLookupIndex;
  itemsById: Map<string, SimplifiedItem>;
  isLoading: boolean;
  hasError: boolean;
  mode: GameMode;
  onCycleMode: (direction: 1 | -1) => void;
  initialItemId: string | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [highlighted, setHighlighted] = useState(
    initialItemId ? `${ITEM_PREFIX}${initialItemId}` : "",
  );
  const [showMobileDetail, setShowMobileDetail] = useState(
    Boolean(initialItemId),
  );
  const [recentIds] = useState(readRecentItemIds);
  const [excludedNames] = useState(readExcludedItemNames);
  const [favorites, setFavorites] = useState(() => ({
    mode,
    ids: readFavoriteItemIds(mode),
  }));
  if (favorites.mode !== mode) {
    setFavorites({ mode, ids: readFavoriteItemIds(mode) });
  }
  const favoriteIds = favorites.ids;
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const lastItemIdRef = useRef<string | null>(null);

  const trimmedQuery = deferredQuery.trim();

  const groups = useMemo(() => {
    if (trimmedQuery) {
      return {
        items: [
          {
            heading: t("Items"),
            items: searchLookupItems(index, trimmedQuery),
          },
        ],
        pages: searchLookupPages(LOOKUP_PAGES, trimmedQuery),
      };
    }

    // Empty query: shared link item, then recents, then favourites, no repeats
    const seen = new Set<string>();
    const pick = (ids: string[]) => {
      const picked: SimplifiedItem[] = [];
      for (const id of ids) {
        const item = itemsById.get(id);
        if (!item || seen.has(id)) continue;
        seen.add(id);
        picked.push(item);
        if (picked.length >= EMPTY_STATE_LIMIT) break;
      }
      return picked;
    };
    return {
      items: [
        {
          heading: t("Shared item"),
          items: pick(initialItemId ? [initialItemId] : []),
        },
        { heading: t("Recent"), items: pick(recentIds) },
        { heading: t("Favourites"), items: pick(favoriteIds) },
      ],
      pages: LOOKUP_PAGES,
    };
  }, [
    trimmedQuery,
    index,
    itemsById,
    initialItemId,
    recentIds,
    favoriteIds,
    t,
  ]);

  const values = useMemo(
    () => [
      ...groups.items.flatMap((group) =>
        group.items.map((item) => `${ITEM_PREFIX}${item.id}`),
      ),
      ...groups.pages.map((page) => `${PAGE_PREFIX}${page.href}`),
    ],
    [groups],
  );
  const activeValue = values.includes(highlighted)
    ? highlighted
    : (values[0] ?? "");
  const activeItem = activeValue.startsWith(ITEM_PREFIX)
    ? itemsById.get(activeValue.slice(ITEM_PREFIX.length))
    : undefined;
  const itemCount = groups.items.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  useEffect(() => {
    lastItemIdRef.current = activeItem?.id ?? lastItemIdRef.current;
  }, [activeItem]);

  // Remember the item the user ended on
  useEffect(
    () => () => {
      if (lastItemIdRef.current) pushRecentItemId(lastItemIdRef.current);
    },
    [],
  );

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleSelect = (value: string) => {
    if (value.startsWith(PAGE_PREFIX)) {
      navigate(value.slice(PAGE_PREFIX.length));
      return;
    }
    setHighlighted(value);
    setShowMobileDetail(true);
  };

  const loadingCatalog = isLoading && itemsById.size === 0;

  return (
    <Command
      shouldFilter={false}
      loop
      value={activeValue}
      onValueChange={setHighlighted}
      onKeyDown={(event) => {
        // Only from the search box, so Tab still moves between detail buttons
        if (event.key !== "Tab") return;
        if (!(event.target as HTMLElement).hasAttribute("cmdk-input")) return;
        event.preventDefault();
        onCycleMode(event.shiftKey ? -1 : 1);
      }}
      className="h-full rounded-none bg-transparent text-slate-200"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] py-2 pl-4 pr-14">
        {loadingCatalog ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
        )}
        <CommandPrimitive.Input
          autoFocus
          value={query}
          onValueChange={(next) => {
            setQuery(next);
            setHighlighted("");
            setShowMobileDetail(false);
          }}
          placeholder={
            loadingCatalog
              ? t("Loading item catalog...")
              : t("Search items by name or short name...")
          }
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-slate-100 outline-none placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={() => onCycleMode(1)}
          title={t("Switch game mode (Tab)")}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-cyan-300/20 bg-cyan-300/[0.06] px-2 text-[11px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-300/[0.1]"
        >
          {GAME_MODE_LABELS[mode]}
          <span className="hidden sm:inline-flex">
            <Kbd>Tab</Kbd>
          </span>
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <CommandList
          className={cn(
            "max-h-none min-h-0 overflow-y-auto overscroll-contain p-1.5 md:border-r md:border-white/[0.06]",
            showMobileDetail && activeItem && "hidden md:block",
          )}
        >
          {hasError && itemsById.size === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-rose-300/80">
              {t("Could not load item prices. Try again in a moment.")}
            </p>
          ) : loadingCatalog ? (
            <div className="space-y-1.5 p-1">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-white/[0.03]"
                />
              ))}
            </div>
          ) : null}

          {trimmedQuery &&
          itemCount === 0 &&
          groups.pages.length === 0 &&
          !loadingCatalog ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              {t('No items match "{query}".', { query: trimmedQuery })}
            </p>
          ) : null}

          {!trimmedQuery && itemCount === 0 && !loadingCatalog && (
            <p className="px-3 pb-2 pt-4 text-xs text-slate-500">
              {t("Type an item name or short name, like LEDX or Bitcoin.")}
            </p>
          )}

          {groups.items
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <CommandGroup
                key={group.heading}
                heading={group.heading}
                className="text-slate-200 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-slate-500"
              >
                {group.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    favorite={favoriteSet.has(item.id)}
                    restriction={getCircleRestriction(item, excludedNames)}
                    onSelect={handleSelect}
                    t={t}
                  />
                ))}
              </CommandGroup>
            ))}

          {groups.pages.length > 0 && (
            <CommandGroup
              heading={t("Pages")}
              className="text-slate-200 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-slate-500"
            >
              {groups.pages.map((page) => (
                <PageRow
                  key={page.href}
                  page={page}
                  onSelect={handleSelect}
                  t={t}
                />
              ))}
            </CommandGroup>
          )}
        </CommandList>

        <section
          aria-live="polite"
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            showMobileDetail && activeItem ? "block" : "hidden md:block",
          )}
        >
          {activeItem ? (
            <ItemDetail
              item={activeItem}
              mode={mode}
              favorite={favoriteSet.has(activeItem.id)}
              restriction={getCircleRestriction(activeItem, excludedNames)}
              onToggleFavorite={() =>
                setFavorites({
                  mode,
                  ids: toggleFavoriteItemId(mode, activeItem.id),
                })
              }
              onNavigate={navigate}
              onBack={() => setShowMobileDetail(false)}
              t={t}
            />
          ) : activeValue.startsWith(PAGE_PREFIX) ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
              <CornerDownLeft className="h-5 w-5" />
              {t("Press Enter to open this page.")}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
              {t("Highlight an item to see its prices.")}
            </div>
          )}
        </section>
      </div>

      <div className="hidden items-center justify-between gap-4 border-t border-white/[0.06] px-4 py-2 text-[11px] text-slate-500 sm:flex">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Kbd>
              <ArrowUp className="h-3 w-3" />
            </Kbd>
            <Kbd>
              <ArrowDown className="h-3 w-3" />
            </Kbd>
            {t("Navigate")}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft className="h-3 w-3" />
            </Kbd>
            {t("Open page")}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Tab</Kbd>
            {t("Game mode")}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            {t("Close")}
          </span>
        </div>
        {trimmedQuery ? (
          <span>{t("{count} results", { count: itemCount })}</span>
        ) : null}
      </div>
    </Command>
  );
}

export default function ItemLookupPalette({
  open,
  onOpenChange,
  initialItemId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItemId: string | null;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<GameMode>(() =>
    getStoredGameMode(window.localStorage),
  );
  const [wasOpen, setWasOpen] = useState(open);

  // Follow the site's saved mode each time the palette opens
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMode(getStoredGameMode(window.localStorage));
  }

  // Mounting this component (on open or nav hover) starts the item fetch
  const { data: items, isLoading, hasError } = useItemsData(mode);
  const index = useMemo(() => createItemLookupIndex(items), [items]);
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const cycleMode = (direction: 1 | -1) => {
    setMode((current) => {
      const position = GAME_MODES.indexOf(current);
      return GAME_MODES[
        (position + direction + GAME_MODES.length) % GAME_MODES.length
      ];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[min(40rem,calc(100dvh-2rem))] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border-white/10 bg-[#0b131d]/[0.98] p-0 shadow-[0_30px_120px_rgba(0,0,0,0.7)] sm:rounded-xl [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:p-1.5 [&>button:last-child>svg]:h-4 [&>button:last-child>svg]:w-4"
      >
        <DialogTitle className="sr-only">{t("Item search")}</DialogTitle>
        <PaletteBody
          index={index}
          itemsById={itemsById}
          isLoading={isLoading}
          hasError={hasError}
          mode={mode}
          onCycleMode={cycleMode}
          initialItemId={initialItemId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
