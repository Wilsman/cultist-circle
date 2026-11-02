// The Results tab: the two candidate rules, scored against every tested gun,
// and the timer list for a test aimed between them.

import {
  fits,
  type PickedTest,
  type Theories,
  type TheoryRow,
} from "@/lib/base-value-rule";
import { gunVersion } from "@/lib/base-value-site";
import { Glyph, k, mult, span } from "./labels";

type Rule = "nested" | "flat";

export const ruleName = (rule: Rule, multiplier: number | null) =>
  rule === "nested"
    ? "Nested"
    : multiplier === null
      ? "Flat"
      : `Flat ${mult(multiplier)}`;

/** Guns with parts: bare frames fit both rules, so they can't tell them apart. */
const scored = (rows: readonly TheoryRow[]) =>
  rows.filter((r) => r.subject.kind === "weapon" && r.measured);

function score(rows: readonly TheoryRow[], rule: Rule) {
  const judged = scored(rows).filter((r) => fits(r, rule) !== null);
  return {
    fit: judged.filter((r) => fits(r, rule)).length,
    of: judged.length,
  };
}

function headline({ multiplier, rows }: Theories) {
  const nested = score(rows, "nested");
  const flat = score(rows, "flat");
  if (!nested.of && !flat.of) return "No guns with parts tested yet";
  const nestedAll = nested.fit === nested.of;
  const flatAll = flat.fit === flat.of;
  if (nestedAll && !flatAll)
    return "Each part counts once more for every part it hangs from";
  if (flatAll && !nestedAll && multiplier !== null)
    return `Attached parts count ${mult(multiplier)} their base value`;
  if (nestedAll) return "Both rules fit every tested gun";
  return "Neither rule fits every tested gun";
}

function Score({
  rule,
  name,
  fit,
  of,
}: {
  rule: Rule;
  name: string;
  fit: number;
  of: number;
}) {
  const all = of > 0 && fit === of;
  return (
    <div className="bg-gray-900 px-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-gray-400">
        <Glyph mark={rule} />
        {name}
      </dt>
      <dd className="mt-1 text-2xl font-medium tabular-nums tracking-tight">
        <span className={all ? "text-gray-100" : "text-rose-300"}>{fit}</span>
        <span className="text-gray-500"> / {of}</span>
      </dd>
    </div>
  );
}

function Prediction({ row, rule }: { row: TheoryRow; rule: Rule }) {
  const value = row[rule];
  if (value === null) return <span className="text-gray-600">–</span>;
  const ok = fits(row, rule);
  return (
    <span
      className={
        ok === null
          ? "text-gray-500"
          : ok
            ? "text-gray-100"
            : "text-rose-300 line-through decoration-rose-300/50"
      }
    >
      {k(value)}
      {ok === false && <span className="sr-only"> (misses)</span>}
    </span>
  );
}

export function TheoryResults({ theories }: { theories: Theories }) {
  const { multiplier, rows } = theories;
  const rules: Rule[] = ["nested", "flat"];
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold tracking-tight text-gray-100">
        {headline(theories)}
      </h2>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-800 bg-gray-800">
        {rules.map((rule) => (
          <Score
            key={rule}
            rule={rule}
            name={ruleName(rule, multiplier)}
            {...score(rows, rule)}
          />
        ))}
      </dl>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr>
              <th className="whitespace-nowrap px-2 py-2 font-normal sm:px-3">
                Gun
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-normal sm:px-3">
                Measured
              </th>
              {rules.map((rule) => (
                <th
                  key={rule}
                  className="whitespace-nowrap px-2 py-2 text-right font-normal sm:px-3"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Glyph mark={rule} />
                    {ruleName(rule, null)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row) => {
              const version = gunVersion(row.subject);
              const conflict = row.result?.status === "conflict";
              return (
                <tr key={row.subject.id} className="border-t border-gray-800">
                  <td className="min-w-[5.5rem] px-2 py-2.5 sm:px-3">
                    <span className="block text-gray-100">
                      {version?.name ?? row.subject.name}
                    </span>
                    {version && (
                      <span className="block text-xs text-gray-500">
                        {version.tag}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right sm:px-3">
                    {row.measured ? (
                      span(row.measured)
                    ) : conflict ? (
                      <span className="text-rose-300">Conflict</span>
                    ) : (
                      <span className="text-gray-600">–</span>
                    )}
                  </td>
                  {rules.map((rule) => (
                    <td
                      key={rule}
                      className="whitespace-nowrap px-2 py-2.5 text-right sm:px-3"
                    >
                      <Prediction row={row} rule={rule} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** What each timer this test can show would mean. */
export function TimerMeaning({ next }: { next: PickedTest }) {
  const { plan, theory } = next;
  const backs = (r: { lo: number; hi: number }) => {
    if (!theory) return span(r);
    const n = r.lo <= theory.nested && theory.nested <= r.hi;
    const f = r.lo <= theory.flat && theory.flat <= r.hi;
    if (n && f) return "Both rules";
    if (n) return ruleName("nested", theory.multiplier);
    if (f) return ruleName("flat", theory.multiplier);
    return "Neither rule";
  };
  return (
    <ul className="divide-y divide-gray-800 text-sm">
      {plan.outcomes.map((o) => (
        <li key={o.timer} className="flex items-baseline gap-4 py-2">
          <span className="w-8 shrink-0 font-semibold text-amber-300">
            {o.timer}
          </span>
          <span className="text-gray-100">{backs(o.implies)}</span>
        </li>
      ))}
    </ul>
  );
}
