// Small formatters and colours shared by the lab's test and results views.

import type { Range } from "@/lib/base-value-lab";
import type { GunVersionTone } from "@/lib/base-value-site";

export const mult = (n: number) =>
  n === Infinity ? "∞" : `${n.toFixed(n >= 10 ? 0 : 1)}×`;

export const k = (n: number) =>
  n === Infinity
    ? "∞"
    : n >= 1000
      ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`
      : String(Math.round(n));

/** "12k – 19k", or "350k+" when open-ended. */
export const span = (r: Range) =>
  r.hi === Infinity ? `${k(r.lo)}+` : `${k(r.lo)} – ${k(r.hi)}`;

export type Mark = "measured" | "nested" | "flat" | "api";

/** Series colours, shared by the charts and the glyphs. */
export const COLOR: Record<Mark, string> = {
  measured: "#fbbf24",
  nested: "#7dd3fc",
  flat: "#c4b5fd",
  api: "#9ca3af",
};

const MARK_CLASS: Record<Mark, string> = {
  measured: "h-1.5 w-3 rounded-full bg-amber-400",
  nested: "size-2.5 rounded-full bg-sky-300",
  flat: "size-2.5 rounded-full border-2 border-violet-300",
  api: "h-3 w-0.5 rounded-full bg-gray-400",
};

/** The marker a chart draws for a series, reused as a legend key. */
export function Glyph({ mark }: { mark: Mark }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 align-middle ${MARK_CLASS[mark]}`}
    />
  );
}

export const TONE: Record<GunVersionTone, string> = {
  stripped: "border-rose-400/60 bg-rose-500/15 text-rose-200",
  default: "border-sky-400/60 bg-sky-500/15 text-sky-200",
  build: "border-violet-400/60 bg-violet-500/15 text-violet-200",
  preset: "border-sky-400/60 bg-sky-500/15 text-sky-200",
};
