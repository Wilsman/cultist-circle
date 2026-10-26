// Base Value Lab, part two: works out *why* the API base values are wrong.
//
// Each candidate rule ("mods count double", "flat bonus per mod", ...) has
// one unknown number. Every measured item says which values of that number
// are possible; a rule survives while one number fits every item. The guide
// in tools/base-value-lab uses this to say which rules are still alive and
// which test would tell the survivors apart.

import {
  TIMER_RANGES,
  fillerTotal,
  timerForTotal,
  type LabTest,
  type Range,
  type Timer,
} from "./base-value-lab";

/** What the API says an item is made of. Non-weapons are all "gun". */
export interface Composition {
  /** API value of the gun body (or the whole item for non-weapons). */
  gun: number;
  /** API value of every attached mod together. */
  mods: number;
  /** Number of attached mods. */
  modCount: number;
  /**
   * API value of the parts (gun body included) the community sheet tags
   * Rare or Superrare. Missing when rarity data isn't loaded.
   */
  rare?: number;
}

export interface Observation {
  id: string;
  name: string;
  /** Measured range of the true value. */
  range: Range;
  comp: Composition;
}

export type RuleId = "api" | "whole" | "mods" | "gun" | "flat" | "rare";

export interface RuleInfo {
  id: RuleId;
  title: string;
  /** One-sentence plain explanation of the idea. */
  idea: string;
  /** How the unknown number is shown. */
  param?: { label: string; unit: "x" | "rub" };
  /** Only meaningful for weapons. */
  weaponOnly: boolean;
}

export const RULES: readonly RuleInfo[] = [
  {
    id: "api",
    title: "The API is right",
    idea: "Every item is worth exactly what tarkov.dev says.",
    weaponOnly: false,
  },
  {
    id: "whole",
    title: "Everything × one multiplier",
    idea: "The whole item is worth the API value times one hidden number.",
    param: { label: "multiplier", unit: "x" },
    weaponOnly: false,
  },
  {
    id: "mods",
    title: "Attached mods × multiplier",
    idea: "The gun body is worth its API value, but mods count extra once they're attached.",
    param: { label: "mod multiplier", unit: "x" },
    weaponOnly: true,
  },
  {
    id: "gun",
    title: "Gun body × multiplier",
    idea: "Mods are worth their API value, but the gun body itself is worth more.",
    param: { label: "body multiplier", unit: "x" },
    weaponOnly: true,
  },
  {
    id: "flat",
    title: "Flat bonus per attached mod",
    idea: "Each attached mod adds the same fixed amount on top of the API value.",
    param: { label: "bonus per mod", unit: "rub" },
    weaponOnly: true,
  },
  {
    id: "rare",
    title: "Rare parts × multiplier",
    idea: "Parts the community sheet tags Rare or Superrare count extra; everything else is worth its API value.",
    param: { label: "rare multiplier", unit: "x" },
    weaponOnly: false,
  },
];

const OPEN: Range = { lo: 0, hi: Infinity };
const api = (c: Composition) => c.gun + c.mods;

/** Value the rule predicts for one item at parameter p. */
export function ruleValue(id: RuleId, c: Composition, p: number): number {
  // A zero coefficient drops the term even when p is infinite.
  const mul = (coef: number) => (coef === 0 ? 0 : p * coef);
  switch (id) {
    case "api":
      return api(c);
    case "whole":
      return mul(api(c));
    case "mods":
      return c.gun + mul(c.mods);
    case "gun":
      return mul(c.gun) + c.mods;
    case "flat":
      return api(c) + mul(c.modCount);
    case "rare":
      return api(c) - (c.rare ?? 0) + mul(c.rare ?? 0);
  }
}

/**
 * Parameter values that agree with one measurement, or "any" when this item
 * doesn't depend on the parameter (a bare gun for the mod rules).
 */
function paramRange(id: RuleId, o: Observation): Range | "any" {
  const { lo, hi } = o.range;
  const c = o.comp;
  const between = (base: number, per: number, min: number): Range | "any" =>
    per > 0
      ? { lo: Math.max(min, (lo - base) / per), hi: (hi - base) / per }
      : "any";
  switch (id) {
    case "api":
      return "any";
    case "whole":
      return between(0, api(c), 0);
    case "mods":
      return between(c.gun, c.mods, 0);
    case "gun":
      return between(c.mods, c.gun, 0);
    case "flat":
      return between(api(c), c.modCount, -Infinity);
    case "rare":
      return between(api(c) - (c.rare ?? 0), c.rare ?? 0, 0);
  }
}

/** Roubles of rounding allowed when checking a value against a range. */
const SLACK = 0.5;
const contains = (r: Range, v: number) =>
  v >= r.lo - SLACK && v <= r.hi + SLACK;
