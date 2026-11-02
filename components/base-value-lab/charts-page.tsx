"use client";

// The lab's charts on a page of their own: one large chart per section, a
// tab per chart, and a gun list that filters and highlights every chart.

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LabHeader } from "./lab-nav";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { fetchItemCatalog } from "@/hooks/use-tarkov-api";
import { solve } from "@/lib/base-value-lab";
import {
  compareTheories,
  type Catalog,
  type Theories,
  type TheoryRow,
} from "@/lib/base-value-rule";
import { gunVersion } from "@/lib/base-value-site";
import { type GameMode, toTarkovJsonGameMode } from "@/lib/game-mode";
import {
  finite,
  flatName,
  GunCard,
  MultiplierChart,
  PredictionChart,
  ratio,
  ValueChart,
} from "./charts";
import { fetchLab, labMode, loadPrefs } from "./lab-data";
import { Glyph, type Mark } from "./labels";

type Lab = Awaited<ReturnType<typeof fetchLab>> & { played: GameMode | null };

function useTheories() {
  const [lab, setLab] = useState<Lab | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    const played = loadPrefs().played;
    fetchLab().then(
      (data) => setLab({ ...data, played }),
      () => setError(true),
    );
    return played;
  }, []);
  useEffect(() => {
    // State is only set after the fetches resolve.
    const played = load();
    fetchItemCatalog(toTarkovJsonGameMode(played ?? "pve"))
      .catch(() => new Map())
      .then(setCatalog);
  }, [load]);
  const theories = useMemo(() => {
    if (!lab || !catalog) return null;
    const mode = labMode(lab.subjects, lab.played);
    const subjects = lab.subjects.filter((s) => s.mode === mode);
    const tests = lab.tests.filter((t) => t.mode === mode && !t.excluded);
    return compareTheories(subjects, solve(subjects, tests), catalog);
  }, [lab, catalog]);
  const retry = () => {
    setError(false);
    load();
  };
  return { theories, error, retry };
}

