"use client";

// The charts page's charts, drawn with visx: each gun's game value against its
// API value, both rules' predictions per gun, and the parts multiplier.

import type { PointerEvent, ReactNode } from "react";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear, scaleLog } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { BOUNDARIES, type Range } from "@/lib/base-value-lab";
import { fits, type Theories, type TheoryRow } from "@/lib/base-value-rule";
import { gunVersion } from "@/lib/base-value-site";
import { COLOR, Glyph, k, mult, span, type Mark } from "./labels";

const GRID = "#262626";
const AXIS = "#404040";
const TEXT = "#737373";
const MISS = "#fda4af";

export const finite = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

export const ratio = (r: Range) =>
  r.hi === Infinity ? `${mult(r.lo)}+` : `${mult(r.lo)}–${mult(r.hi)}`;

export const flatName = ({ multiplier }: Theories) =>
  multiplier === null ? "Flat" : `Flat ${mult(multiplier)}`;

const gunName = (row: TheoryRow) =>
  gunVersion(row.subject)?.name ?? row.subject.name;

const byApi = (a: TheoryRow, b: TheoryRow) =>
  (a.subject.apiBaseValue ?? 0) - (b.subject.apiBaseValue ?? 0);

export interface Hover {
  active: string | null;
  onActive: (id: string | null) => void;
}

type Size = { width: number; height: number };

/** Fills its parent; `minWidth` lets dense charts scroll sideways instead. */
function Fill({
  minWidth = 0,
  children,
}: {
  minWidth?: number;
  children: (size: Size) => ReactNode;
}) {
  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      <div className="h-full" style={{ minWidth }}>
        <ParentSize debounceTime={10}>
          {({ width, height }) =>
            width > 0 && height > 0 ? children({ width, height }) : null
          }
        </ParentSize>
      </div>
    </div>
  );
}

/** A fill that fades out upwards, for ranges with no upper bound. */
function Fade({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stopColor={color} stopOpacity={1} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}

function YGrid({
  ticks,
  at,
  width,
  label,
}: {
  ticks: number[];
  at: (v: number) => number;
  width: number;
  label: (v: number) => string;
}) {
  return ticks.map((t) => (
    <g key={t}>
      <line
        x1={0}
        x2={width}
        y1={at(t)}
        y2={at(t)}
        stroke={GRID}
        strokeDasharray="1 4"
      />
      <text
        x={-12}
        y={at(t)}
        dy="0.32em"
        textAnchor="end"
        fontSize={11}
        fill={TEXT}
        className="tabular-nums"
      >
        {label(t)}
      </text>
    </g>
  ));
}

/** Labels at the right edge, nudged apart so they never overlap. */
function EndLabels({
  items,
  x,
  height,
}: {
  items: { key: string; mark: Mark; label: string; px: number; py: number }[];
  x: number;
  height: number;
}) {
  const GAP = 18;
  const placed = [...items].sort((a, b) => a.py - b.py);
  let last = -Infinity;
  const ys = placed.map((it) => (last = Math.max(it.py, last + GAP)));
  const over = Math.max(0, (ys.at(-1) ?? 0) - height);
  return placed.map((it, i) => {
    const y = ys[i] - over;
    return (
      <g key={it.key}>
        <path
          d={`M${it.px},${it.py} L${x + 4},${y}`}
          stroke={COLOR[it.mark]}
          strokeOpacity={0.35}
          fill="none"
        />
        <circle cx={x + 10} cy={y} r={3} fill={COLOR[it.mark]} />
        <text x={x + 18} y={y} dy="0.32em" fontSize={12} fill={COLOR[it.mark]}>
          {it.label}
        </text>
      </g>
    );
  });
}

const LOG_TICKS = [
  500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000,
  1_000_000,
];

function axisScale(
  log: boolean,
  values: number[],
  range: [number, number],
  pad: number,
) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (log) {
    const s = scaleLog({ domain: [lo / pad, hi * pad], range });
    const [d0, d1] = s.domain();
    return {
      at: (v: number) => s(Math.min(Math.max(v, d0), d1)) ?? 0,
      lo: d0,
      hi: d1,
      ticks: LOG_TICKS.filter((t) => t >= d0 && t <= d1),
    };
  }
  const s = scaleLinear({ domain: [0, hi * 1.08], range, nice: true });
  const [d0, d1] = s.domain();
  return {
    at: (v: number) => s(Math.min(Math.max(v, d0), d1)) ?? 0,
    lo: d0,
    hi: d1,
    ticks: s.ticks(6).filter((t) => t > 0),
  };
}

