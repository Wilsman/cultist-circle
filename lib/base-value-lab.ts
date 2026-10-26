import { type GameMode, isGameMode } from "./game-mode";

// Base Value Lab: works out the true base value of items the API gets wrong
// (weapons, armour, keys) from cultist circle timers.
//
// Each finished test says: sum(qty * value) + known fillers lands in the
// timer's range. The solver narrows every unknown by bounds propagation, and
// the planner picks the next sacrifice so a timer boundary splits what is
// still uncertain. Pure logic only: used by tools/base-value-lab and tests.

export type LabMode = "pvp" | "pve";

export const TIMERS = [
  "2h",
  "3h",
  "4h",
  "5h",
  "8h",
  "12h",
  "14h",
  "6h",
] as const;
export type Timer = (typeof TIMERS)[number];

/** Total base value range each timer proves (0% sacrifice bonus). */
export const TIMER_RANGES: Record<Timer, readonly [number, number]> = {
  "2h": [0, 10_000],
  "3h": [10_001, 25_000],
  "4h": [25_001, 50_000],
  "5h": [50_001, 100_000],
  "8h": [100_001, 200_000],
  "12h": [200_001, 350_000],
  // At 400k+ the circle rolls 6h only 25% of the time, so 14h proves >350k.
  "14h": [350_001, Infinity],
  "6h": [400_000, Infinity],
};

/** Upper edge of each bucket the planner can aim at. */
export const BOUNDARIES = [10_000, 25_000, 50_000, 100_000, 200_000, 350_000];
const MAX_TESTABLE = BOUNDARIES[BOUNDARIES.length - 1];

export type SubjectKind = "weapon" | "weapon-bare" | "armour" | "key" | "other";

export interface Subject {
  id: string;
  mode: LabMode;
  itemId?: string;
  name: string;
  kind: SubjectKind;
  /** Durability percent (weapons and armour). */
  durability?: number;
  /** Uses left (keys). */
  uses?: number;
  /** Base value the API reports, for comparison only. */
  apiBaseValue?: number;
  /** How many copies the tester can put in one test. */
  owned?: number;
  notes?: string;
  /** A bare gun with chosen mods attached (itemId is the gun). */
  build?: Build;
  /**
   * Guns only: the default preset's parts, without the gun itself. A
   * stripped gun is missing all of them; a Default preset has all of them.
   */
  parts?: { name: string; count: number }[];
  /** Guns with parts on: API value of the bare gun frame on its own. */
  frameValue?: number;
}

export interface Build {
  /** API value of the bare gun. */
  gunValue: number;
  mods: { itemId?: string; name: string; baseValue: number; count: number }[];
}

export interface TestEntry {
  subjectId: string;
  qty: number;
}

export interface Filler {
  itemId?: string;
  name: string;
  /** Known base value of one item. */
  baseValue: number;
  qty: number;
}

export interface LabTest {
  id: string;
  mode: LabMode;
  createdAt: string;
  entries: TestEntry[];
  fillers: Filler[];
  /** Null until the ritual has been run. */
  timer: Timer | null;
  /** Kept for reference but left out of the maths. */
  excluded?: boolean;
  notes?: string;
  /**
   * Hideout Management skill level (0-51) when the ritual was run. Its bonus
   * may shift the result, so tests with a high skill are flagged.
   */
  hideoutSkill?: number;
  /**
   * Game mode the tester played in, when they said. Recorded for later;
   * results are pooled across modes.
   */
  playedMode?: GameMode;
}

export interface StashItem {
  itemId?: string;
  name: string;
  baseValue: number;
  count: number;
}

export interface LabSettings {
  /** Confident once the twice-confirmed range is at most this wide. */
  tolerance: number;
  /** Most items you are willing to place in one test. */
  maxItems: number;
}

export interface LabState {
  version: 1;
  subjects: Subject[];
  tests: LabTest[];
  stash: Record<LabMode, StashItem[]>;
  settings: LabSettings;
}

export const DEFAULT_SETTINGS: LabSettings = { tolerance: 5_000, maxItems: 10 };

export function emptyState(): LabState {
  return {
    version: 1,
    subjects: [],
    tests: [],
    stash: { pvp: [], pve: [] },
    settings: { ...DEFAULT_SETTINGS },
  };
}

