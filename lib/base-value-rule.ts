// The hidden rule behind gun base values. Two candidates are tested side by
// side, and the picker aims each test at a gun where they disagree:
//
// - Nested: each item counts its base value once for itself and once more for
//   every item it hangs from. Gun 1×, a part on the gun 2×, a part on that
//   part 3×. Nothing is fitted.
// - Flat: the frame counts as the API says and attached parts count one
//   shared multiple of their API value, fitted to the tested guns.

import {
  DEFAULT_SETTINGS,
  partChains,
  partDepths,
  planAt,
  subjectKey,
  type FillerOption,
  type LabMode,
  type LabSettings,
  type Range,
  type SlottedItem,
  type Subject,
  type SubjectResult,
} from "./base-value-lab";
import {
  partsValue,
  pickNextTest,
  type NextTest,
  type PartsValue,
} from "./base-value-site";

const isMeasured = (r?: SubjectResult): r is SubjectResult =>
  !!r && r.testCount > 0 && r.status !== "conflict" && r.status !== "untested";

const inside = (v: number, r: Range) => r.lo <= v && v <= r.hi;

function intersect(ranges: readonly Range[]): Range | "conflict" | null {
  if (!ranges.length) return null;
  const lo = Math.max(...ranges.map((r) => r.lo));
  const hi = Math.min(...ranges.map((r) => r.hi));
  return lo <= hi ? { lo, hi } : "conflict";
}

const MOUNT = /\b(mount|adapter|rail|rings?|base)\b/i;

/**
 * The one part a build is about: the part it names as its main one, or else
 * its most valuable part when everything else is a mount and it carries most
 * of the value. Null otherwise.
 */
export function mainPart(subject: Subject) {
  const mods = subject.build?.mods;
  if (!mods?.length) return null;
  const named = subject.build?.main;
  if (named) return mods.find((m) => m.itemId === named) ?? null;
  const worth = (m: (typeof mods)[number]) => m.baseValue * m.count;
  const total = mods.reduce((n, m) => n + worth(m), 0);
  const top = mods.reduce((a, b) => (worth(b) > worth(a) ? b : a));
  const mountsOnly = mods.every((m) => m === top || MOUNT.test(m.name));
  return top.count === 1 && mountsOnly && worth(top) >= total * 0.7
    ? top
    : null;
}

/** An item from json.tarkov.dev with what the nested rule needs. */
export interface CatalogItem {
  id: string;
  basePrice: number;
  /** A gun receiver: the root of a preset. */
  gun?: boolean;
  slots?: { name: string; allowed: string[] }[];
  /** A preset's items, gun included. */
  contains?: string[];
}

export type Catalog = ReadonlyMap<string, CatalogItem>;

/**
 * A gun's value under the nested rule. Null when the item cache can't place
 * every part, e.g. a build part without an item id.
 */
export function nestedValue(subject: Subject, catalog: Catalog): number | null {
  if (subject.kind !== "weapon" && subject.kind !== "weapon-bare") return null;
  const item = subject.itemId ? catalog.get(subject.itemId) : undefined;
  if (!item) return null;
  let gun: CatalogItem | undefined = item;
  let ids: (string | undefined)[] = [];
  if (subject.build) {
    ids = subject.build.mods.flatMap((m) => Array(m.count).fill(m.itemId));
  } else if (item.gun) {
    // A receiver lists its factory parts too; a default gun carries them.
    if (subject.kind === "weapon") ids = item.contains ?? [];
  } else if (item.contains?.length) {
    gun = item.contains.map((id) => catalog.get(id)).find((c) => c?.gun);
    const at = gun ? item.contains.indexOf(gun.id) : -1;
    ids = item.contains.filter((_, i) => i !== at);
  }
  if (!gun) return null;
  const parts = ids.map((id) => (id ? catalog.get(id) : undefined));
  if (parts.some((p) => !p)) return null;
  const placed = partDepths(gun, parts as CatalogItem[]);
  if (!placed) return null;
  return placed.reduce(
    (n, { item: p, depth }) => n + p.basePrice * (depth + 1),
    gun.basePrice,
  );
}