/** Parameters are compared with a tiny relative margin instead. */
const holds = (r: Range, p: number) => {
  const eps = 1e-9 * Math.max(1, Math.abs(p));
  return p >= r.lo - eps && p <= r.hi + eps;
};

export interface Offender {
  id: string;
  name: string;
  measured: Range;
  /** What the rule says at its best-fitting parameter. */
  predicted: number;
}

export interface RuleFit extends RuleInfo {
  /** Items the rule was checked against. */
  checked: number;
  /** Items that actually pin the parameter down (e.g. guns with mods). */
  informative: number;
  /** Parameter range that fits every item except the offenders. */
  fitted?: Range;
  /** Items that disagree with the best-fitting parameter. */
  offenders: Offender[];
  verdict: "fits" | "ruled-out" | "untested";
}

/** Checks every rule against the measurements and reports what survives. */
export function fitRules(
  observations: readonly Observation[],
  { weapons }: { weapons: boolean },
): RuleFit[] {
  // The rarity rule needs rarity data; without it it's just "the API is right".
  const hasRarity = observations.some((o) => o.comp.rare !== undefined);
  return RULES.filter(
    (r) => (weapons || !r.weaponOnly) && (r.id !== "rare" || hasRarity),
  ).map((rule) => fitRule(rule, observations));
}

function fitRule(rule: RuleInfo, obs: readonly Observation[]): RuleFit {
  const ranges = obs.map((o) => ({ o, r: paramRange(rule.id, o) }));
  const pinned = ranges.filter(
    (x): x is { o: Observation; r: Range } => x.r !== "any" && x.r.lo <= x.r.hi,
  );

  // The parameter value inside the most items' ranges.
  let best: number | undefined;
  if (rule.param) {
    let bestCount = -1;
    const points = pinned.flatMap((x) => [x.r.lo, x.r.hi]).filter(isFinite);
    for (const p of points) {
      const n = pinned.filter((x) => holds(x.r, p)).length;
      if (n > bestCount) {
        bestCount = n;
        best = p;
      }
    }
  }

  const offenders: Offender[] = [];
  let fitted: Range | undefined = rule.param ? { ...OPEN } : undefined;
  if (rule.id === "flat" && fitted) fitted.lo = -Infinity;
  for (const { o, r } of ranges) {
    const p = best ?? (rule.id === "flat" ? 0 : 1);
    const ok =
      r === "any"
        ? contains(o.range, ruleValue(rule.id, o.comp, p))
        : r.lo <= r.hi && (best === undefined || holds(r, best));
    if (!ok) {
      offenders.push({
        id: o.id,
        name: o.name,
        measured: o.range,
        predicted: ruleValue(rule.id, o.comp, p),
      });
    } else if (fitted && r !== "any") {
      fitted = { lo: Math.max(fitted.lo, r.lo), hi: Math.min(fitted.hi, r.hi) };
    }
  }

  return {
    ...rule,
    checked: obs.length,
    informative: rule.param ? pinned.length : obs.length,
    fitted,
    offenders,
    verdict: !obs.length ? "untested" : offenders.length ? "ruled-out" : "fits",
  };
}

/** Value range a surviving rule predicts for an item. */
export function predictRange(fit: RuleFit, c: Composition): Range {
  if (!fit.fitted) {
    const v = ruleValue(fit.id, c, 1);
    return { lo: v, hi: v };
  }
  const a = ruleValue(fit.id, c, fit.fitted.lo);
  const b = ruleValue(fit.id, c, fit.fitted.hi);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return {
    lo: Number.isFinite(lo) ? Math.max(0, lo) : 0,
    hi: Number.isNaN(hi) ? Infinity : hi,
  };
}

/** A single best guess for a surviving rule (used to compare rules). */
function predictPoint(fit: RuleFit, c: Composition): number | null {
  const r = predictRange(fit, c);
  if (r.hi === Infinity) return null;
  return (r.lo + r.hi) / 2;
}

export interface Candidate {
  id: string;
  name: string;
  comp: Composition;
  /** What is measured so far (open when untested). */
  range: Range;
}

export interface Suggestion {
  candidate: Candidate;
  /** Each surviving rule's guess for this item. */
  guesses: { rule: RuleFit; value: number }[];
  /** Biggest gap between two rules' guesses. */
  spread: number;
}

/**
 * The item whose value the surviving rules disagree about most, among those
 * not yet measured well enough to settle it. One timer then kills a rule.
 */
