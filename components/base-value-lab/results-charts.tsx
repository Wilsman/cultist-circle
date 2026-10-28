"use client";

// Charts for the Results tab: what the API says next to what tests measured,
// and how much attached parts are really worth compared with the API.

import { Fragment, useState, type ReactNode } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Range, Subject, SubjectResult } from "@/lib/base-value-lab";
import { fitMultiplier, predict } from "@/lib/base-value-rule";
import { gunVersion, type PartsValue } from "@/lib/base-value-site";
import {
  k,
  mult,
  ratioSpan,
  shortLabel,
  span,
  STATUS,
  VersionTag,
} from "./labels";

export interface PartsRow {
  subject: Subject;
  value: PartsValue;
}

const isMeasured = (r?: SubjectResult): r is SubjectResult =>
  !!r && r.testCount > 0 && r.status !== "conflict";

function niceAxis(maxValue: number, count = 4) {
  const raw = Math.max(maxValue, 1) / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  const max = Math.ceil(maxValue / step) * step || step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(v);
  return { max, ticks };
}

const ROW =
  "grid grid-cols-[7rem_minmax(0,1fr)_3.75rem] items-center gap-x-3 sm:grid-cols-[13rem_minmax(0,1fr)_5rem]";

interface ChartRow {
  id: string;
  subject: Subject;
  /** Measured span, drawn as the bar. */
  range?: Range;
  /** API value, drawn as a ring. */
  api?: number;
  note: string;
  tip: ReactNode;
}

function BarChart({
  rows,
  max,
  ticks,
  tickLabel,
  band,
  reference,
  focus,
}: {
  rows: ChartRow[];
  max: number;
  ticks: number[];
  tickLabel: (v: number) => string;
  /** Shaded span behind the bars. */
  band?: Range;
  /** A solid line, e.g. "the API is right" at 1×. */
  reference?: number;
  /** Highlight one row and fade the rest. */
  focus?: string;
}) {
  const pct = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  const track = (children?: ReactNode) => (
    <div className="relative h-full">
      {band && (
        <div
          className="absolute inset-y-0 bg-amber-400/10"
          style={{
            left: pct(band.lo),
            width: `calc(${pct(band.hi)} - ${pct(band.lo)})`,
          }}
        />
      )}
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute inset-y-0 border-l border-dashed border-gray-700/70"
          style={{ left: pct(t) }}
        />
      ))}
      {reference !== undefined && (
        <div
          className="absolute inset-y-0 border-l border-gray-400/70"
          style={{ left: pct(reference) }}
        />
      )}
      {children}
    </div>
  );

  return (
    <div className="text-xs">
      {rows.map((row) => {
        const { range, api } = row;
        const from = api !== undefined && range ? Math.min(api, range.lo) : 0;
        const to = api !== undefined && range ? Math.max(api, range.lo) : 0;
        return (
          <Tooltip key={row.id}>
            <TooltipTrigger asChild>
              <div
                className={`${ROW} h-9 rounded transition-opacity hover:bg-gray-800/50 ${focus && focus !== row.id ? "opacity-30" : ""}`}
              >
                <ChartName subject={row.subject} />
                {track(
                  <>
                    {api !== undefined && range && to > from && (
                      <div
                        className="absolute top-1/2 border-t border-dashed border-gray-500"
                        style={{
                          left: pct(from),
                          width: `calc(${pct(to)} - ${pct(from)})`,
                        }}
                      />
                    )}
                    {range && (
                      <div
                        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-amber-400"
                        style={{
                          left: pct(range.lo),
                          width: `calc(${pct(range.hi)} - ${pct(range.lo)})`,
                          minWidth: 4,
                        }}
                      />
                    )}
                    {api !== undefined && (
                      <div
                        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-300 bg-gray-900"
                        style={{ left: pct(api) }}
                      />
                    )}
                  </>,
                )}
                <span className="text-right tabular-nums text-gray-400">
                  {row.note}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">{row.tip}</TooltipContent>
          </Tooltip>
        );
      })}
      <div className={`${ROW} h-6`}>
        <span />
        <div className="relative h-full">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-1 -translate-x-1/2 text-[11px] tabular-nums text-gray-500"
              style={{ left: pct(t) }}
            >
              {tickLabel(t)}
            </span>
          ))}
        </div>
        <span />
      </div>
    </div>
  );
}

/** Gun name that truncates, with its version tag always visible. */
function ChartName({ subject }: { subject: Subject }) {
  const version = gunVersion(subject);
  return (
    <span className="flex min-w-0 flex-col pl-1 leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
      <span className="truncate text-gray-200">
        {version?.name ?? subject.name}
      </span>
      {version && (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
          {version.tag}
        </span>
      )}
    </span>
  );
}