export interface MultiplierFit {
  /** The multiplier the most guns agree on. */
  band: Range;
  /** Ids of the guns inside `band`. */
  fit: string[];
  /** Ids of every gun with a measured multiplier. */
  tested: string[];
}

/**
 * The multiplier range the most tested guns agree on. When every gun agrees
 * this is the shared range; otherwise the largest group that does.
 */
export function fitMultiplier(
  rows: readonly { subject: Subject; value: PartsValue | null }[],
): MultiplierFit | null {
  const tested = rows.flatMap(({ subject, value }) =>
    value?.multiplier ? [{ id: subject.id, m: value.multiplier }] : [],
  );
  if (!tested.length) return null;
  let best: { id: string; m: Range }[] = [];
  for (const { m } of tested) {
    const at = m.lo;
    const inside = tested.filter((t) => t.m.lo <= at && t.m.hi >= at);
    if (inside.length > best.length) best = inside;
  }
  const band = intersect(best.map((t) => t.m)) as Range;
  return {
    band,
    fit: best.map((t) => t.id),
    tested: tested.map((t) => t.id),
  };
}

/** One gun's measured value next to what each rule predicts. */
export interface TheoryRow {
  subject: Subject;
  result?: SubjectResult;
  /** Set once tests agree on a range. */
  measured?: Range;
  nested: number | null;
  flat: number | null;
  /** API and measured worth of the attached parts. */
  parts: PartsValue | null;
}

export interface Theories {
  /** The parts multiplier the flat rule uses, fitted to the tested guns. */
  multiplier: number | null;
  /** The multiplier range the most tested guns agree on. */
  band: Range | null;
  rows: TheoryRow[];
}

/** Both rules' predictions for every subject. */
export function compareTheories(
  subjects: readonly Subject[],
  results: Map<string, SubjectResult>,
  catalog: Catalog,
): Theories {
  const values = subjects.map((subject) => {
    const result = results.get(subject.id);
    return { subject, result, value: partsValue(subject, result) };
  });
  const band = fitMultiplier(values)?.band ?? null;
  const multiplier = !band
    ? null
    : band.hi === Infinity
      ? band.lo
      : (band.lo + band.hi) / 2;
  return {
    multiplier,
    band,
    rows: values.map(({ subject, result, value }) => ({
      subject,
      result,
      measured: isMeasured(result) ? result.range : undefined,
      nested: nestedValue(subject, catalog),
      flat:
        subject.kind === "weapon-bare"
          ? (subject.apiBaseValue ?? null)
          : value && multiplier !== null
            ? value.frame + multiplier * Math.max(0, value.apiParts)
            : null,
      parts: value,
    })),
  };
}

/** Whether a rule's prediction falls inside the measured range, once both exist. */
export function fits(row: TheoryRow, rule: "nested" | "flat"): boolean | null {
  const v = row[rule];
  return v === null || !row.measured ? null : inside(v, row.measured);
}

/** What the two rules predict for the gun under test. */
export interface TheoryTest {
  nested: number;
  flat: number;
  /** The flat rule's parts multiplier. */
  multiplier: number | null;
}

export type PickedTest = NextTest & { theory?: TheoryTest };

const ITEM_PENALTY = 2_000;
// Roubles a split right between the two predictions is worth.
const MARGIN_WEIGHT = 400_000;

/**
 * The next test: a gun where the two rules predict different timers, split
 * between them so the result backs one rule. Falls back to narrowing guns
 * one at a time once no gun can tell them apart.
 */