export function suggestExperiment(
  fits: readonly RuleFit[],
  candidates: readonly Candidate[],
  minSpread = 5_000,
): Suggestion | null {
  const alive = fits.filter((f) => f.verdict !== "ruled-out");
  if (alive.length < 2) return null;
  let best: Suggestion | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const guesses = alive.flatMap((rule) => {
      const value = predictPoint(rule, candidate.comp);
      return value === null ? [] : [{ rule, value }];
    });
    if (guesses.length < 2) continue;
    const values = guesses.map((g) => g.value);
    const spread = Math.max(...values) - Math.min(...values);
    if (spread < minSpread) continue;
    // Already measured tighter than the disagreement: nothing new to learn.
    const width = candidate.range.hi - candidate.range.lo;
    if (width < minSpread) continue;
    const score = Math.min(spread, width);
    if (score > bestScore) {
      bestScore = score;
      best = { candidate, guesses, spread };
    }
  }
  return best;
}

export interface Doubtful {
  id: string;
  name: string;
  /** How many rules this one result breaks. */
  breaks: number;
  tests: number;
}

/**
 * Results resting on a single test that break most rules. One misread timer
 * can kill every rule, so these are worth re-running before believing them.
 */
export function doubtfulResults(
  fits: readonly RuleFit[],
  testCount: (id: string) => number,
): Doubtful[] {
  const breaks = new Map<string, { name: string; n: number }>();
  for (const fit of fits) {
    if (fit.id === "api") continue;
    for (const o of fit.offenders) {
      const b = breaks.get(o.id) ?? { name: o.name, n: 0 };
      b.n++;
      breaks.set(o.id, b);
    }
  }
  const rules = fits.filter((f) => f.id !== "api").length;
  return [...breaks]
    .map(([id, b]) => ({ id, name: b.name, breaks: b.n, tests: testCount(id) }))
    .filter((d) => d.tests <= 1 && d.breaks >= Math.max(2, rules - 1))
    .sort((a, b) => b.breaks - a.breaks || a.tests - b.tests);
}

// ---------- side-by-side comparisons ----------

export type PairFinding =
  "mods-extra" | "gun-extra" | "both-extra" | "matches-api" | "unclear";

export interface PairComparison {
  /** Measured gun body ÷ its API value. */
  gunRatio: Range;
  /** What the attached mods add: full minus bare. */
  modsValue: Range;
  /** That added value ÷ the mods' loose API value. */
  modsRatio: Range;
  finding: PairFinding;
}

const ratio = (r: Range, base: number): Range =>
  base > 0 ? { lo: r.lo / base, hi: r.hi / base } : { ...OPEN };

/** How far above the API a ratio must be before we call it "extra". */
const EXTRA = 1.1;

/**
 * Compares a bare gun with the same gun carrying mods (a preset or a custom
 * build). Says whether the hidden extra sits in the body or in the mods.
 */
export function comparePair(
  bare: Range,
  full: Range,
  comp: Composition,
): PairComparison {
  const modsValue: Range = {
    lo: Math.max(0, full.lo - bare.hi),
    hi: full.hi - bare.lo,
  };
  const gunRatio = ratio(bare, comp.gun);
  const modsRatio = ratio(modsValue, comp.mods);
  const gunExtra = gunRatio.lo > EXTRA;
  const modsExtra = modsRatio.lo > EXTRA;
  const gunNormal = gunRatio.lo <= 1 && gunRatio.hi >= 1;
  const modsNormal = modsRatio.lo <= 1 && modsRatio.hi >= 1;
  const tight = (r: Range) => r.hi - r.lo <= 0.6;

  let finding: PairFinding = "unclear";
  if (gunExtra && modsExtra) finding = "both-extra";
  else if (modsExtra && gunNormal) finding = "mods-extra";
  else if (gunExtra && modsNormal) finding = "gun-extra";
  else if (gunNormal && modsNormal && tight(gunRatio) && tight(modsRatio))
    finding = "matches-api";
  return { gunRatio, modsValue, modsRatio, finding };
}

/** Whether two measurements of "the same" item can be told apart. */
export function compareRanges(
  a: Range,
  b: Range,
  tolerance: number,
): "different" | "same" | "unclear" {
  if (a.hi < b.lo || b.hi < a.lo) return "different";
  const width = Math.max(a.hi - a.lo, b.hi - b.lo);
  return width <= tolerance * 2 ? "same" : "unclear";
}

export interface ControlCheck {
  testId: string;
  total: number;
  expected: Timer;
  got: Timer;
  ok: boolean;
}

/**
 * Tests with only known items. If these don't land where expected, the timer
 * edges (or the "known" values) are wrong and every other result is suspect.
 */
export function checkControls(tests: readonly LabTest[]): ControlCheck[] {
  return tests.flatMap((t) => {
    if (t.entries.length || !t.timer || t.excluded) return [];
    const total = fillerTotal(t.fillers);
    const [lo, hi] = TIMER_RANGES[t.timer];
    return [
      {
        testId: t.id,
        total,
        expected: timerForTotal(total),
        got: t.timer,
        ok: total >= lo && total <= hi,
      },
    ];
  });
}