export interface Range {
  lo: number;
  hi: number;
}

const OPEN: Range = { lo: 0, hi: Infinity };

export function fillerTotal(fillers: readonly Filler[]): number {
  return fillers.reduce((sum, f) => sum + f.baseValue * f.qty, 0);
}

/** The timer a known total should give (14h at 400k+ may also roll 6h). */
export function timerForTotal(total: number): Timer {
  for (const timer of TIMERS) {
    const [lo, hi] = TIMER_RANGES[timer];
    if (timer !== "6h" && total >= lo && total <= hi) return timer;
  }
  return total > TIMER_RANGES["12h"][1] ? "14h" : "2h";
}

interface Constraint {
  testId: string;
  terms: { id: string; q: number }[];
  lo: number;
  hi: number;
}

function toConstraint(test: LabTest): Constraint | null {
  if (!test.timer || test.excluded) return null;
  const terms = new Map<string, number>();
  for (const e of test.entries) {
    if (e.qty > 0)
      terms.set(e.subjectId, (terms.get(e.subjectId) ?? 0) + e.qty);
  }
  if (!terms.size) return null;
  const fillers = fillerTotal(test.fillers);
  const [lo, hi] = TIMER_RANGES[test.timer];
  return {
    testId: test.id,
    terms: [...terms].map(([id, q]) => ({ id, q })),
    lo: lo - fillers,
    hi: hi - fillers,
  };
}

const EPS = 1e-6;

/**
 * Tightens every unknown's range until nothing changes. Returns null when the
 * tests contradict each other.
 */
function propagate(
  constraints: readonly Constraint[],
  ids: Iterable<string>,
): Map<string, Range> | null {
  const bounds = new Map<string, Range>();
  for (const id of ids) bounds.set(id, { ...OPEN });

  for (let pass = 0; pass < 200; pass++) {
    let changed = false;
    for (const c of constraints) {
      let sumLo = 0;
      let sumHi = 0;
      let infHi = 0;
      for (const t of c.terms) {
        const b = bounds.get(t.id)!;
        sumLo += t.q * b.lo;
        if (b.hi === Infinity) infHi++;
        else sumHi += t.q * b.hi;
      }
      if (sumLo > c.hi + EPS) return null;
      if (infHi === 0 && sumHi < c.lo - EPS) return null;

      for (const t of c.terms) {
        const b = bounds.get(t.id)!;
        const othersLo = sumLo - t.q * b.lo;
        const newHi = (c.hi - othersLo) / t.q;
        const othersInf = infHi - (b.hi === Infinity ? 1 : 0);
        const othersHi = sumHi - (b.hi === Infinity ? 0 : t.q * b.hi);
        const newLo = othersInf ? -Infinity : (c.lo - othersHi) / t.q;
        if (newHi < b.hi - 0.5) {
          b.hi = newHi;
          changed = true;
        }
        if (newLo > b.lo + 0.5) {
          b.lo = newLo;
          changed = true;
        }
        if (b.lo > b.hi + EPS) return null;
      }
    }
    if (!changed) break;
  }
  return bounds;
}

export type SubjectStatus =
  | "untested"
  | "open"
  | "needs-confirmation"
  | "confident"
  | "too-high"
  | "conflict";

export interface SubjectResult {
  subjectId: string;
  /** Range from every included test. */
  range: Range;
  /** Range that survives dropping any one test (each bound seen twice). */
  confirmed: Range;
  status: SubjectStatus;
  testCount: number;
  /** In a conflict: tests whose removal makes the rest agree. */
  suspects: string[];
}