const VALUE_MARGIN = { top: 20, right: 120, bottom: 40, left: 56 };

/** Game value against API value: the API line, both rules and the tests. */
export function ValueChart(
  props: Hover & { theories: Theories; log: boolean },
) {
  return <Fill>{(size) => <ValuePlot {...props} {...size} />}</Fill>;
}

function ValuePlot({
  theories,
  log,
  active,
  onActive,
  width,
  height,
}: Hover & Size & { theories: Theories; log: boolean }) {
  const M = VALUE_MARGIN;
  const iw = width - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const rows = theories.rows
    .filter((r) => finite(r.subject.apiBaseValue))
    .sort(byApi);
  if (!rows.length || iw < 40 || ih < 40) return null;
  const api = (r: TheoryRow) => r.subject.apiBaseValue!;
  const values = (r: TheoryRow) =>
    [api(r), r.nested, r.flat, r.measured?.lo, r.measured?.hi].filter(finite);
  const x = axisScale(log, rows.map(api), [0, iw], 1.4);
  const y = axisScale(log, rows.flatMap(values), [ih, 0], 1.4);
  const yTicks = BOUNDARIES.filter((b) => b > y.lo && b < y.hi);

  const series = (rule: "nested" | "flat") =>
    rows.flatMap((r) => {
      const v = r[rule];
      return finite(v)
        ? [{ id: r.subject.id, x: x.at(api(r)), y: y.at(v) }]
        : [];
    });
  const nested = series("nested");
  const flat = series("flat");
  // The API line, game value = API value, across both domains.
  const t0 = Math.max(x.lo, y.lo, 1);
  const t1 = Math.min(x.hi, y.hi);

  const dim = (id: string) => (active && active !== id ? 0.3 : 1);
  const activeRow = rows.find((r) => r.subject.id === active);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const p = localPoint(e);
    if (!p) return;
    const px = p.x - M.left;
    const py = p.y - M.top;
    let best: string | null = null;
    let bestD = Infinity;
    for (const r of rows) {
      const cx = x.at(api(r));
      for (const v of values(r)) {
        const d = (cx - px) ** 2 + ((y.at(v) - py) / 3) ** 2;
        if (d < bestD) [best, bestD] = [r.subject.id, d];
      }
    }
    onActive(best);
  };

  const ends = [
    nested.at(-1) && {
      key: "nested",
      mark: "nested" as const,
      label: "Nested",
      px: nested.at(-1)!.x,
      py: nested.at(-1)!.y,
    },
    flat.at(-1) && {
      key: "flat",
      mark: "flat" as const,
      label: flatName(theories),
      px: flat.at(-1)!.x,
      py: flat.at(-1)!.y,
    },
    t1 > t0 && {
      key: "api",
      mark: "api" as const,
      label: "API",
      px: x.at(t1),
      py: y.at(t1),
    },
  ].filter((e) => !!e);

  return (
    <svg width={width} height={height} className="select-none">
      <defs>
        <Fade id="value-open" color={COLOR.measured} />
      </defs>
      <Group left={M.left} top={M.top}>
        <YGrid ticks={yTicks} at={y.at} width={iw} label={k} />
        {x.ticks.map((t) => (
          <g key={t}>
            <line
              x1={x.at(t)}
              x2={x.at(t)}
              y1={0}
              y2={ih}
              stroke={GRID}
              strokeDasharray="1 4"
            />
            <text
              x={x.at(t)}
              y={ih + 22}
              textAnchor="middle"
              fontSize={11}
              fill={TEXT}
            >
              {k(t)}
            </text>
          </g>
        ))}
        <line x1={0} x2={iw} y1={ih} y2={ih} stroke={AXIS} />
        <text x={iw} y={ih + 22} dx={24} fontSize={11} fill={TEXT}>
          API
        </text>
        {t1 > t0 && (
          <line
            x1={x.at(t0)}
            y1={y.at(t0)}
            x2={x.at(t1)}
            y2={y.at(t1)}
            stroke={COLOR.api}
            strokeOpacity={0.5}
            strokeDasharray="4 4"
          />
        )}
        {rows.map((r) => {
          if (!r.measured) return null;
          const open = r.measured.hi === Infinity;
          const top = open ? 0 : y.at(r.measured.hi);
          return (
            <rect
              key={r.subject.id}
              x={x.at(api(r)) - 3}
              width={6}
              y={top}
              height={Math.max(6, y.at(r.measured.lo) - top)}
              rx={3}
              fill={open ? "url(#value-open)" : COLOR.measured}
              opacity={dim(r.subject.id) * 0.85}
            />
          );
        })}
        <LinePath
          data={nested}
          x={(p) => p.x}
          y={(p) => p.y}
          stroke={COLOR.nested}
          strokeOpacity={0.55}
          strokeWidth={1.5}
        />
        <LinePath
          data={flat}
          x={(p) => p.x}
          y={(p) => p.y}
          stroke={COLOR.flat}
          strokeOpacity={0.55}
          strokeWidth={1.5}
        />
        {nested.map((p) => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.id === active ? 5 : 3.5}
            fill={COLOR.nested}
            opacity={dim(p.id)}
          />
        ))}
        {flat.map((p) => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.id === active ? 5 : 3.5}
            fill="#000"
            stroke={COLOR.flat}
            strokeWidth={2}
            opacity={dim(p.id)}
          />
        ))}
        <EndLabels items={ends} x={iw} height={ih} />
        {activeRow && (
          <Crosshair
            x={x.at(api(activeRow))}
            height={ih}
            label={k(api(activeRow))}
          />
        )}
        <rect
          width={iw}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => onActive(null)}
        />
      </Group>
    </svg>
  );
}

