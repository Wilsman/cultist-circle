"use client";

// The Results tab's headline: which rule explains gun base values, how
// tightly tests pin it down, and what the calculator would say with it today.

import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Subject, SubjectResult } from "@/lib/base-value-lab";
import {
  checkRules,
  predict,
  RULE_GOAL,
  RULE_MIN_GUNS,
  ruleState,
  toMultiplier,
  type PickedTest,
  type RuleState,
  type RuleVerdict,
} from "@/lib/base-value-rule";
import { gunVersion } from "@/lib/base-value-site";
import { k, ratioSpan, shortLabel, span, VersionTag } from "./labels";
import {
  ChartLabel,
  MultiplierChart,
  PARTS_HINT,
  Stat,
  type PartsRow,
} from "./results-charts";

const isMeasured = (r?: SubjectResult): r is SubjectResult =>
  !!r && r.testCount > 0 && r.status !== "conflict" && r.status !== "untested";

const VERDICT: Record<
  RuleVerdict,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  fits: { label: "Fits", icon: CheckCircle2, className: "text-emerald-300" },
  "ruled-out": {
    label: "Ruled out",
    icon: XCircle,
    className: "text-rose-300",
  },
  "cant-tell": {
    label: "Can't tell yet",
    icon: CircleHelp,
    className: "text-gray-400",
  },
};

const percent = (p: number) =>
  p === Infinity ? "open" : `±${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;

/** Why the multiplier isn't ready for the calculator yet. */
function notReadyReason(state: RuleState) {
  const { fit } = state;
  if (!fit) return "no guns with parts tested";
  if (fit.fit.length < fit.tested.length) return "tested guns disagree";
  if (fit.fit.length < RULE_MIN_GUNS) {
    const more = RULE_MIN_GUNS - fit.fit.length;
    return `needs ${more} more ${more === 1 ? "gun" : "guns"}`;
  }
  return `narrow it to ${percent(RULE_GOAL)}`;
}

function frameLine(
  subjects: readonly Subject[],
  results: Map<string, SubjectResult>,
) {
  const bare = subjects.flatMap((s) => {
    const r = results.get(s.id);
    return s.kind === "weapon-bare" &&
      s.apiBaseValue !== undefined &&
      isMeasured(r)
      ? [r.range.lo <= s.apiBaseValue && s.apiBaseValue <= r.range.hi]
      : [];
  });
  if (!bare.length) return "Bare frames haven't been tested here yet.";
  const off = bare.filter((ok) => !ok).length;
  if (!off) return `Bare frames count as the API says (${bare.length} tested).`;
  return `${off} of ${bare.length} bare frames don't match the API.`;
}

function headline(state: RuleState, rows: readonly PartsRow[]) {
  const { fit } = state;
  if (!fit) return "Not enough tests yet to see how attached parts count.";
  if (fit.fit.length === fit.tested.length)
    return `Attached parts count ${ratioSpan(fit.band)} their API value.`;
  if (fit.fit.length < 2)
    return "The tested guns don't agree on one multiplier for their parts.";
  const out = rows
    .filter((r) => r.value.multiplier && !fit.fit.includes(r.subject.id))
    .map((r) => shortLabel(r.subject));
  return `${fit.fit.length} of ${fit.tested.length} guns agree parts count ${ratioSpan(fit.band)} their API value. ${out.join(", ")} ${out.length > 1 ? "don't" : "doesn't"} fit.`;
}