export function pickTest({
  subjects,
  results,
  fillers,
  skip,
  copyCost,
  catalog,
  settings = DEFAULT_SETTINGS,
}: {
  subjects: readonly Subject[];
  results: Map<string, SubjectResult>;
  fillers: readonly FillerOption[];
  skip: ReadonlySet<string>;
  copyCost: (subject: Subject) => number;
  catalog: Catalog;
  settings?: LabSettings;
}): PickedTest | null {
  const { multiplier, rows } = compareTheories(subjects, results, catalog);
  let best: { pick: PickedTest; score: number } | null = null;
  for (const { subject, result, measured, nested, flat } of rows) {
    if (skip.has(subject.id) || nested === null || flat === null) continue;
    if (result?.status === "conflict") continue;
    const lo = Math.min(nested, flat);
    const hi = Math.max(nested, flat);
    if (hi - lo < 100) continue;
    // This gun's own tests already back one rule.
    const range = measured ?? { lo: 0, hi: Infinity };
    if (!inside(nested, range) || !inside(flat, range)) continue;
    const cost = copyCost(subject);
    const plan = planAt(
      { subject, result, fillers, settings, copyCost: cost },
      range,
      (lo + hi) / 2,
      (hi - lo) * 0.4,
    );
    if (!plan || plan.splitAt <= lo || plan.splitAt >= hi) continue;
    // Room on each side, so a small error in either rule can't flip it.
    const margin = Math.min(plan.splitAt - lo, hi - plan.splitAt) / hi;
    const items = plan.qty + plan.fillers.reduce((n, f) => n + f.qty, 0);
    const score =
      plan.fillerCost +
      (plan.qty - 1) * cost +
      items * ITEM_PENALTY -
      margin * MARGIN_WEIGHT;
    if (!best || score < best.score)
      best = {
        pick: {
          subject,
          result,
          plan,
          theory: { nested, flat, multiplier },
        },
        score,
      };
  }
  return (
    best?.pick ??
    pickNextTest({ subjects, results, fillers, skip, copyCost, settings })
  );
}

/** An item with slot data and its API base value, from the item cache. */
export interface PricedItem extends SlottedItem {
  basePrice: number;
}

/** Smallest main part worth a single-part build; cheaper ones barely move a timer. */
export const SINGLE_PART_MIN = 5_000;

/**
 * Builds that put one valuable part (plus the mounts it hangs from) on a bare
 * frame. If parts count differently by type, these disagree with each other.
 * Skips builds already in `existing`; ids are stable so re-runs update rows.
 */
export function singlePartBuilds({
  mode,
  gun,
  parts,
  existing,
  limit = 3,
}: {
  mode: LabMode;
  gun: PricedItem;
  /** Parts that fit together on the gun, e.g. a preset's or a build's. */
  parts: readonly PricedItem[];
  existing: readonly Subject[];
  limit?: number;
}): Subject[] {
  const have = new Set(existing.map(subjectKey));
  const out: Subject[] = [];
  for (const chain of partChains(gun, parts).values()) {
    const main = chain[chain.length - 1];
    if (main.basePrice < SINGLE_PART_MIN) continue;
    const subject: Subject = {
      id: `single-${mode}-${gun.id.slice(-8)}-${main.id.slice(-8)}`,
      mode,
      itemId: gun.id,
      name: [gun.name, ...chain.map((p) => p.name)].join(" + "),
      kind: "weapon",
      apiBaseValue: gun.basePrice + chain.reduce((n, p) => n + p.basePrice, 0),
      build: {
        gunValue: gun.basePrice,
        main: main.id,
        mods: chain.map((p) => ({
          itemId: p.id,
          name: p.name,
          baseValue: p.basePrice,
          count: 1,
        })),
      },
      notes: `Single-part build for ${main.name}.`,
    };
    if (!mainPart(subject) || have.has(subjectKey(subject))) continue;
    have.add(subjectKey(subject));
    out.push(subject);
  }
  return out
    .sort((a, b) => mainPart(b)!.baseValue - mainPart(a)!.baseValue)
    .slice(0, limit);
}