/** Solves one game mode. Unrelated groups of items are solved separately. */
export function solve(
  subjects: readonly Subject[],
  tests: readonly LabTest[],
  settings: LabSettings = DEFAULT_SETTINGS,
): Map<string, SubjectResult> {
  const constraints = tests
    .map(toConstraint)
    .filter((c): c is Constraint => !!c);
  const known = new Set(subjects.map((s) => s.id));
  const usable = constraints.filter((c) =>
    c.terms.every((t) => known.has(t.id)),
  );

  // Group subjects that share tests so a conflict stays local.
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  for (const s of subjects) parent.set(s.id, s.id);
  for (const c of usable) {
    const [first, ...rest] = c.terms;
    for (const t of rest) parent.set(find(t.id), find(first.id));
  }
  const groups = new Map<string, { ids: string[]; cons: Constraint[] }>();
  for (const s of subjects) {
    const root = find(s.id);
    if (!groups.has(root)) groups.set(root, { ids: [], cons: [] });
    groups.get(root)!.ids.push(s.id);
  }
  for (const c of usable) groups.get(find(c.terms[0].id))!.cons.push(c);

  const results = new Map<string, SubjectResult>();
  for (const { ids, cons } of groups.values()) {
    const counts = new Map<string, number>(ids.map((id) => [id, 0]));
    for (const c of cons)
      for (const t of c.terms) counts.set(t.id, counts.get(t.id)! + 1);

    let bounds = propagate(cons, ids);
    let suspects: string[] = [];
    let active = cons;
    if (!bounds) {
      suspects = cons
        .filter((c) =>
          propagate(
            cons.filter((o) => o !== c),
            ids,
          ),
        )
        .map((c) => c.testId);
      active = cons.filter((c) => !suspects.includes(c.testId));
      bounds = propagate(active, ids);
    }

    // Leave-one-out: a bound only counts as confirmed if another test backs it.
    const confirmed = new Map<string, Range>(
      ids.map((id) => [id, { lo: Infinity, hi: -Infinity }]),
    );
    if (bounds) {
      for (const c of active) {
        const without = propagate(
          active.filter((o) => o !== c),
          ids,
        );
        if (!without) continue;
        for (const id of ids) {
          const r = confirmed.get(id)!;
          const w = without.get(id)!;
          r.lo = Math.min(r.lo, w.lo);
          r.hi = Math.max(r.hi, w.hi);
        }
      }
    }

    for (const id of ids) {
      const testCount = counts.get(id)!;
      const range = bounds?.get(id) ?? { ...OPEN };
      const conf = confirmed.get(id)!;
      const confirmedRange =
        active.length < 2 || conf.lo > conf.hi ? { ...OPEN } : conf;
      let status: SubjectStatus;
      if (suspects.length || !bounds) status = "conflict";
      else if (!testCount) status = "untested";
      else if (confirmedRange.hi - confirmedRange.lo <= settings.tolerance)
        status = "confident";
      else if (range.lo > MAX_TESTABLE) status = "too-high";
      else if (range.hi - range.lo <= settings.tolerance)
        status = "needs-confirmation";
      else status = "open";
      results.set(id, {
        subjectId: id,
        range: { lo: Math.max(0, range.lo), hi: range.hi },
        confirmed: {
          lo: Math.max(0, confirmedRange.lo),
          hi: confirmedRange.hi,
        },
        status,
        testCount,
        suspects: suspects.length && testCount ? suspects : [],
      });
    }
  }
  return results;
}

/** Value the attached parts add: full gun minus the bare gun. */
export function partsRange(full: Range, bare: Range): Range {
  return { lo: Math.max(0, full.lo - bare.hi), hi: full.hi - bare.lo };
}

export interface FillerOption {
  itemId?: string;
  name: string;
  baseValue: number;
  /** Roubles to get one (0 when already owned). */
  cost: number;
  /** How many can be used. */
  available: number;
  owned: boolean;
}

export interface PlanOutcome {
  timer: Timer;
  /** What the subject's value would be if this timer shows. */
  implies: Range;
}

export interface TestPlan {
  subjectId: string;
  qty: number;
  fillers: (Filler & { owned: boolean; cost: number })[];
  fillerTotal: number;
  fillerCost: number;
  /** The question the test answers: is the value above this? */
  splitAt: number;
  boundary: number;
  outcomes: PlanOutcome[];
  goal: "narrow" | "confirm-low" | "confirm-high";
}

export interface PlanInput {
  subject: Subject;
  result?: SubjectResult;
  fillers: readonly FillerOption[];
  settings?: LabSettings;
  /** Roubles per extra copy of the subject beyond the first. */
  copyCost?: number;
}

// Roubles of hassle per extra item placed, so owned junk beats long lists.
const ITEM_PENALTY = 2_000;