const SECTIONS = [
  { id: "value", title: "Value" },
  { id: "predictions", title: "Predictions" },
  { id: "multiplier", title: "Parts multiplier" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const charted = (r: TheoryRow) =>
  !!r.measured || finite(r.nested) || finite(r.flat) || !!r.parts?.multiplier;

export function BaseValueCharts() {
  const { theories, error, retry } = useTheories();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<{
    id: string;
    section: SectionId | null;
  } | null>(null);
  const [log, setLog] = useState(true);
  const [current, setCurrent] = useState<SectionId>("value");

  const guns = useMemo(() => theories?.rows.filter(charted) ?? [], [theories]);
  const shown = useMemo<Theories | null>(
    () =>
      theories && {
        ...theories,
        rows: guns.filter((r) => !hidden.has(r.subject.id)),
      },
    [theories, guns, hidden],
  );

  // The tab for the section in view.
  useEffect(() => {
    if (!shown) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.find((e) => e.isIntersecting);
        if (seen) setCurrent(seen.target.id as SectionId);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [shown]);

  const hoverFor = (section: SectionId) => ({
    active: hover?.id ?? null,
    onActive: (id: string | null) => setHover(id ? { id, section } : null),
  });
  const card = (section: SectionId) => {
    const row =
      hover?.section === section &&
      shown?.rows.find((r) => r.subject.id === hover.id);
    return row && shown ? <GunCard row={row} theories={shown} /> : null;
  };

  return (
    <div className="text-neutral-300">
      <div className="fixed inset-0 -z-10 bg-black" />
      {/* Same place as on the Test and Results pages. */}
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 lg:max-w-6xl">
        <LabHeader />
      </div>
      {/* Below the site nav (57px), which only stays put from sm up. */}
      <header
        className="sticky top-0 z-20 flex h-12 sm:top-[57px] items-center gap-6 overflow-x-auto border-b border-neutral-900 bg-black/85 px-4 backdrop-blur sm:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        <nav aria-label="Charts" className="flex h-full gap-5 text-sm">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={current === s.id ? "true" : undefined}
              className={`flex h-full items-center whitespace-nowrap border-b ${
                current === s.id
                  ? "border-neutral-100 text-neutral-100"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      {error ? (
        <Status>
          Could not load the lab.
          <button
            onClick={retry}
            className="inline-flex items-center gap-1.5 text-neutral-100 hover:underline"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </Status>
      ) : !shown ? (
        <Status>Loading…</Status>
      ) : !guns.length ? (
        <Status>No guns tested yet</Status>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            <Section
              id="value"
              title="Value"
              legend={[
                ["measured", "Measured"],
                ["nested", "Nested"],
                ["flat", flatName(shown)],
                ["api", "API"],
              ]}
              controls={
                <Toggle
                  options={[
                    [false, "Linear"],
                    [true, "Log"],
                  ]}
                  value={log}
                  onChange={setLog}
                />
              }
              card={card("value")}
            >
              <ValueChart theories={shown} log={log} {...hoverFor("value")} />
            </Section>
            <Section
              id="predictions"
              title="Predictions"
              legend={[
                ["measured", "Measured"],
                ["nested", "Nested"],
                ["flat", flatName(shown)],
                ["api", "API"],
              ]}
              card={card("predictions")}
            >
              <PredictionChart theories={shown} {...hoverFor("predictions")} />
            </Section>
            <Section
              id="multiplier"
              title="Parts multiplier"
              legend={[
                ["measured", "Measured"],
                ["flat", shown.band ? `Flat ${ratio(shown.band)}` : "Flat"],
              ]}
              card={card("multiplier")}
            >
              <MultiplierChart theories={shown} {...hoverFor("multiplier")} />
            </Section>
          </div>
          <aside className="border-t border-neutral-900 lg:border-l lg:border-t-0">
            <div className="p-4 sm:p-6 lg:sticky lg:top-[106px] lg:max-h-[calc(100vh-106px)] lg:overflow-y-auto lg:p-5">
              <GunList
                guns={guns}
                hidden={hidden}
                onHidden={setHidden}
                active={hover?.id ?? null}
                onActive={(id) => setHover(id ? { id, section: null } : null)}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p className="flex min-h-[60vh] items-center justify-center gap-4 text-sm text-neutral-500">
      {children}
    </p>
  );
}

function Section({
  id,
  title,
  legend,
  controls,
  card,
  children,
}: {
  id: SectionId;
  title: string;
  legend: [Mark, string][];
  controls?: ReactNode;
  card: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-12 border-b sm:scroll-mt-[106px] border-neutral-900 px-4 py-6 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="text-base font-medium text-neutral-100">{title}</h2>
        {controls}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        {legend.map(([mark, label]) => (
          <li key={mark} className="flex items-center gap-1.5">
            <Glyph mark={mark} />
            {label}
          </li>
        ))}
      </ul>
      <div className="relative mt-4 h-[min(68vh,640px)] min-h-[340px]">
        {children}
        {card}
      </div>
    </section>
  );
}

function Toggle<T>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-3 text-xs">
      {options.map(([option, label]) => (
        <button
          key={label}
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`border-b pb-1 ${
            value === option
              ? "border-neutral-100 text-neutral-100"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function GunList({
  guns,
  hidden,
  onHidden,
  active,
  onActive,
}: {
  guns: TheoryRow[];
  hidden: Set<string>;
  onHidden: (hidden: Set<string>) => void;
  active: string | null;
  onActive: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const listed = guns.filter((r) => r.subject.name.toLowerCase().includes(q));
  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (!next.delete(id)) next.add(id);
    onHidden(next);
  };
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-100">
          Guns
          <span className="ml-2 tabular-nums text-neutral-500">
            {guns.length - hidden.size}
          </span>
        </h2>
        {hidden.size > 0 && (
          <button
            onClick={() => onHidden(new Set())}
            aria-label="Show every gun"
            className="text-neutral-500 hover:text-neutral-100"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
      </div>
      <label className="relative mt-3 block">
        <Search className="absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find guns"
          aria-label="Find guns"
          className="w-full border-b border-neutral-800 bg-transparent py-2 pl-6 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-600"
        />
      </label>
      <ul className="mt-3 space-y-0.5" onPointerLeave={() => onActive(null)}>
        {listed.map((r) => {
          const id = r.subject.id;
          const off = hidden.has(id);
          const version = gunVersion(r.subject);
          return (
            <li key={id}>
              <button
                onClick={() => toggle(id)}
                onPointerEnter={() => onActive(off ? null : id)}
                aria-pressed={!off}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-900 ${
                  active === id ? "bg-neutral-900" : ""
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate ${off ? "text-neutral-600" : "text-neutral-200"}`}
                  >
                    {version?.name ?? r.subject.name}
                  </span>
                  {version && (
                    <span className="block text-xs text-neutral-500">
                      {version.tag}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${
                    off ? "border border-neutral-600" : "bg-neutral-200"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