function Crosshair({
  x,
  height,
  label,
}: {
  x: number;
  height: number;
  label: string;
}) {
  const w = label.length * 7 + 14;
  return (
    <g pointerEvents="none">
      <line
        x1={x}
        x2={x}
        y1={0}
        y2={height}
        stroke="#a3a3a3"
        strokeDasharray="3 3"
      />
      <rect
        x={x - w / 2}
        y={height + 8}
        width={w}
        height={20}
        rx={4}
        fill="#e5e5e5"
      />
      <text
        x={x}
        y={height + 18}
        dy="0.32em"
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill="#0a0a0a"
      >
        {label}
      </text>
    </g>
  );
}

const BAR_MARGIN = { top: 28, right: 24, bottom: 52, left: 56 };

/** Gun names under each group of bars. */
function GunAxis({
  rows,
  at,
  width,
  y,
  active,
}: {
  rows: TheoryRow[];
  at: (id: string) => number;
  width: number;
  y: number;
  active: string | null;
}) {
  const chars = Math.max(4, Math.floor(width / 6.6));
  const cut = (s: string) =>
    s.length > chars ? `${s.slice(0, chars - 1)}…` : s;
  return rows.map((r) => {
    const id = r.subject.id;
    const cx = at(id) + width / 2;
    const tag = gunVersion(r.subject)?.tag;
    return (
      <g key={id} opacity={active && active !== id ? 0.4 : 1}>
        <title>{r.subject.name}</title>
        <text
          x={cx}
          y={y + 18}
          textAnchor="middle"
          fontSize={11}
          fill="#e5e5e5"
        >
          {cut(gunName(r))}
        </text>
        {tag && (
          <text x={cx} y={y + 33} textAnchor="middle" fontSize={10} fill={TEXT}>
            {cut(tag)}
          </text>
        )}
      </g>
    );
  });
}

const PREDICTED: Mark[] = ["nested", "flat", "api"];

/** Per gun: both rules and the API value as bars over the measured range. */
export function PredictionChart(props: Hover & { theories: Theories }) {
  const n = props.theories.rows.filter(
    (r) => r.measured || finite(r.nested) || finite(r.flat),
  ).length;
  return (
    <Fill minWidth={n * 120 + 80}>
      {(size) => <PredictionPlot {...props} {...size} />}
    </Fill>
  );
}