/** What each timer this test can show would mean. */
export function TimerMeaning({ next }: { next: PickedTest }) {
  const { plan, rule } = next;
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5 text-sm">
        {plan.outcomes.map((o) => (
          <li
            key={o.timer}
            className="flex items-baseline gap-3 rounded-md bg-gray-800/60 px-3 py-2"
          >
            <span className="w-8 shrink-0 font-semibold text-amber-300">
              {o.timer}
            </span>
            <span className="min-w-0">
              {rule ? (
                <>
                  Parts count{" "}
                  <b className="font-medium text-gray-100">
                    {ratioSpan(toMultiplier(rule, o.implies))}
                  </b>
                  <span className="block text-xs text-gray-400">
                    The gun is worth {span(o.implies)}
                  </span>
                </>
              ) : (
                <>
                  Worth{" "}
                  <b className="font-medium text-gray-100">{span(o.implies)}</b>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400">
        {rule
          ? "Any other timer: the rule doesn't fit this gun. Send it anyway, that's worth knowing."
          : "Any other timer: send it anyway. It means earlier results need a re-check."}
      </p>
    </div>
  );
}

function RuleList({
  subjects,
  results,
}: {
  subjects: readonly Subject[];
  results: Map<string, SubjectResult>;
}) {
  const checks = checkRules(subjects, results);
  return (
    <ul className="divide-y divide-gray-800 rounded-xl border border-gray-700">
      {checks.map((c) => {
        const v = VERDICT[c.verdict];
        const Icon = v.icon;
        return (
          <li key={c.id} className="flex gap-3 p-3">
            <Icon className={`mt-0.5 size-4 shrink-0 ${v.className}`} />
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-gray-100">{c.label}</span>
                <span
                  className={`shrink-0 whitespace-nowrap text-xs ${v.className}`}
                >
                  {v.label}
                </span>
              </div>
              <span className="block text-xs text-gray-400">{c.detail}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Predictions({
  rows,
  results,
  state,
}: {
  rows: readonly PartsRow[];
  results: Map<string, SubjectResult>;
  state: RuleState;
}) {
  const band = state.fit?.band;
  const guns = rows.filter((r) => r.value.apiParts > 0);
  if (!guns.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-800/80 text-left text-xs text-gray-400">
          <tr>
            <th className="p-2">Gun</th>
            <th className="p-2">Calculator</th>
            <th className="hidden p-2 sm:table-cell">API</th>
            <th className="p-2">Measured</th>
          </tr>
        </thead>
        <tbody>
          {guns.map(({ subject, value }) => {
            const r = results.get(subject.id);
            const guess = band && band.hi !== Infinity && predict(value, band);
            const measured = isMeasured(r) ? r.range : undefined;
            const off =
              guess &&
              measured &&
              (measured.hi < guess.lo || measured.lo > guess.hi);
            return (
              <tr key={subject.id} className="border-t border-gray-800">
                <td className="p-2">
                  {gunVersion(subject)?.name ?? subject.name}
                  <VersionTag subject={subject} />
                </td>
                <td className="whitespace-nowrap p-2 tabular-nums text-gray-100">
                  {guess ? span(guess) : "–"}
                </td>
                <td className="hidden whitespace-nowrap p-2 tabular-nums text-gray-400 sm:table-cell">
                  {k(subject.apiBaseValue!)}
                </td>
                <td className="whitespace-nowrap p-2 tabular-nums">
                  {measured ? (
                    <span className={off ? "text-rose-300" : "text-gray-300"}>
                      {off && (
                        <AlertTriangle
                          aria-label="Doesn't fit the rule"
                          className="mr-1 inline size-3.5 align-[-2px]"
                        />
                      )}
                      {span(measured)}
                    </span>
                  ) : (
                    <span className="text-gray-500">untested</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function HiddenRule({
  subjects,
  results,
  partsRows,
  next,
  onRunTest,
}: {
  subjects: readonly Subject[];
  results: Map<string, SubjectResult>;
  partsRows: readonly PartsRow[];
  next: PickedTest | null;
  onRunTest: () => void;
}) {
  const state = ruleState(partsRows);
  const { fit } = state;
  return (
    <TooltipProvider>
      <section className="space-y-5 rounded-xl border border-gray-700 bg-gray-900/70 p-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-amber-300">
            The hidden rule
          </p>
          <h2 className="text-xl font-semibold text-gray-100">
            {headline(state, partsRows)}
          </h2>
          <p className="text-sm text-gray-400">
            {frameLine(subjects, results)} The calculator will use the rule once
            it fits every tested gun and is pinned to {percent(RULE_GOAL)}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Parts multiplier"
            value={fit ? ratioSpan(fit.band) : "–"}
            sub={
              fit
                ? `fits ${fit.fit.length} of ${fit.tested.length} guns`
                : "no guns tested"
            }
          />
          <Stat
            label="Precision"
            value={fit ? percent(state.precision) : "–"}
            sub={`goal ${percent(RULE_GOAL)}`}
          />
          <Stat
            label="Guns that fit"
            value={fit ? `${fit.fit.length}/${fit.tested.length}` : "–"}
            sub={`at least ${RULE_MIN_GUNS} needed`}
          />
          <Stat
            label="Ready for the calculator"
            value={state.ready ? "Yes" : "Not yet"}
            sub={state.ready ? "used for gun values" : notReadyReason(state)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <h3 className="font-medium">Which rule fits the tests?</h3>
            <RuleList subjects={subjects} results={results} />
            {partsRows.some((r) => r.value.multiplier) && (
              <div className="space-y-1">
                <ChartLabel title="Parts multiplier by gun" hint={PARTS_HINT} />
                <MultiplierChart rows={partsRows} />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <h3 className="font-medium">What the calculator would say today</h3>
            <Predictions rows={partsRows} results={results} state={state} />
            {next && (
              <div className="space-y-3 rounded-xl border border-amber-400/30 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-300">
                    Best next test
                  </p>
                  <p className="mt-1 text-sm text-gray-100">
                    {next.plan.qty}× {shortLabel(next.subject)}
                    {next.plan.fillers.length > 0 &&
                      ` + ${next.plan.fillers.reduce((n, f) => n + f.qty, 0)} extra items`}
                  </p>
                  {next.rule && (
                    <p className="text-xs text-gray-400">
                      Splits the {ratioSpan(next.rule.band)} range, whatever the
                      timer.
                    </p>
                  )}
                </div>
                <TimerMeaning next={next} />
                <Button size="sm" onClick={onRunTest}>
                  Run this test
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