function chooseSplit(
  subject: Subject,
  result: SubjectResult | undefined,
  tolerance: number,
): { x: number; slack: number; goal: TestPlan["goal"] } | null {
  const range = result?.range ?? OPEN;
  const confirmed = result?.confirmed ?? OPEN;
  if (range.lo > MAX_TESTABLE) return null;

  const width = range.hi - range.lo;
  if (width > tolerance) {
    let x: number;
    if (range.hi === Infinity) {
      const api = subject.apiBaseValue ?? 0;
      x = range.lo > 0 ? range.lo * 2 : Math.max(api, 10_000);
      if (api > range.lo && api < x) x = api;
    } else {
      x = (range.lo + range.hi) / 2;
    }
    x = Math.min(x, MAX_TESTABLE);
    // Open-ended ranges get a tighter aim so the first answer is useful.
    const spread = range.hi === Infinity ? x / 8 : width / 4;
    return { x, slack: Math.max(500, spread), goal: "narrow" };
  }

  // Range is tight but backed by one test: re-check each edge just outside.
  const margin = Math.max(0, (tolerance - width) / 2);
  // A range exactly tolerance-wide leaves no margin; fillers still need room.
  const slack = Math.max(250, margin * 0.3);
  if (range.lo - margin > 0 && confirmed.lo < range.lo - margin) {
    return {
      x: Math.max(0, range.lo - margin * 0.6),
      slack,
      goal: "confirm-low",
    };
  }
  if (range.hi + margin * 0.6 > MAX_TESTABLE) return null;
  return {
    x: range.hi + margin * 0.6,
    slack,
    goal: "confirm-high",
  };
}

interface PathNode {
  opt: number;
  prev: PathNode | null;
  sum: number;
  cost: number;
  count: number;
}

export interface FillerPick {
  picks: { option: FillerOption; qty: number }[];
  total: number;
  cost: number;
}

const nodeScore = (n: PathNode) => n.cost + n.count * ITEM_PENALTY;

/**
 * Every cheapest filler set up to `max` base value with at most `maxCount`
 * items, bucketed by value. Built once per plan, then queried per target.
 */
function fillerTable(
  options: readonly FillerOption[],
  max: number,
  resolution: number,
  maxCount: number,
) {
  const unit = Math.max(25, resolution, max / 4000);
  const cells = Math.ceil(max / unit) + 1;
  const best: (PathNode | null)[][] = Array.from({ length: maxCount + 1 }, () =>
    new Array<PathNode | null>(cells).fill(null),
  );
  best[0][0] = { opt: -1, prev: null, sum: 0, cost: 0, count: 0 };

  options.forEach((o, i) => {
    if (!(o.baseValue > 0) || o.baseValue > max || !(o.available > 0)) return;
    const copies = Math.min(
      o.available,
      maxCount,
      Math.floor(max / o.baseValue),
    );
    // Each copy is its own 0/1 item; counts run downward so a pass adds one.
    for (let k = 0; k < copies; k++) {
      for (let c = maxCount - 1; c >= 0; c--) {
        const row = best[c];
        const next = best[c + 1];
        for (let cell = 0; cell < cells; cell++) {
          const node = row[cell];
          if (!node) continue;
          const sum = node.sum + o.baseValue;
          if (sum > max) continue;
          const at = Math.round(sum / unit);
          const cand: PathNode = {
            opt: i,
            prev: node,
            sum,
            cost: node.cost + o.cost,
            count: c + 1,
          };
          const cur = next[at];
          if (!cur || nodeScore(cand) < nodeScore(cur)) next[at] = cand;
        }
      }
    }
  });

  return (target: number, slack: number, count: number): FillerPick | null => {
    if (target <= slack) return { picks: [], total: 0, cost: 0 };
    let winner: PathNode | null = null;
    const from = Math.max(0, Math.floor((target - slack) / unit) - 1);
    const to = Math.min(cells - 1, Math.ceil((target + slack) / unit) + 1);
    for (let c = 1; c <= Math.min(count, maxCount); c++) {
      for (let cell = from; cell <= to; cell++) {
        const node = best[c][cell];
        if (!node || Math.abs(node.sum - target) > slack) continue;
        if (
          !winner ||
          nodeScore(node) < nodeScore(winner) ||
          (nodeScore(node) === nodeScore(winner) &&
            Math.abs(node.sum - target) < Math.abs(winner.sum - target))
        )
          winner = node;
      }
    }
    if (!winner) return null;
    const counts = new Map<number, number>();
    for (let n: PathNode | null = winner; n && n.opt >= 0; n = n.prev)
      counts.set(n.opt, (counts.get(n.opt) ?? 0) + 1);
    return {
      picks: [...counts].map(([i, qty]) => ({ option: options[i], qty })),
      total: winner.sum,
      cost: winner.cost,
    };
  };
}