function PredictionPlot({
  theories,
  active,
  onActive,
  width,
  height,
}: Hover & Size & { theories: Theories }) {
  const M = BAR_MARGIN;
  const iw = width - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const rows = theories.rows
    .filter((r) => r.measured || finite(r.nested) || finite(r.flat))
    .sort(byApi);
  if (!rows.length || iw < 40 || ih < 40) return null;
  const value = (r: TheoryRow, m: Mark) =>
    m === "api"
      ? r.subject.apiBaseValue
      : m === "nested"
        ? r.nested
        : m === "flat"
          ? r.flat
          : null;
  const top = Math.max(
    ...rows.flatMap((r) =>
      [
        ...PREDICTED.map((m) => value(r, m)),
        r.measured?.lo,
        r.measured?.hi,
      ].filter(finite),
    ),
  );
  const y = scaleLinear({ domain: [0, top * 1.1], range: [ih, 0], nice: true });
  const Y = (v: number) => y(Math.min(v, y.domain()[1])) ?? 0;
  const x0 = scaleBand({
    domain: rows.map((r) => r.subject.id),
    range: [0, iw],
    paddingInner: 0.28,
    paddingOuter: 0.1,
  });
  const bw = x0.bandwidth();
  const x1 = scaleBand({ domain: PREDICTED, range: [0, bw], padding: 0.14 });
  const yTicks = BOUNDARIES.filter((b) => b < y.domain()[1]);

  return (
    <svg
      width={width}
      height={height}
      className="select-none"
      onPointerLeave={() => onActive(null)}
    >
      <defs>
        <Fade id="prediction-open" color={COLOR.measured} />
      </defs>
      <Group left={M.left} top={M.top}>
        <YGrid ticks={yTicks} at={Y} width={iw} label={k} />
        <line x1={0} x2={iw} y1={ih} y2={ih} stroke={AXIS} />
        {rows.map((r) => {
          const id = r.subject.id;
          const gx = x0(id) ?? 0;
          const m = r.measured;
          const open = m?.hi === Infinity;
          return (
            <g key={id} opacity={active && active !== id ? 0.35 : 1}>
              {m && (
                <>
                  <rect
                    x={gx - 4}
                    width={bw + 8}
                    y={open ? 0 : Y(m.hi)}
                    height={Y(m.lo) - (open ? 0 : Y(m.hi))}
                    rx={3}
                    fill={open ? "url(#prediction-open)" : COLOR.measured}
                    fillOpacity={open ? 0.25 : 0.12}
                  />
                  {[m.lo, ...(open ? [] : [m.hi])].map((v) => (
                    <line
                      key={v}
                      x1={gx - 4}
                      x2={gx + bw + 4}
                      y1={Y(v)}
                      y2={Y(v)}
                      stroke={COLOR.measured}
                      strokeOpacity={0.8}
                    />
                  ))}
                </>
              )}
              {PREDICTED.map((mark) => {
                const v = value(r, mark);
                if (!finite(v)) return null;
                const miss =
                  mark !== "api" &&
                  fits(r, mark as "nested" | "flat") === false;
                const bx = gx + (x1(mark) ?? 0);
                const w = x1.bandwidth();
                return (
                  <g key={mark}>
                    <rect
                      x={bx}
                      width={w}
                      y={Y(v)}
                      height={ih - Y(v)}
                      rx={2}
                      fill={COLOR[mark]}
                      fillOpacity={mark === "api" ? 0.45 : miss ? 0.3 : 0.9}
                    />
                    <text
                      x={bx + w / 2}
                      y={Y(v) - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fill={miss ? MISS : "#d4d4d4"}
                      className="tabular-nums"
                    >
                      {k(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
        <GunAxis
          rows={rows}
          at={(id) => x0(id) ?? 0}
          width={bw}
          y={ih}
          active={active}
        />
        {rows.map((r) => (
          <rect
            key={r.subject.id}
            x={(x0(r.subject.id) ?? 0) - (x0.step() - bw) / 2}
            width={x0.step()}
            height={ih + M.bottom}
            fill="transparent"
            onPointerEnter={() => onActive(r.subject.id)}
          />
        ))}
      </Group>
    </svg>
  );
}

/** Each gun's measured parts multiplier against the band the flat rule uses. */
export function MultiplierChart(props: Hover & { theories: Theories }) {
  const n = props.theories.rows.filter((r) => r.parts?.multiplier).length;
  return (
    <Fill minWidth={n * 72 + 160}>
      {(size) => <MultiplierPlot {...props} {...size} />}
    </Fill>
  );
}

function MultiplierPlot({
  theories,
  active,
  onActive,
  width,
  height,
}: Hover & Size & { theories: Theories }) {
  const M = { ...BAR_MARGIN, right: 96 };
  const iw = width - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const rows = theories.rows.filter((r) => r.parts?.multiplier).sort(byApi);
  if (!rows.length || iw < 40 || ih < 40) return null;
  const { band, multiplier } = theories;
  const top = Math.max(
    ...rows.flatMap((r) => {
      const m = r.parts!.multiplier!;
      return [m.lo, m.hi].filter(finite);
    }),
    band && finite(band.hi) ? band.hi : 0,
  );
  const max = Math.max(4, Math.ceil(top) + 1);
  const y = scaleLinear({ domain: [0, max], range: [ih, 0] });
  const Y = (v: number) => y(Math.min(v, max)) ?? 0;
  const step = max > 12 ? 2 : 1;
  const ticks = Array.from(
    { length: Math.floor(max / step) },
    (_, i) => (i + 1) * step,
  );
  const x0 = scaleBand({
    domain: rows.map((r) => r.subject.id),
    range: [0, iw],
    paddingInner: 0.3,
    paddingOuter: 0.15,
  });
  const bw = x0.bandwidth();
  const barW = Math.min(bw, 28);

  const ends = [
    multiplier !== null && {
      key: "flat",
      mark: "flat" as const,
      label: flatName(theories),
      px: iw,
      py: Y(multiplier),
    },
  ].filter((e) => !!e);

  return (
    <svg
      width={width}
      height={height}
      className="select-none"
      onPointerLeave={() => onActive(null)}
    >
      <defs>
        <Fade id="multiplier-open" color={COLOR.measured} />
      </defs>
      <Group left={M.left} top={M.top}>
        <YGrid ticks={ticks} at={Y} width={iw} label={(t) => `${t}×`} />
        {band && (
          <rect
            x={0}
            width={iw}
            y={band.hi === Infinity ? 0 : Y(band.hi)}
            height={Y(band.lo) - (band.hi === Infinity ? 0 : Y(band.hi))}
            fill={COLOR.flat}
            fillOpacity={0.1}
          />
        )}
        {multiplier !== null && (
          <line
            x1={0}
            x2={iw}
            y1={Y(multiplier)}
            y2={Y(multiplier)}
            stroke={COLOR.flat}
            strokeOpacity={0.7}
            strokeDasharray="4 4"
          />
        )}
        <line x1={0} x2={iw} y1={Y(1)} y2={Y(1)} stroke="#525252" />
        <line x1={0} x2={iw} y1={ih} y2={ih} stroke={AXIS} />
        <EndLabels items={ends} x={iw} height={ih} />
        {rows.map((r) => {
          const id = r.subject.id;
          const m = r.parts!.multiplier!;
          const open = m.hi === Infinity;
          const cx = (x0(id) ?? 0) + bw / 2;
          const yTop = open ? 0 : Y(m.hi);
          return (
            <g key={id} opacity={active && active !== id ? 0.35 : 1}>
              <rect
                x={cx - barW / 2}
                width={barW}
                y={yTop}
                height={Math.max(4, Y(m.lo) - yTop)}
                rx={3}
                fill={open ? "url(#multiplier-open)" : COLOR.measured}
                fillOpacity={0.9}
              />
              <text
                x={cx}
                y={(open ? Y(m.lo) : yTop) - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#d4d4d4"
                className="tabular-nums"
              >
                {ratio(m)}
              </text>
            </g>
          );
        })}
        <GunAxis
          rows={rows}
          at={(id) => x0(id) ?? 0}
          width={bw}
          y={ih}
          active={active}
        />
        {rows.map((r) => (
          <rect
            key={r.subject.id}
            x={(x0(r.subject.id) ?? 0) - (x0.step() - bw) / 2}
            width={x0.step()}
            height={ih + M.bottom}
            fill="transparent"
            onPointerEnter={() => onActive(r.subject.id)}
          />
        ))}
      </Group>
    </svg>
  );
}

/** The hovered gun's numbers, pinned to the chart's corner. */
export function GunCard({
  row,
  theories,
}: {
  row: TheoryRow;
  theories: Theories;
}) {
  const version = gunVersion(row.subject);
  const api = row.subject.apiBaseValue;
  const m = row.parts?.multiplier;
  const lines: [Mark | null, string, string, boolean | null][] = [
    ["measured", "Measured", row.measured ? span(row.measured) : "–", null],
    [
      "nested",
      "Nested",
      finite(row.nested) ? k(row.nested) : "–",
      fits(row, "nested"),
    ],
    [
      "flat",
      flatName(theories),
      finite(row.flat) ? k(row.flat) : "–",
      fits(row, "flat"),
    ],
    ["api", "API", finite(api) ? k(api) : "–", null],
  ];
  if (m) lines.push([null, "Parts multiplier", ratio(m), null]);
  return (
    <div className="pointer-events-none absolute bottom-14 right-4 w-60 rounded-lg border border-neutral-800 bg-neutral-950/90 p-3 text-xs shadow-2xl backdrop-blur">
      <p className="text-sm text-neutral-100">{gunName(row)}</p>
      {version && <p className="text-neutral-500">{version.tag}</p>}
      <dl className="mt-2.5 space-y-1.5 tabular-nums">
        {lines.map(([mark, label, value, ok]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-neutral-400">
              {mark ? <Glyph mark={mark} /> : <span className="w-3" />}
              {label}
            </dt>
            <dd className={ok === false ? "text-rose-300" : "text-neutral-100"}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
