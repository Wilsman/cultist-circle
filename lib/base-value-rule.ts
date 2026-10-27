// The hidden rule behind gun base values. A bare frame matches the API, so
// every candidate rule keeps the frame at its API value and changes only how
// the attached parts count. Tests rule candidates out; the one left standing
// gives the calculator its numbers.

import {
  DEFAULT_SETTINGS,
  partChains,
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

/** How tightly the parts multiplier must be pinned, as ± share of its middle. */
export const RULE_GOAL = 0.025;
/** Guns that must agree before the calculator relies on the multiplier. */
export const RULE_MIN_GUNS = 3;

export type RuleId =
  "whole-gun" | "per-part" | "parts-multiplier" | "by-part-type";
export type RuleVerdict = "fits" | "ruled-out" | "cant-tell";

export interface RuleCheck {
  id: RuleId;
  label: string;
  verdict: RuleVerdict;
  /** The rule's number that every tested item allows, when there is one. */
  range?: Range;
  /** How many tested items the check used. */
  used: number;
  detail: string;
}

const isMeasured = (r?: SubjectResult): r is SubjectResult =>
  !!r && r.testCount > 0 && r.status !== "conflict" && r.status !== "untested";

function intersect(ranges: readonly Range[]): Range | "conflict" | null {
  if (!ranges.length) return null;
  const lo = Math.max(...ranges.map((r) => r.lo));
  const hi = Math.min(...ranges.map((r) => r.hi));
  return lo <= hi ? { lo, hi } : "conflict";
}

const fmt = (n: number) =>
  n === Infinity ? "∞" : n >= 10 ? n.toFixed(0) : n.toFixed(1);
const times = (r: Range) =>
  r.hi === Infinity ? `at least ${fmt(r.lo)}×` : `${fmt(r.lo)}–${fmt(r.hi)}×`;
const roubles = (n: number) =>
  n === Infinity ? "∞" : Math.round(n).toLocaleString("en-US");

/** Attached parts on a gun, counting copies. */
export function partCount(subject: Subject): number {
  const list = subject.build?.mods ?? subject.parts ?? [];
  return list.reduce((n, p) => n + p.count, 0);
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

/** ± share of the middle, e.g. 0.19 for 3.28–4.78×. */
export function precision(range: Range): number {
  if (range.hi === Infinity) return Infinity;
  const mid = (range.lo + range.hi) / 2;
  return mid > 0 ? (range.hi - range.lo) / 2 / mid : Infinity;
}

/** What a gun is worth under "frame + multiplier × API parts". */
export function predict(value: PartsValue, band: Range): Range {
  return {
    lo: value.frame + band.lo * value.apiParts,
    hi: value.frame + band.hi * value.apiParts,
  };
}

/** Checks each candidate rule against every tested gun. */
export function checkRules(
  subjects: readonly Subject[],
  results: Map<string, SubjectResult>,
): RuleCheck[] {
  const guns = subjects.flatMap((s) => {
    const r = results.get(s.id);
    if (!isMeasured(r)) return [];
    if (s.kind !== "weapon" && s.kind !== "weapon-bare") return [];
    return [{ s, r, value: partsValue(s, r) }];
  });

  // 1. The whole gun counts some multiple of its API value.
  const whole = guns.flatMap(({ s, r }) =>
    s.apiBaseValue
      ? [{ lo: r.range.lo / s.apiBaseValue, hi: r.range.hi / s.apiBaseValue }]
      : [],
  );
  const wholeFit = intersect(whole);

  // 2. Each attached part adds a flat amount on top of its API value.
  const perPart = guns.flatMap(({ s, r, value }) => {
    const n = partCount(s);
    if (!value || value.apiParts <= 0 || !n) return [];
    const extra = value.frame + value.apiParts;
    return [{ lo: (r.range.lo - extra) / n, hi: (r.range.hi - extra) / n }];
  });
  const perPartFit = intersect(perPart);

  // 3. Every attached part counts the same multiple of its API value.
  const multipliers = guns.flatMap(({ value }) =>
    value?.multiplier ? [value.multiplier] : [],
  );
  const shared = intersect(multipliers);

  // 4. Parts count differently by type. Only single-part builds can show it.
  const singles = guns.flatMap(({ s, value }) => {
    const part = mainPart(s);
    return part && value?.multiplier ? [{ part, m: value.multiplier }] : [];
  });
  const kinds = new Set(singles.map((x) => x.part.itemId ?? x.part.name));
  const singleFit = intersect(singles.map((x) => x.m));

  const verdict = (
    fit: Range | "conflict" | null,
    used: number,
  ): RuleVerdict =>
    fit === "conflict" ? "ruled-out" : fit && used >= 2 ? "fits" : "cant-tell";

  return [
    {
      id: "parts-multiplier",
      label: "One multiplier for every attached part",
      verdict: verdict(shared, multipliers.length),
      range: shared && shared !== "conflict" ? shared : undefined,
      used: multipliers.length,
      detail:
        shared === "conflict"
          ? "No single multiplier fits every tested gun."
          : shared && multipliers.length >= 2
            ? `Parts count ${times(shared)} their API value on all ${multipliers.length} tested guns.`
            : "Needs at least two tested guns with parts.",
    },
    {
      id: "by-part-type",
      label: "A different multiplier for each kind of part",
      verdict:
        singleFit === "conflict" && kinds.size >= 2 ? "fits" : "cant-tell",
      used: singles.length,
      detail:
        singleFit === "conflict" && kinds.size >= 2
          ? "Single-part builds disagree, so parts count differently by type."
          : singles.length && shared !== "conflict"
            ? "Single-part builds agree with one multiplier so far."
            : "Needs builds with one main part (plus the mounts it needs).",
    },
    {
      id: "whole-gun",
      label: "The whole gun counts a multiple of its API value",
      verdict: verdict(wholeFit, whole.length),
      range: wholeFit && wholeFit !== "conflict" ? wholeFit : undefined,
      used: whole.length,
      detail:
        wholeFit === "conflict"
          ? "Bare frames match the API but guns with parts don't, so one multiple can't fit both."
          : wholeFit && whole.length >= 2
            ? `Guns count ${times(wholeFit)} their API value.`
            : "Needs at least two tested guns.",
    },
    {
      id: "per-part",
      label: "Each attached part adds a flat amount",
      verdict: verdict(perPartFit, perPart.length),
      range: perPartFit && perPartFit !== "conflict" ? perPartFit : undefined,
      used: perPart.length,
      detail:
        perPartFit === "conflict"
          ? "No flat amount per part fits every tested gun."
          : perPartFit && perPart.length >= 2
            ? `Each part adds ${roubles(perPartFit.lo)} to ${roubles(perPartFit.hi)} ₽ of base value.`
            : "Needs at least two tested guns with parts.",
    },
  ];
}

export interface RuleState {
  fit: MultiplierFit | null;
  /** ± share of the multiplier's middle. */
  precision: number;
  /** Multiplier pinned to RULE_GOAL and enough guns agree. */
  ready: boolean;
}

export function ruleState(
  rows: readonly { subject: Subject; value: PartsValue | null }[],
): RuleState {
  const fit = fitMultiplier(rows);
  const p = fit ? precision(fit.band) : Infinity;
  return {
    fit,
    precision: p,
    ready:
      !!fit &&
      fit.fit.length === fit.tested.length &&
      fit.fit.length >= RULE_MIN_GUNS &&
      p <= RULE_GOAL,
  };
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

/** A rule-aware test, with what it means for the multiplier. */
export interface RuleTest {
  /** The multiplier range before this test. */
  band: Range;
  frame: number;
  apiParts: number;
}

export type PickedTest = NextTest & { rule?: RuleTest };

/** Multiplier range a gun's value range implies. */
export const toMultiplier = (rule: RuleTest, value: Range): Range => ({
  lo: (value.lo - rule.frame) / rule.apiParts,
  hi: (value.hi - rule.frame) / rule.apiParts,
});

const ITEM_PENALTY = 2_000;
// Roubles a split that leaves the whole band is worth avoiding.
const SPLIT_WEIGHT = 400_000;

/**
 * The next test, aimed at the parts multiplier when every tested gun agrees
 * on one: each gun is planned at the value the middle of that range predicts,
 * so any gun's result narrows the multiplier for all of them. Falls back to
 * narrowing guns one at a time when the guns disagree or it is pinned down.
 */
export function pickTest({
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
}): PickedTest | null {
  return (
    pickRuleTest({ subjects, results, fillers, skip, copyCost, settings }) ??
    pickNextTest({ subjects, results, fillers, skip, copyCost, settings })
  );
}

function pickRuleTest({
  subjects,
  results,
  fillers,
  skip,
  copyCost,
  settings,
}: {
  subjects: readonly Subject[];
  results: Map<string, SubjectResult>;
  fillers: readonly FillerOption[];
  skip: ReadonlySet<string>;
  copyCost: (subject: Subject) => number;
  settings: LabSettings;
}): PickedTest | null {
  const rows = subjects.map((subject) => {
    const result = results.get(subject.id);
    return { subject, result, value: partsValue(subject, result) };
  });
  const state = ruleState(rows);
  const band = state.fit?.band;
  if (
    !state.fit ||
    !band ||
    state.fit.fit.length < state.fit.tested.length ||
    band.hi === Infinity ||
    state.precision <= RULE_GOAL
  )
    return null;

  let best: { pick: PickedTest; score: number } | null = null;
  for (const { subject, result, value } of rows) {
    if (skip.has(subject.id) || !value || value.apiParts <= 0) continue;
    if (result?.status === "conflict") continue;
    const rule = { band, frame: value.frame, apiParts: value.apiParts };
    let range = predict(value, band);
    if (isMeasured(result))
      range = {
        lo: Math.max(range.lo, result.range.lo),
        hi: Math.min(range.hi, result.range.hi),
      };
    if (range.hi - range.lo < 1) continue;
    const cost = copyCost(subject);
    const plan = planAt(
      { subject, result, fillers, settings, copyCost: cost },
      range,
      (range.lo + range.hi) / 2,
      // A tight aim: the cheapest fillers within it win, so keep it near half.
      Math.max(50, (range.hi - range.lo) / 8),
    );
    if (!plan) continue;
    // Share of the band left in the worse case: 0.5 is a perfect half.
    const k = toMultiplier(rule, { lo: plan.splitAt, hi: plan.splitAt }).lo;
    const worst = Math.max(k - band.lo, band.hi - k) / (band.hi - band.lo);
    if (worst >= 0.9) continue;
    const items = plan.qty + plan.fillers.reduce((n, f) => n + f.qty, 0);
    // An untested gun also checks the rule on a gun it wasn't fitted to.
    const fresh = !isMeasured(result) ? -SPLIT_WEIGHT / 8 : 0;
    const score =
      plan.fillerCost +
      (plan.qty - 1) * cost +
      items * ITEM_PENALTY +
      worst * SPLIT_WEIGHT +
      fresh;
    if (!best || score < best.score)
      best = { pick: { subject, result, plan, rule }, score };
  }
  return best?.pick ?? null;
}
