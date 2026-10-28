"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Repeat,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { k, TONE } from "./labels";
import { ResultsTable } from "./results-charts";
import { HiddenRule, TimerMeaning } from "./hidden-rule";
import { OtherTestForm, type OtherTest } from "./other-test-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchMinimalTarkovData,
  type MinimalItem,
} from "@/hooks/use-tarkov-api";
import {
  MAX_HIDEOUT_SKILL,
  TIMERS,
  TIMER_RANGES,
  parseState,
  solve,
  type LabMode,
  type LabTest,
  type Subject,
  type Timer,
} from "@/lib/base-value-lab";
import {
  buildFillerOptions,
  cheapestOffer,
  FLEA_UNLOCK_LEVEL,
  gunVersion,
  partsValue,
  type SiteFiller,
} from "@/lib/base-value-site";
import { pickTest, type PickedTest } from "@/lib/base-value-rule";
import { baseValueTestSchema } from "@/lib/base-value-submission";
import {
  type GameMode,
  isGameMode,
  toTarkovJsonGameMode,
} from "@/lib/game-mode";

const ENDPOINT = `${process.env.NODE_ENV === "development" ? "" : "https://cultist-circle-feedback.cultistcircle.workers.dev"}/api/base-value-lab`;
const PREFS_KEY = "base-value-lab:prefs";
const MODE_LABELS: Record<GameMode, string> = {
  pvp: "PvP",
  pve: "PvE",
  season: "PvP Season",
};
// Order of the game mode buttons.
const PLAYED_MODES: readonly GameMode[] = ["pve", "pvp", "season"];

type SharedTest = LabTest & { source?: string; contributor?: string };
type ApiBody = { success?: boolean; error?: string; data?: unknown };
interface Prefs {
  /** Game mode the tester plays, if they said. Optional. */
  played: GameMode | null;
  name: string;
  skill: string;
  /** Player level, to keep the flea out of suggestions until it unlocks. */
  level: string;
  /** Filler items the tester can't get, so suggestions avoid them. */
  blocked: string[];
}

async function copyName(name: string) {
  try {
    await navigator.clipboard.writeText(name);
    toast.success(`Copied "${name}"`);
  } catch {
    toast.error("Could not copy. Select the name by hand.");
  }
}

