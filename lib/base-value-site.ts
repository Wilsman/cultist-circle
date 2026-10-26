// Helpers for the hidden /base-value-lab page: turn the site's item list into
// filler options and pick the next test to ask a contributor to run.

import {
  DEFAULT_SETTINGS,
  planTest,
  type FillerOption,
  type LabSettings,
  type Subject,
  type SubjectResult,
  type TestPlan,
} from "./base-value-lab";

export interface ShopItem {
  id: string;
  name: string;
  basePrice: number;
  lastLowPrice: number | null;
  categories: { name: string }[];
  buyFor: {
    priceRUB: number;
    vendor: { normalizedName: string; minTraderLevel?: number };
  }[];
}

export interface SiteFiller extends FillerOption {
  /** Where to buy it, e.g. "Prapor LL2" or "Flea". */
  source: string;
}

// The API's base value is wrong (or meaningless) for these, which is why
// they are being measured. Never use one as a known filler.
const UNRELIABLE =
  /^(weapon|armor|armor plate|armored equipment|headwear|key|keys|mechanical key|keycard|chest rig|backpack|preset)$/i;

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Cheapest way to buy one: a trader offer, or the flea when allowed. */
export function cheapestOffer(
  item: ShopItem,
  { flea = true }: { flea?: boolean } = {},
): { cost: number; source: string } | null {
  let best: { cost: number; source: string } | null = null;
  for (const offer of item.buyFor ?? []) {
    const vendor = offer.vendor.normalizedName;
    if (vendor === "flea-market" || !(offer.priceRUB > 0)) continue;
    if (!best || offer.priceRUB < best.cost) {
      const level = offer.vendor.minTraderLevel;
      best = {
        cost: offer.priceRUB,
        source: `${titleCase(vendor)}${level ? ` LL${level}` : ""}`,
      };
    }
  }
  if (flea && item.lastLowPrice && (!best || item.lastLowPrice < best.cost))
    best = { cost: item.lastLowPrice, source: "Flea" };
  return best;
}

/** Best value-per-rouble items, plus a couple per value band to fill any gap. */
export function buildFillerOptions(
  items: readonly ShopItem[],
  maxItems = DEFAULT_SETTINGS.maxItems,
): SiteFiller[] {
  const priced: { item: ShopItem; cost: number; source: string }[] = [];
  for (const item of items) {
    if (!(item.basePrice > 0)) continue;
    if (item.categories.some((c) => UNRELIABLE.test(c.name))) continue;
    const offer = cheapestOffer(item);
    if (offer) priced.push({ item, ...offer });
  }
  priced.sort((a, b) => a.cost / a.item.basePrice - b.cost / b.item.basePrice);
  const pick = new Map(priced.slice(0, 30).map((p) => [p.item.id, p]));
  for (let lo = 200; lo < 400_000; lo *= 1.6) {
    const band = priced
      .filter((p) => p.item.basePrice >= lo && p.item.basePrice < lo * 1.6)
      .slice(0, 2);
    for (const p of band) pick.set(p.item.id, p);
  }
  return [...pick.values()].map(({ item, cost, source }) => ({
    itemId: item.id,
    name: item.name,
    baseValue: item.basePrice,
    cost,
    available: maxItems,
    owned: false,
    source,
  }));
}

const PRIORITY: Partial<Record<SubjectResult["status"], number>> = {
  untested: 0,
  open: 1,
  "needs-confirmation": 2,
};

export interface NextTest {
  subject: Subject;
  result?: SubjectResult;
  plan: TestPlan;
}

/** The most useful test to run next, skipping subjects the tester passed on. */
export function pickNextTest({
  subjects,
  results,
  fillers,
  skip,
  copyCost,
  settings = DEFAULT_SETTINGS,
}: {
  subjects: readonly Subject[];
  results: Map<string, SubjectResult>;
  fillers: readonly FillerOption[];
  skip: ReadonlySet<string>;
  copyCost: (subject: Subject) => number;
  settings?: LabSettings;
}): NextTest | null {
  const ranked = subjects
    .filter((s) => !skip.has(s.id))
    .map((subject) => ({ subject, result: results.get(subject.id) }))
    .filter(
      ({ result }) => PRIORITY[result?.status ?? "untested"] !== undefined,
    )
    .sort(
      (a, b) =>
        PRIORITY[a.result?.status ?? "untested"]! -
          PRIORITY[b.result?.status ?? "untested"]! ||
        (a.result?.testCount ?? 0) - (b.result?.testCount ?? 0),
    );
  for (const { subject, result } of ranked) {
    const plan = planTest({
      subject,
      result,
      fillers,
      settings,
      copyCost: copyCost(subject),
    });
    if (plan) return { subject, result, plan };
  }
  return null;
}