/**
 * Cheapest filler set within `[target - slack, target + slack]` using at most
 * `maxCount` items. Owned items cost nothing, so they win when they fit.
 */
export function pickFillers(
  options: readonly FillerOption[],
  target: number,
  slack: number,
  maxCount: number,
): FillerPick | null {
  if (target <= slack) return { picks: [], total: 0, cost: 0 };
  if (maxCount <= 0) return null;
  return fillerTable(
    options,
    target + slack,
    slack / 4,
    maxCount,
  )(target, slack, maxCount);
}

/** Timers a planned test could show, and what each would prove. */
export function planOutcomes(
  range: Range,
  qty: number,
  fillers: number,
): PlanOutcome[] {
  const totalLo = qty * range.lo + fillers;
  const totalHi = qty * range.hi + fillers;
  const out: PlanOutcome[] = [];
  for (const timer of TIMERS) {
    const [lo, hi] = TIMER_RANGES[timer];
    if (hi < totalLo || lo > totalHi) continue;
    out.push({
      timer,
      implies: {
        lo: Math.max(range.lo, (lo - fillers) / qty),
        hi: Math.min(range.hi, (hi - fillers) / qty),
      },
    });
  }
  return out;
}

/** Suggests the next test for one subject, or null if it can't be narrowed. */
export function planTest(input: PlanInput): TestPlan | null {
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const { subject, result } = input;
  if (result?.status === "confident" || result?.status === "conflict")
    return null;
  const split = chooseSplit(subject, result, settings.tolerance);
  if (!split) return null;

  const range = result?.range ?? OPEN;
  const best = searchPlans(input, split, range, input.fillers, split.slack);
  if (best && best.fillerCost === 0) return best;
  if (split.goal !== "narrow") return best;
  // Nothing owned hits the ideal point. A looser aim with only owned items
  // still halves the range well enough and saves buying anything.
  const owned = input.fillers.filter((o) => o.owned);
  if (!owned.length) return best;
  const lo = range.lo;
  const hi = range.hi === Infinity ? split.x * 3 : range.hi;
  const edge = (hi - lo) * 0.15;
  const fromStash = searchPlans(
    input,
    split,
    range,
    owned,
    split.slack * 4,
    (at) => at > lo + edge && at < hi - edge,
  );
  return fromStash ?? best;
}

function searchPlans(
  input: PlanInput,
  split: { x: number; slack: number; goal: TestPlan["goal"] },
  range: Range,
  options: readonly FillerOption[],
  slack: number,
  accept: (splitAt: number) => boolean = () => true,
): TestPlan | null {
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const { subject } = input;
  const maxQty = Math.max(1, Math.min(subject.owned ?? 1, settings.maxItems));
  let best: TestPlan | null = null;
  let bestScore = Infinity;

  const combos: { qty: number; boundary: number; need: number }[] = [];
  for (let qty = 1; qty <= maxQty; qty++) {
    for (const boundary of BOUNDARIES) {
      const need = boundary - qty * split.x;
      if (need >= -qty * slack)
        combos.push({ qty, boundary, need: Math.max(0, need) });
    }
  }
  if (!combos.length) return null;
  const maxFill = Math.max(...combos.map((c) => c.need + c.qty * slack));
  const query = fillerTable(
    options,
    maxFill,
    slack / 4,
    Math.max(0, settings.maxItems - 1),
  );

  for (const { qty, boundary, need } of combos) {
    const fill = query(need, qty * slack, settings.maxItems - qty);
    if (!fill) continue;
    const splitAt = (boundary - fill.total) / qty;
    if (!accept(splitAt)) continue;
    const itemCount = fill.picks.reduce((n, p) => n + p.qty, 0);
    // Extra copies are cheap to reuse, but fewer items is easier to run.
    // Cost, hassle, and how far the split lands from the ideal point.
    const miss = Math.abs(splitAt - split.x) / split.slack;
    const score =
      fill.cost +
      (qty - 1) * (input.copyCost ?? 0) +
      (itemCount + qty) * ITEM_PENALTY +
      miss * 10 * ITEM_PENALTY +
      boundary / 1_000;
    if (score >= bestScore) continue;
    bestScore = score;
    best = {
      subjectId: subject.id,
      qty,
      fillers: fill.picks.map(({ option, qty: n }) => ({
        itemId: option.itemId,
        name: option.name,
        baseValue: option.baseValue,
        qty: n,
        owned: option.owned,
        cost: option.cost,
      })),
      fillerTotal: fill.total,
      fillerCost: fill.cost,
      splitAt,
      boundary,
      outcomes: planOutcomes(range, qty, fill.total),
      goal: split.goal,
    };
  }
  return best;
}

