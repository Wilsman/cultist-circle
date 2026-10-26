// Helpers for the hidden /base-value-lab page: turn the site's item list into
// filler options and pick the next test to ask a contributor to run.

import {
  DEFAULT_SETTINGS,
  planTest,
  type FillerOption,
  type LabSettings,
  type Range,
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

/**
 * Bare gun frames match their API value, so testing focuses on guns with
 * parts attached: they are where the API goes wrong.
 */
const hasParts = (s: Subject) => s.kind === "weapon";

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
    .filter((s) => !skip.has(s.id) && s.kind !== "weapon-bare")
    .map((subject) => ({ subject, result: results.get(subject.id) }))
    .filter(
      ({ result }) => PRIORITY[result?.status ?? "untested"] !== undefined,
    )
    .sort(
      (a, b) =>
        Number(hasParts(b.subject)) - Number(hasParts(a.subject)) ||
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

export type GunVersionTone = "stripped" | "default" | "build" | "preset";

export interface GunVersion {
  /** Short gun name (no caliber or weapon type), e.g. "HK MP5 (Navy 3 Round Burst)". */
  name: string;
  /** Short tag, e.g. "Stripped". */
  tag: string;
  /** One line telling the tester exactly what state the gun must be in. */
  instruction: string;
  tone: GunVersionTone;
  /** Heading for the parts list, when there is one. */
  partsLabel?: string;
  parts: { name: string; count: number }[];
}

const WEAPON_TYPES =
  /\s(?:(?:bolt|pump|lever)-action |(?:semi-)?automatic )?(submachine gun|assault rifle|assault carbine|machine pistol|pistol|carbine|shotgun|sniper rifle|marksman rifle|bolt-action rifle|light machine gun|machine gun|grenade launcher|revolver)\b/i;

/** Drops the caliber and weapon type: "HK MP5 9x19 submachine gun (Navy)" -> "HK MP5 (Navy)". */
export function shortGunName(name: string): string {
  return name
    .replace(/\s(\.?\d+(\.\d+)?x\d+\w*|\d+ga)\b/, "")
    .replace(WEAPON_TYPES, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * How a gun subject must be prepared. Players mix up "the gun" (the bare
 * receiver) and "the gun Default" (the factory preset), so every gun says
 * which one it is in plain words, with the parts to take off or keep on.
 */
export function gunVersion(subject: Subject): GunVersion | null {
  const parts = subject.parts ?? [];
  if (subject.kind === "weapon-bare")
    return {
      name: shortGunName(subject.name),
      tag: "Stripped",
      instruction:
        "Take EVERY attachment off. Only the bare gun goes in, with nothing attached.",
      tone: "stripped",
      partsLabel: parts.length ? "Remove all of these:" : undefined,
      parts,
    };
  if (subject.kind !== "weapon") return null;
  if (subject.build)
    return {
      name: shortGunName(subject.name.split(" + ")[0]),
      tag: "Custom build",
      instruction:
        "Strip the gun completely, then attach only these parts. Nothing else.",
      tone: "build",
      partsLabel: "Attach only these:",
      parts: subject.build.mods.map((m) => ({ name: m.name, count: m.count })),
    };
  if (/ Default$/.test(subject.name))
    return {
      name: shortGunName(subject.name.replace(/ Default$/, "")),
      tag: "Default",
      instruction:
        "Exactly as traders sell it, with all its factory parts on. Don't add or remove anything.",
      tone: "default",
      partsLabel: parts.length ? "It should have all of these on:" : undefined,
      parts,
    };
  return {
    name: shortGunName(subject.name),
    tag: "Preset",
    instruction: "Exactly as this preset comes. Don't add or remove anything.",
    tone: "preset",
    parts,
  };
}

/** What the attached parts of one gun are worth, next to the API's figure. */
export interface PartsValue {
  /** API value of the bare frame (frames match the API). */
  frame: number;
  /** API value of the attached parts together. */
  apiParts: number;
  /** Measured value of the attached parts, once tested. */
  measured?: Range;
  /** Measured value divided by the API value. */
  multiplier?: Range;
}

export function partsValue(
  subject: Subject,
  result?: SubjectResult,
): PartsValue | null {
  if (subject.kind !== "weapon" || subject.apiBaseValue === undefined)
    return null;
  const frame = subject.build?.gunValue ?? subject.frameValue;
  if (frame === undefined) return null;
  const apiParts = subject.apiBaseValue - frame;
  if (apiParts <= 0) return { frame, apiParts };
  const tested =
    result &&
    result.testCount > 0 &&
    result.status !== "conflict" &&
    result.status !== "untested";
  if (!tested) return { frame, apiParts };
  const measured = {
    lo: Math.max(0, result.range.lo - frame),
    hi: result.range.hi - frame,
  };
  return {
    frame,
    apiParts,
    measured,
    multiplier: { lo: measured.lo / apiParts, hi: measured.hi / apiParts },
  };
}

/**
 * The parts multiplier every tested gun agrees on, or "conflict" when no
 * single multiplier fits them all.
 */
export function sharedMultiplier(
  values: readonly (PartsValue | null)[],
): Range | "conflict" | null {
  const ranges = values.flatMap((v) => (v?.multiplier ? [v.multiplier] : []));
  if (!ranges.length) return null;
  const lo = Math.max(...ranges.map((r) => r.lo));
  const hi = Math.min(...ranges.map((r) => r.hi));
  return lo <= hi ? { lo, hi } : "conflict";
}