function valueRows(
  subjects: readonly Subject[],
  results: Map<string, SubjectResult>,
): ChartRow[] {
  return subjects.flatMap((s) => {
    const api = s.apiBaseValue;
    if (api === undefined) return [];
    const r = results.get(s.id);
    const range = isMeasured(r) ? r.range : undefined;
    return [
      {
        id: s.id,
        subject: s,
        api,
        range,
        note: range ? (api > 0 ? ratioSpan(range, api) : "") : "untested",
        tip: (
          <>
            <b className="block text-gray-100">{shortLabel(s)}</b>
            API says {k(api)}
            <br />
            True value {range ? span(range) : "not tested yet"}
          </>
        ),
      },
    ];
  });
}

function ValueChart({
  subjects,
  results,
}: {
  subjects: readonly Subject[];
  results: Map<string, SubjectResult>;
}) {
  const rows = valueRows(subjects, results);
  if (!rows.length) return null;
  const top = Math.max(
    ...rows.flatMap((r) => [
      r.api ?? 0,
      r.range?.lo ?? 0,
      r.range && r.range.hi !== Infinity ? r.range.hi : 0,
    ]),
  );
  const { max, ticks } = niceAxis(top * 1.05);
  return <BarChart rows={rows} max={max} ticks={ticks} tickLabel={k} />;
}

export function MultiplierChart({
  rows,
  focus,
}: {
  rows: readonly PartsRow[];
  focus?: string;
}) {
  const tested = rows.filter((r) => r.value.multiplier);
  if (!tested.length) return null;
  const band = focus ? undefined : fitMultiplier(rows)?.band;
  const top = Math.max(
    ...tested.flatMap(({ value: { multiplier: m } }) => [
      m!.lo,
      m!.hi === Infinity ? 0 : m!.hi,
    ]),
  );
  const max = Math.max(4, Math.ceil(top) + 1);
  const step = max > 12 ? 2 : 1;
  const ticks = Array.from(
    { length: Math.floor(max / step) + 1 },
    (_, i) => i * step,
  );
  return (
    <>
      <BarChart
        rows={tested.map(({ subject: s, value: v }) => ({
          id: s.id,
          subject: s,
          range: v.multiplier,
          note: ratioSpan(v.multiplier!),
          tip: (
            <>
              <b className="block text-gray-100">{shortLabel(s)}</b>
              Parts by the API {k(v.apiParts)}
              <br />
              Parts measured {span(v.measured!)}
            </>
          ),
        }))}
        max={max}
        ticks={ticks}
        tickLabel={(v) => `${v}×`}
        band={band}
        reference={1}
        focus={focus}
      />
    </>
  );
}

export function Stat({
  label,
  value,
  unit,
  sub,
  small,
}: {
  label: string;
  value: string;
  unit?: string;
  /** A short line under the number. */
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <span className="block text-xs text-gray-500">{label}</span>
      <strong
        className={`mt-0.5 block truncate font-medium tracking-tight tabular-nums text-gray-100 ${small ? "text-xl" : "text-2xl sm:text-[28px]"}`}
      >
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal tracking-normal text-gray-500">
            {unit}
          </span>
        )}
      </strong>
      {sub && (
        <span className="block truncate text-xs text-gray-500">{sub}</span>
      )}
    </div>
  );
}

export function ChartLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 border-t border-gray-800 pb-1 pt-3 text-xs">
      <span className="text-gray-300">{title}</span>
      <span className="text-gray-500">{hint}</span>
    </div>
  );
}

const VALUE_HINT = "bar = measured range · ring = API value";
export const PARTS_HINT =
  "bar = measured multiplier · shade = the band that fits · line = API is right";