/** Identity used to merge subjects from different people's exports. */
export function subjectKey(s: Subject): string {
  return [
    s.mode,
    s.itemId ?? s.name.toLowerCase(),
    s.kind,
    s.durability ?? "",
    s.uses ?? "",
    s.build?.mods
      .map((m) => `${m.itemId ?? m.name}x${m.count}`)
      .sort()
      .join("+") ?? "",
  ].join("|");
}

/** Merges an imported state into the current one without duplicating items. */
export function mergeStates(base: LabState, incoming: LabState): LabState {
  const out: LabState = structuredClone(base);
  const byKey = new Map(out.subjects.map((s) => [subjectKey(s), s.id]));
  const ids = new Set(byKey.values());
  const remap = new Map<string, string>();
  for (const s of incoming.subjects) {
    const existing = byKey.get(subjectKey(s));
    if (existing) remap.set(s.id, existing);
    else {
      // A different item can arrive under a taken id: give it a fresh one so
      // its tests don't get mixed into the existing subject's results.
      let id = s.id;
      for (let n = 2; ids.has(id); n++) id = `${s.id}-${n}`;
      ids.add(id);
      out.subjects.push({ ...s, id });
      byKey.set(subjectKey(s), id);
      // First subject with a given id wins, like the test dedupe below.
      if (!remap.has(s.id)) remap.set(s.id, id);
    }
  }
  const testIds = new Set(out.tests.map((t) => t.id));
  for (const t of incoming.tests) {
    if (testIds.has(t.id)) continue;
    out.tests.push({
      ...t,
      entries: t.entries.map((e) => ({
        ...e,
        subjectId: remap.get(e.subjectId) ?? e.subjectId,
      })),
      fillers: t.fillers.map((f) => ({ ...f })),
    });
  }
  // Bring over stash items the local state doesn't have yet; the stash key is
  // the item id when present, the name otherwise (same as useUpStash).
  for (const m of ["pvp", "pve"] as const) {
    for (const item of incoming.stash[m]) {
      const held = out.stash[m].some((s) =>
        item.itemId ? s.itemId === item.itemId : s.name === item.name,
      );
      if (!held) out.stash[m].push({ ...item });
    }
  }
  // Adopt imported settings only where the local ones are still defaults.
  for (const key of ["tolerance", "maxItems"] as const) {
    if (out.settings[key] === DEFAULT_SETTINGS[key])
      out.settings[key] = incoming.settings[key];
  }
  return out;
}

/**
 * Folds PvP and PvE into one mode, once testing showed both give the same
 * values. The same item from both modes becomes one subject, so its tests
 * count together. Safe to run more than once.
 */