const rub = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₽`;
const timerLabel = (t: Timer) =>
  t === "6h"
    ? "6h (400k+)"
    : `${t} (${k(TIMER_RANGES[t][0])}–${k(TIMER_RANGES[t][1])})`;

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return {
      played:
        typeof raw.played === "string" && isGameMode(raw.played)
          ? raw.played
          : null,
      name: typeof raw.name === "string" ? raw.name : "",
      skill: typeof raw.skill === "string" ? raw.skill : "",
      level: typeof raw.level === "string" ? raw.level : "",
      blocked: Array.isArray(raw.blocked)
        ? raw.blocked.filter((id: unknown) => typeof id === "string")
        : [],
    };
  } catch {
    return { played: null, name: "", skill: "", level: "", blocked: [] };
  }
}

/** Name plus version, e.g. "HK MP5 (Navy 3 Round Burst) [Stripped]". */
function subjectLabel(subject?: Subject) {
  if (!subject) return "Unknown item";
  const version = gunVersion(subject);
  return version ? `${version.name} [${version.tag}]` : subject.name;
}

function describeTest(test: LabTest, subjects: Map<string, Subject>) {
  const parts = test.entries.map(
    (e) => `${e.qty}× ${subjectLabel(subjects.get(e.subjectId))}`,
  );
  for (const f of test.fillers) parts.push(`${f.qty}× ${f.name}`);
  return parts.join(" + ");
}

export function BaseValueLab() {
  const [prefs, setPrefs] = useState<Prefs>({
    played: null,
    name: "",
    skill: "",
    level: "",
    blocked: [],
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tests, setTests] = useState<SharedTest[]>([]);
  const [items, setItems] = useState<Partial<Record<GameMode, MinimalItem[]>>>(
    {},
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<Timer | null>(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("test");
  // Settings saved on an earlier visit start folded into one line.
  const [prefsFolded, setPrefsFolded] = useState(false);

  // localStorage only exists in the browser, so read it after hydration.
  useEffect(() => {
    const saved = loadPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(saved);
    setPrefsFolded(
      !!(saved.played || saved.name.trim() || saved.skill || saved.level),
    );
  }, []);
  const updatePrefs = (next: Partial<Prefs>) =>
    setPrefs((current) => {
      const merged = { ...current, ...next };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
      } catch {
        // Private mode: the choice just isn't remembered.
      }
      return merged;
    });

  const load = useCallback(async () => {
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      const body = (await response.json()) as ApiBody;
      if (!response.ok || !body?.success) throw new Error(body?.error);
      const raw = body.data as { subjects: Subject[]; tests: SharedTest[] };
      const ids = new Set(raw.subjects.map((s) => s.id));
      const usable = raw.tests.filter((t) =>
        t.entries?.every((e) => ids.has(e.subjectId)),
      );
      // Validates the rows the same way the local lab's import does.
      const state = parseState({
        version: 1,
        subjects: raw.subjects,
        tests: usable,
      });
      const extra = new Map(usable.map((t) => [t.id, t]));
      setSubjects(state.subjects);
      setTests(
        state.tests.map((t) => ({
          ...t,
          source: extra.get(t.id)?.source,
          contributor: extra.get(t.id)?.contributor,
        })),
      );
    } catch {
      setLoadError("Could not load the lab. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // State is only set after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const modes = useMemo(
    () =>
      (["pvp", "pve"] as const).filter((m) =>
        subjects.some((s) => s.mode === m),
      ),
    [subjects],
  );
  // The set of items under test. Base values don't change between modes, so
  // a tester's game mode only picks this when that mode has its own items.
  const played = prefs.played;
  const mode: LabMode =
    played && played !== "season" && modes.includes(played)
      ? played
      : (modes[0] ?? "pve");
  // Filler prices follow the mode the tester plays.
  const priceMode: GameMode = played ?? mode;
  useEffect(() => {
    if (items[priceMode]) return;
    let cancelled = false;
    fetchMinimalTarkovData(toTarkovJsonGameMode(priceMode), "en")
      .then((list) => {
        if (!cancelled)
          setItems((current) => ({ ...current, [priceMode]: list }));
      })
      .catch(() => {
        if (!cancelled)
          toast.error("Could not load item prices. Suggestions use none.");
        if (!cancelled)
          setItems((current) => ({ ...current, [priceMode]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [items, priceMode]);
  const modeSubjects = useMemo(
    () => subjects.filter((s) => s.mode === mode),
    [subjects, mode],
  );
  const modeTests = useMemo(
    () => tests.filter((t) => t.mode === mode),
    [tests, mode],
  );
  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );
  const results = useMemo(
    () =>
      solve(
        modeSubjects,
        modeTests.filter((t) => !t.excluded),
      ),
    [modeSubjects, modeTests],
  );
  const partsRows = useMemo(
    () =>
      modeSubjects.flatMap((s) => {
        const value = partsValue(s, results.get(s.id));
        return value ? [{ subject: s, value }] : [];
      }),
    [modeSubjects, results],
  );
  const itemById = useMemo(
    () => new Map((items[priceMode] ?? []).map((it) => [it.id, it])),
    [items, priceMode],
  );
  const playerLevel = prefs.level === "" ? undefined : Number(prefs.level);
  // The main calculator saves the trader levels here, on the same site.
  const [traderLevels, setTraderLevels] = useState<
    Record<string, number> | undefined
  >();
  useEffect(() => {
    try {
      const saved = localStorage.getItem("traderLevels");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setTraderLevels(JSON.parse(saved));
    } catch {
      // No saved levels: every trader offer stays allowed.
    }
  }, []);
  const fillers = useMemo(
    () =>
      buildFillerOptions(items[priceMode] ?? [], undefined, {
        playerLevel,
        traderLevels,
        blocked: new Set(prefs.blocked),
      }),
    [items, priceMode, playerLevel, traderLevels, prefs.blocked],
  );
  const next = useMemo(() => {
    if (!items[priceMode]) return null;
    return pickTest({
      subjects: modeSubjects,
      results,
      fillers,
      skip,
      copyCost: (s) => {
        const it = s.itemId ? itemById.get(s.itemId) : undefined;
        return (
          (it && cheapestOffer(it, { playerLevel, traderLevels })?.cost) ||
          50_000
        );
      },
    });
  }, [
    items,
    priceMode,
    modeSubjects,
    results,
    fillers,
    skip,
    itemById,
    playerLevel,
    traderLevels,
  ]);

  // A new suggestion starts with nothing picked.
  const planKey = next
    ? `${next.subject.id}:${next.plan.qty}:${next.plan.fillerTotal}`
    : "";
  // After a swap, say so when no other items fit and the next gun shows.
  const swappedFor = useRef<string | null>(null);
  useEffect(() => {
    const from = swappedFor.current;
    if (!from) return;
    swappedFor.current = null;
    if (next?.subject.id === from) return;
    const name = subjectLabel(subjectById.get(from));
    toast.info(
      next
        ? `No other items work for ${name}, so here is the next gun.`
        : `No other items work for ${name}.`,
    );
  }, [next, subjectById]);
  const [shownPlan, setShownPlan] = useState(planKey);
  if (shownPlan !== planKey) {
    setShownPlan(planKey);
    setTimer(null);
    setNotes("");
  }

  /** Sends a test to the shared lab. Resolves true once it is saved. */
  async function submit(test: {
    entries: { subjectId: string; qty: number }[];
    fillers: {
      itemId?: string;
      name: string;
      baseValue: number;
      qty: number;
    }[];
    timer: Timer;
    notes: string;
  }): Promise<boolean> {
    if (sending) return false;
    const skill = prefs.skill.trim() === "" ? undefined : Number(prefs.skill);
    const parsed = baseValueTestSchema.safeParse({
      testId: crypto.randomUUID(),
      mode,
      entries: test.entries,
      fillers: test.fillers.map(({ itemId, name, baseValue, qty }) => ({
        ...(itemId ? { itemId } : {}),
        name,
        baseValue,
        qty,
      })),
      timer: test.timer,
      ...(skill !== undefined ? { hideoutSkill: skill } : {}),
      ...(prefs.played ? { playedMode: prefs.played } : {}),
      ...(prefs.name.trim() ? { contributor: prefs.name.trim() } : {}),
      ...(test.notes.trim() ? { notes: test.notes.trim() } : {}),
    });
    if (!parsed.success) {
      toast.error(
        skill !== undefined && !(skill >= 0 && skill <= MAX_HIDEOUT_SKILL)
          ? `Hideout Management must be 0–${MAX_HIDEOUT_SKILL}.`
          : "That test could not be sent.",
      );
      return false;
    }
    setSending(true);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json().catch(() => null)) as ApiBody | null;
      if (response.status === 429)
        throw new Error(
          "Too many results at once. Wait a minute and try again.",
        );
      if (!response.ok || !body?.success)
        throw new Error(body?.error ?? "Could not save your result.");
      setTests((current) => [...current, body.data as SharedTest]);
      toast.success("Thanks! Result saved.");
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save your result.",
      );
      return false;
    } finally {
      setSending(false);
    }
  }

  function send() {
    if (!next || !timer) return;
    void submit({
      entries: [{ subjectId: next.subject.id, qty: next.plan.qty }],
      fillers: next.plan.fillers,
      timer,
      notes,
    });
  }

  const sendOther = (test: OtherTest) => submit(test);

  const prefsSummary = [
    prefs.played ? `Plays ${MODE_LABELS[prefs.played]}` : "Game mode not set",
    prefs.name.trim() ? `as ${prefs.name.trim()}` : null,
    prefs.skill ? `Hideout Management ${prefs.skill}` : null,
    prefs.level ? `level ${prefs.level}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const recent = useMemo(
    () =>
      [...tests]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [tests],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-gray-100 lg:max-w-6xl">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold">Base Value Lab</h1>
        <p className="max-w-3xl text-sm text-gray-400">
          The API gets some base values wrong (mostly guns). Each cultist circle
          timer tells us roughly what went in, so a few tests pin down the true
          value.
        </p>
      </header>

      {prefsFolded ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-700 bg-gray-900/70 px-4 py-2 text-sm text-gray-300">
          <span className="min-w-0 flex-1">{prefsSummary}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPrefsFolded(false)}
          >
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 rounded-xl border border-gray-700 bg-gray-900/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <fieldset className="space-y-1">
              <legend className="text-xs text-gray-400">
                Game mode you play (optional)
              </legend>
              <div className="flex gap-2">
                {PLAYED_MODES.map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={m === prefs.played ? "default" : "outline"}
                    aria-pressed={m === prefs.played}
                    onClick={() => {
                      updatePrefs({ played: m === prefs.played ? null : m });
                      setSkip(new Set());
                    }}
                  >
                    {MODE_LABELS[m]}
                  </Button>
                ))}
              </div>
            </fieldset>
            <label className="space-y-1 text-xs text-gray-400">
              Your name (optional)
              <Input
                value={prefs.name}
                maxLength={40}
                onChange={(e) => updatePrefs({ name: e.target.value })}
                placeholder="Shown next to your results"
              />
            </label>
            <label className="space-y-1 text-xs text-gray-400">
              Hideout Management level (optional)
              <Input
                value={prefs.skill}
                inputMode="numeric"
                onChange={(e) =>
                  updatePrefs({
                    skill: e.target.value.replace(/\D/g, "").slice(0, 2),
                  })
                }
                placeholder={`0–${MAX_HIDEOUT_SKILL}`}
              />
            </label>
            <label className="space-y-1 text-xs text-gray-400">
              Your player level (optional)
              <Input
                value={prefs.level}
                inputMode="numeric"
                onChange={(e) =>
                  updatePrefs({
                    level: e.target.value.replace(/\D/g, "").slice(0, 2),
                  })
                }
                placeholder={`Flea opens at level ${FLEA_UNLOCK_LEVEL}`}
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPrefsFolded(true)}
              >
                Done
              </Button>
            </div>
          </div>
        </>
      )}

      {loadError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-3 text-sm text-amber-200"
        >
          {loadError}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              void load();
            }}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent
          value="test"
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6"
        >
          {loading || !items[priceMode] ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-gray-400"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Working out the next
              test…
            </p>
          ) : !next ? (
            <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-900/70 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p>
                {skip.size > 0 || prefs.blocked.length > 0
                  ? "Nothing left that you can test with the items you can get."
                  : "Nothing left to test right now. Thank you!"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {skip.size > 0 && (
                  <Button variant="outline" onClick={() => setSkip(new Set())}>
                    Show the guns I skipped ({skip.size})
                  </Button>
                )}
                {prefs.blocked.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => updatePrefs({ blocked: [] })}
                  >
                    Bring back swapped items ({prefs.blocked.length})
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <TestCard
                key={planKey}
                next={next}
                fillers={fillers}
                onSwap={(itemId) => {
                  swappedFor.current = next.subject.id;
                  updatePrefs({ blocked: [...prefs.blocked, itemId] });
                }}
                timer={timer}
                onTimer={setTimer}
                notes={notes}
                onNotes={setNotes}
                sending={sending}
                onSend={send}
                onSkip={() =>
                  setSkip((current) => new Set(current).add(next.subject.id))
                }
              />
              <aside className="mt-6 space-y-3 rounded-xl border border-gray-700 bg-gray-900/70 p-5 lg:row-span-2 lg:mt-0">
                <h2 className="font-medium">What each timer tells us</h2>
                <p className="text-sm text-gray-400">
                  {next.rule
                    ? "This test is aimed at the hidden parts multiplier, so any result narrows it for every gun."
                    : "This test narrows this gun's true value."}
                </p>
                <TimerMeaning next={next} />
              </aside>
            </>
          )}
          {!loading && items[priceMode] && (
            <div className="lg:col-start-1">
              <OtherTestForm
                subjects={modeSubjects}
                items={items[priceMode]}
                sending={sending}
                onSubmit={sendOther}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <HiddenRule
            subjects={modeSubjects}
            results={results}
            partsRows={partsRows}
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
            <ResultsTable
              subjects={modeSubjects}
              results={results}
              partsRows={partsRows}
            />

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Latest tests</h2>
              <ul className="divide-y divide-gray-800 rounded-xl border border-gray-700 text-sm">
                {recent.map((t) => (
                  <li
                    key={t.id}
                    className={`flex gap-3 p-3 ${t.excluded ? "opacity-50" : ""}`}
                  >
                    <span className="w-12 shrink-0 font-semibold text-amber-300">
                      {t.timer}
                    </span>
                    <span className="min-w-0 flex-1">
                      {describeTest(t, subjectById)}
                      <span className="block text-xs text-gray-500">
                        {t.playedMode
                          ? MODE_LABELS[t.playedMode]
                          : t.source === "contributor"
                            ? "Mode not given"
                            : MODE_LABELS[t.mode]}{" "}
                        ·{" "}
                        {t.source === "contributor"
                          ? t.contributor || "Someone"
                          : "Owner"}{" "}
                        · {new Date(t.createdAt).toLocaleDateString()}
                        {t.excluded ? " · not counted" : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function TestCard({
  next,
  fillers,
  onSwap,
  timer,
  onTimer,
  notes,
  onNotes,
  sending,
  onSend,
  onSkip,
}: {
  next: PickedTest;
  fillers: SiteFiller[];
  /** Drops an item the tester can't get; the plan picks another. */
  onSwap: (itemId: string) => void;
  timer: Timer | null;
  onTimer: (t: Timer) => void;
  notes: string;
  onNotes: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onSkip: () => void;
}) {
  const { subject, plan } = next;
  const version = gunVersion(subject);
  const sourceOf = (itemId?: string) =>
    fillers.find((f) => f.itemId === itemId)?.source;
  return (
    <div className="space-y-5 rounded-xl border border-amber-400/30 bg-gray-900/70 p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-amber-300">
          Please test this
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Put exactly these in the circle, nothing else, and press sacrifice.
        </p>
        {version && version.tone !== "stripped" && (
          <p className="mt-1 text-sm text-gray-400">
            Bare gun frames already match the API. This test measures what the
            attached parts are really worth.
          </p>
        )}
      </div>
      <ul className="space-y-2">
        <li
          className={`rounded-lg p-3 ${version ? `border-2 ${TONE[version.tone]}` : "bg-gray-800/70"}`}
        >
          {version && (
            <span
              className={`mb-2 inline-block rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${TONE[version.tone]}`}
            >
              {version.tag} gun
            </span>
          )}
          <span className="block text-gray-100">
            <span className="font-semibold">{plan.qty}×</span>{" "}
            {version?.name ?? subject.name}
          </span>
          {version && (
            <span className="mt-1 block text-sm font-medium">
              {version.instruction}
            </span>
          )}
          {subject.durability !== undefined && (
            <span className="mt-1 block text-xs text-gray-400">
              {subject.durability}% durability
            </span>
          )}
          {version?.partsLabel && (
            <div className="mt-2 rounded-md bg-gray-950/50 p-2">
              <p className="text-xs font-semibold uppercase tracking-wide">
                {version.partsLabel}
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-200">
                {version.parts.map((p, i) => (
                  <li key={`${p.name}-${i}`}>
                    {p.count > 1 ? `${p.count}× ` : ""}
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
        {plan.fillers.map((f) => (
          <li
            key={f.itemId ?? f.name}
            className="rounded-lg bg-gray-800/70 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-semibold">{f.qty}×</span> {f.name}
                <span className="block text-xs text-gray-400">
                  {sourceOf(f.itemId) ?? "Buy"} · about {rub(f.cost)} each
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Copy name of ${f.name}`}
                  title="Copy the name to paste into the in-game search"
                  onClick={() => copyName(f.name)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {f.itemId && !f.owned && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    title="Can't get this one? Suggest a different item"
                    onClick={() => onSwap(f.itemId!)}
                  >
                    <Repeat className="mr-1 h-4 w-4" /> Swap
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {plan.fillerCost > 0 && (
        <p className="text-xs text-gray-500">
          Extra items cost about {rub(plan.fillerCost)} in total.
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 font-medium">What timer did you get?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIMERS.map((t) => (
            <Button
              key={t}
              type="button"
              variant={timer === t ? "default" : "outline"}
              aria-pressed={timer === t}
              onClick={() => onTimer(t)}
              className="h-auto flex-col py-2"
            >
              <span className="text-base font-semibold">{t}</span>
              <span className="text-[11px] opacity-70">
                {timerLabel(t).replace(/^\S+ /, "")}
              </span>
            </Button>
          ))}
        </div>
      </fieldset>

      <Input
        value={notes}
        maxLength={300}
        onChange={(e) => onNotes(e.target.value)}
        placeholder="Anything odd? (optional)"
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSend} disabled={!timer || sending}>
          {sending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Send result
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={sending}>
          <SkipForward className="mr-1 h-4 w-4" /> Can&apos;t do this one, next
          gun
        </Button>
      </div>
    </div>
  );
}