/** "What we know": one row per item; measured rows open to their charts. */
export function ResultsTable({
  subjects,
  results,
  partsRows,
}: {
  subjects: readonly Subject[];
  results: Map<string, SubjectResult>;
  partsRows: readonly PartsRow[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const parts = new Map(partsRows.map((r) => [r.subject.id, r.value]));
  const band = fitMultiplier(partsRows)?.band;
  return (
    <TooltipProvider>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What we know</h2>
        <p className="text-xs text-gray-500">
          Click a measured item to see its charts.
          {band &&
            ` "Calculator" is what the ${ratioSpan(band)} parts rule predicts.`}
        </p>
        <div className="relative overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/80 text-left text-xs text-gray-400">
              <tr>
                <th className="p-2">Item</th>
                <th className="p-2">True value</th>
                <th className="p-2">API says</th>
                <th className="p-2">Calculator</th>
                <th className="p-2">Tests</th>
                <th className="p-2">Status</th>
                <th className="w-8 p-2">
                  <span className="sr-only">Charts</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const r = results.get(s.id);
                const status = STATUS[r?.status ?? "untested"];
                const measured = isMeasured(r);
                const canOpen = measured && s.apiBaseValue !== undefined;
                const isOpen = canOpen && open === s.id;
                const toggle = () => setOpen(isOpen ? null : s.id);
                const pv = parts.get(s.id);
                const guess =
                  band && band.hi !== Infinity && pv?.apiParts
                    ? predict(pv, band)
                    : undefined;
                const off =
                  guess &&
                  measured &&
                  (r.range.hi < guess.lo || r.range.lo > guess.hi);
                return (
                  <Fragment key={s.id}>
                    <tr
                      className={`border-t border-gray-800 align-top ${canOpen ? "cursor-pointer hover:bg-gray-800/40" : ""} ${isOpen ? "bg-gray-800/40" : ""}`}
                      onClick={canOpen ? toggle : undefined}
                    >
                      <td className="p-2">
                        {gunVersion(s)?.name ?? s.name}
                        <VersionTag subject={s} />
                      </td>
                      <td className="whitespace-nowrap p-2 tabular-nums">
                        {measured ? span(r.range) : "?"}
                      </td>
                      <td className="whitespace-nowrap p-2 tabular-nums text-gray-400">
                        {s.apiBaseValue !== undefined ? k(s.apiBaseValue) : "–"}
                      </td>
                      <td
                        className={`whitespace-nowrap p-2 tabular-nums ${off ? "text-rose-300" : "text-gray-300"}`}
                      >
                        {guess ? (
                          <>
                            {off && (
                              <AlertTriangle
                                aria-label="Doesn't fit the rule"
                                className="mr-1 inline size-3.5 align-[-2px]"
                              />
                            )}
                            {span(guess)}
                          </>
                        ) : (
                          <span className="text-gray-500">–</span>
                        )}
                      </td>
                      <td className="p-2 tabular-nums">{r?.testCount ?? 0}</td>
                      <td className="p-2">
                        <span
                          className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-xs ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="p-1 text-right">
                        {canOpen && (
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Hide" : "Show"} charts for ${shortLabel(s)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle();
                            }}
                            className="rounded p-1 text-gray-500 hover:text-gray-200"
                          >
                            <ChevronRight
                              className={`size-4 transition-transform ${isOpen ? "rotate-90 text-amber-300" : ""}`}
                            />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-gray-800/40">
                        <td colSpan={7} className="px-3 pb-4 pt-1">
                          <ItemDetail
                            subject={s}
                            result={r}
                            parts={parts.get(s.id)}
                            partsRows={partsRows}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </TooltipProvider>
  );
}

function ItemDetail({
  subject,
  result,
  parts,
  partsRows,
}: {
  subject: Subject;
  result: SubjectResult;
  parts?: PartsValue;
  partsRows: readonly PartsRow[];
}) {
  const api = subject.apiBaseValue!;
  const { range } = result;
  const mid =
    api > 0 && range.hi !== Infinity ? (range.lo + range.hi) / 2 / api : null;
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-4 py-3 sm:grid-cols-4">
        <Stat small label="True value" value={span(range).replace(/ /g, "")} />
        <Stat small label="API says" value={k(api)} />
        <Stat
          small
          label="True vs API"
          value={mid ? `~${mult(mid)}` : api > 0 ? ratioSpan(range, api) : "–"}
        />
        <Stat
          small
          label="Parts multiplier"
          value={parts?.multiplier ? ratioSpan(parts.multiplier) : "–"}
          unit={
            parts?.multiplier ? undefined : parts ? "not measured" : "no parts"
          }
        />
      </div>
      <ChartLabel
        title="API value vs true value"
        hint={`scaled to this item · ${VALUE_HINT}`}
      />
      <ValueChart
        subjects={[subject]}
        results={new Map([[subject.id, result]])}
      />
      {parts?.multiplier && (
        <>
          <ChartLabel
            title="Parts multiplier vs the other guns"
            hint="this gun highlighted"
          />
          <MultiplierChart rows={partsRows} focus={subject.id} />
          <p className="text-xs text-gray-500">
            Parts by the API {k(parts.apiParts)}, measured{" "}
            {span(parts.measured!)}, on a {k(parts.frame)} frame.
          </p>
        </>
      )}
    </div>
  );
}