export function combineModes(state: LabState, into: LabMode): LabState {
  const out: LabState = structuredClone(state);
  // Subjects already in the target mode win, so their ids stay stable.
  const ordered = [
    ...out.subjects.filter((s) => s.mode === into),
    ...out.subjects.filter((s) => s.mode !== into),
  ];
  const byKey = new Map<string, Subject>();
  const remap = new Map<string, string>();
  out.subjects = [];
  for (const s of ordered) {
    const key = subjectKey({ ...s, mode: into });
    const kept = byKey.get(key);
    if (kept) {
      remap.set(s.id, kept.id);
      if (s.owned !== undefined)
        kept.owned = Math.max(kept.owned ?? 0, s.owned);
      kept.apiBaseValue ??= s.apiBaseValue;
      continue;
    }
    const merged = { ...s, mode: into };
    byKey.set(key, merged);
    out.subjects.push(merged);
  }
  out.tests = out.tests.map((t) => ({
    ...t,
    mode: into,
    entries: t.entries.map((e) => ({
      ...e,
      subjectId: remap.get(e.subjectId) ?? e.subjectId,
    })),
  }));
  const other: LabMode = into === "pvp" ? "pve" : "pvp";
  for (const item of out.stash[other]) {
    const held = out.stash[into].some((s) =>
      item.itemId ? s.itemId === item.itemId : s.name === item.name,
    );
    if (!held) out.stash[into].push(item);
  }
  out.stash[other] = [];
  return out;
}

/** An item's attachment slots, as cached from json.tarkov.dev. */
export interface SlottedItem {
  id: string;
  name: string;
  slots?: { name: string; allowed: string[] }[];
}

export interface FreeSlot {
  /** Readable slot name, e.g. "scope" or "stock". */
  name: string;
  /** The gun or part the slot is on. */
  host: string;
  allowed: Set<string>;
}

const slotLabel = (raw: string) =>
  raw.replace(/^mod_/, "").replace(/_\d+$/, "").replace(/_/g, " ");

/**
 * Slots still empty on a gun with these parts attached, in the order they were
 * added. Each part takes the first free slot that accepts it, and its own slots
 * open up. Null when the gun has no slot data (an old item cache).
 */
export function freeSlots(
  gun: SlottedItem,
  mods: readonly SlottedItem[],
): FreeSlot[] | null {
  if (!gun.slots) return null;
  const open: FreeSlot[] = [];
  const addSlots = (host: SlottedItem) => {
    for (const s of host.slots ?? [])
      open.push({
        name: slotLabel(s.name),
        host: host.name,
        allowed: new Set(s.allowed),
      });
  };
  addSlots(gun);
  for (const mod of mods) {
    const i = open.findIndex((s) => s.allowed.has(mod.id));
    if (i >= 0) open.splice(i, 1);
    addSlots(mod);
  }
  return open;
}

const KINDS: SubjectKind[] = [
  "weapon",
  "weapon-bare",
  "armour",
  "key",
  "other",
];
const isMode = (v: unknown): v is LabMode => v === "pvp" || v === "pve";
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
/** Hideout Management runs 0-51; anything else is dropped. */
export const MAX_HIDEOUT_SKILL = 51;
const skillLevel = (v: unknown) => {
  const n = num(v);
  return n !== undefined && n >= 0 && n <= MAX_HIDEOUT_SKILL
    ? Math.round(n)
    : undefined;
};

function parseBuild(v: unknown): Build | undefined {
  if (!v || typeof v !== "object") return undefined;
  const b = v as Record<string, unknown>;
  const gunValue = num(b.gunValue);
  if (gunValue === undefined || !Array.isArray(b.mods)) return undefined;
  return {
    gunValue,
    mods: b.mods.flatMap((m) => {
      const x = m as Record<string, unknown>;
      const baseValue = num(x.baseValue);
      const count = num(x.count) ?? 1;
      const name = str(x.name);
      return baseValue !== undefined && name
        ? [{ itemId: str(x.itemId), name, baseValue, count }]
        : [];
    }),
  };
}

function parseParts(v: unknown): Subject["parts"] {
  if (!Array.isArray(v)) return undefined;
  const parts = v.flatMap((p) => {
    const x = p as Record<string, unknown>;
    const name = str(x.name);
    return name ? [{ name, count: num(x.count) ?? 1 }] : [];
  });
  return parts.length ? parts : undefined;
}

