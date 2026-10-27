// Small formatters and labels shared by the lab's test and results views.

import type { Range, Subject, SubjectResult } from "@/lib/base-value-lab";
import { gunVersion, type GunVersionTone } from "@/lib/base-value-site";

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

/** "1.5–2.2×", or "≤2.2×" / "≥5×" when one end is open. */
export function ratioSpan(r: Range, by = 1) {
  if (r.hi === Infinity) return `≥${mult(r.lo / by)}`;
  if (r.lo <= 0) return `≤${mult(r.hi / by)}`;
  return `${(r.lo / by).toFixed(1)}–${mult(r.hi / by)}`;
}

export const STATUS: Record<
  SubjectResult["status"],
  { label: string; className: string }
> = {
  untested: { label: "Not tested", className: "border-gray-600 text-gray-300" },
  open: { label: "Narrowing", className: "border-sky-500/50 text-sky-300" },
  "needs-confirmation": {
    label: "Needs a re-check",
    className: "border-amber-500/50 text-amber-300",
  },
  confident: {
    label: "Done",
    className: "border-emerald-500/50 text-emerald-300",
  },
  "too-high": {
    label: "Above 350k",
    className: "border-purple-500/50 text-purple-300",
  },
  conflict: {
    label: "Results disagree",
    className: "border-red-500/50 text-red-300",
  },
};

export const TONE: Record<GunVersionTone, string> = {
  stripped: "border-rose-400/60 bg-rose-500/15 text-rose-200",
  default: "border-sky-400/60 bg-sky-500/15 text-sky-200",
  build: "border-violet-400/60 bg-violet-500/15 text-violet-200",
  preset: "border-sky-400/60 bg-sky-500/15 text-sky-200",
};

export function VersionTag({ subject }: { subject: Subject }) {
  const version = gunVersion(subject);
  if (!version) return null;
  return (
    <span
      className={`ml-2 inline-block whitespace-nowrap rounded-md border px-1.5 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wide ${TONE[version.tone]}`}
    >
      {version.tag}
    </span>
  );
}

/** Short one-line name for chart labels, e.g. "TOZ-106 · Default". */
export function shortLabel(subject: Subject) {
  const version = gunVersion(subject);
  return version ? `${version.name} · ${version.tag}` : subject.name;
}