/** Validates an export file. Throws with a readable message when it's wrong. */
export function parseState(raw: unknown): LabState {
  if (!raw || typeof raw !== "object") throw new Error("Not a lab export.");
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) throw new Error("Unsupported export version.");
  if (!Array.isArray(r.subjects) || !Array.isArray(r.tests))
    throw new Error("Export is missing subjects or tests.");

  const subjects: Subject[] = r.subjects.map((v, i) => {
    const s = v as Record<string, unknown>;
    const id = str(s.id);
    const name = str(s.name);
    if (!id || !name || !isMode(s.mode))
      throw new Error(`Subject ${i + 1} is invalid.`);
    return {
      id,
      name,
      mode: s.mode,
      kind: KINDS.includes(s.kind as SubjectKind)
        ? (s.kind as SubjectKind)
        : "other",
      itemId: str(s.itemId),
      durability: num(s.durability),
      uses: num(s.uses),
      apiBaseValue: num(s.apiBaseValue),
      owned: num(s.owned),
      notes: str(s.notes),
      build: parseBuild(s.build),
      parts: parseParts(s.parts),
      frameValue: num(s.frameValue),
    };
  });

  const tests: LabTest[] = r.tests.map((v, i) => {
    const t = v as Record<string, unknown>;
    const id = str(t.id);
    if (!id || !isMode(t.mode) || !Array.isArray(t.entries))
      throw new Error(`Test ${i + 1} is invalid.`);
    const timer = t.timer === null || t.timer === undefined ? null : t.timer;
    if (timer !== null && !TIMERS.includes(timer as Timer))
      throw new Error(`Test ${i + 1} has an unknown timer.`);
    return {
      id,
      mode: t.mode,
      createdAt: str(t.createdAt) ?? new Date(0).toISOString(),
      entries: t.entries.map((e) => {
        const x = e as Record<string, unknown>;
        const subjectId = str(x.subjectId);
        const qty = num(x.qty);
        if (
          !subjectId ||
          qty === undefined ||
          !Number.isInteger(qty) ||
          qty <= 0
        )
          throw new Error(`Test ${i + 1} has a bad entry.`);
        return { subjectId, qty };
      }),
      fillers: (Array.isArray(t.fillers) ? t.fillers : []).map((f) => {
        const x = f as Record<string, unknown>;
        const baseValue = num(x.baseValue);
        const qty = num(x.qty);
        if (
          baseValue === undefined ||
          baseValue < 0 ||
          qty === undefined ||
          !Number.isInteger(qty) ||
          qty <= 0
        )
          throw new Error(`Test ${i + 1} has a bad filler.`);
        return {
          itemId: str(x.itemId),
          name: str(x.name) ?? "Item",
          baseValue,
          qty,
        };
      }),
      timer: timer as Timer | null,
      excluded: t.excluded === true || undefined,
      notes: str(t.notes),
      hideoutSkill: skillLevel(t.hideoutSkill),
      playedMode:
        typeof t.playedMode === "string" && isGameMode(t.playedMode)
          ? t.playedMode
          : undefined,
    };
  });

  // A test entry must reference a subject in the same export; a dangling id
  // would silently attach to a local subject on merge.
  const subjectIds = new Set(subjects.map((s) => s.id));
  for (const [i, t] of tests.entries()) {
    if (t.entries.some((e) => !subjectIds.has(e.subjectId)))
      throw new Error(`Test ${i + 1} references an unknown subject.`);
  }

  const stashRaw = (r.stash ?? {}) as Record<string, unknown>;
  const stash = { pvp: [], pve: [] } as Record<LabMode, StashItem[]>;
  for (const mode of ["pvp", "pve"] as const) {
    const list = Array.isArray(stashRaw[mode])
      ? (stashRaw[mode] as unknown[])
      : [];
    stash[mode] = list.flatMap((v) => {
      const x = v as Record<string, unknown>;
      const baseValue = num(x.baseValue);
      const count = num(x.count);
      const name = str(x.name);
      return baseValue && count && name
        ? [{ itemId: str(x.itemId), name, baseValue, count }]
        : [];
    });
  }

  const s = (r.settings ?? {}) as Record<string, unknown>;
  return {
    version: 1,
    subjects,
    tests,
    stash,
    settings: {
      tolerance: num(s.tolerance) ?? DEFAULT_SETTINGS.tolerance,
      maxItems: num(s.maxItems) ?? DEFAULT_SETTINGS.maxItems,
    },
  };
}
