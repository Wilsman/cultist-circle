"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type SubjectResult,
  type Timer,
} from "@/lib/base-value-lab";
import {
  buildFillerOptions,
  cheapestOffer,
  pickNextTest,
  type SiteFiller,
} from "@/lib/base-value-site";
import { baseValueTestSchema } from "@/lib/base-value-submission";

const ENDPOINT = `${process.env.NODE_ENV === "development" ? "" : "https://cultist-circle-feedback.cultistcircle.workers.dev"}/api/base-value-lab`;
const PREFS_KEY = "base-value-lab:prefs";
const MODE_LABELS: Record<LabMode, string> = { pvp: "PvP", pve: "PvE" };

type SharedTest = LabTest & { source?: string; contributor?: string };
type ApiBody = { success?: boolean; error?: string; data?: unknown };
interface Prefs {
  mode: LabMode;
  name: string;
  skill: string;
}

const k = (n: number) =>
  n === Infinity
    ? "∞"
    : n >= 1000
      ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`
      : String(Math.round(n));
const rub = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₽`;
const timerLabel = (t: Timer) =>
  t === "6h"
    ? "6h (400k+)"
    : `${t} (${k(TIMER_RANGES[t][0])}–${k(TIMER_RANGES[t][1])})`;

const STATUS: Record<
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

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return {
      mode: raw.mode === "pvp" ? "pvp" : "pve",
      name: typeof raw.name === "string" ? raw.name : "",
      skill: typeof raw.skill === "string" ? raw.skill : "",
    };
  } catch {
    return { mode: "pve", name: "", skill: "" };
  }
}

function describeTest(test: LabTest, subjects: Map<string, Subject>) {
  const parts = test.entries.map(
    (e) => `${e.qty}× ${subjects.get(e.subjectId)?.name ?? "Unknown item"}`,
  );
  for (const f of test.fillers) parts.push(`${f.qty}× ${f.name}`);
  return parts.join(" + ");
}

export function BaseValueLab() {
  const [prefs, setPrefs] = useState<Prefs>({
    mode: "pve",
    name: "",
    skill: "",
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tests, setTests] = useState<SharedTest[]>([]);
  const [items, setItems] = useState<Partial<Record<LabMode, MinimalItem[]>>>(
    {},
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<Timer | null>(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  // localStorage only exists in the browser, so read it after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPrefs(loadPrefs()), []);
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

  const mode = prefs.mode;
  useEffect(() => {
    if (items[mode]) return;
    let cancelled = false;
    fetchMinimalTarkovData(mode === "pve" ? "pve" : "regular", "en")
      .then((list) => {
        if (!cancelled) setItems((current) => ({ ...current, [mode]: list }));
      })
      .catch(() => {
        if (!cancelled)
          toast.error("Could not load item prices. Suggestions use none.");
        if (!cancelled) setItems((current) => ({ ...current, [mode]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [items, mode]);

  const modes = useMemo(
    () =>
      (["pvp", "pve"] as const).filter((m) =>
        subjects.some((s) => s.mode === m),
      ),
    [subjects],
  );
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
  const itemById = useMemo(
    () => new Map((items[mode] ?? []).map((it) => [it.id, it])),
    [items, mode],
  );
  const fillers = useMemo(
    () => buildFillerOptions(items[mode] ?? []),
    [items, mode],
  );
  const next = useMemo(() => {
    if (!items[mode]) return null;
    return pickNextTest({
      subjects: modeSubjects,
      results,
      fillers,
      skip,
      copyCost: (s) => {
        const it = s.itemId ? itemById.get(s.itemId) : undefined;
        return (it && cheapestOffer(it)?.cost) || 50_000;
      },
    });
  }, [items, mode, modeSubjects, results, fillers, skip, itemById]);

  // A new suggestion starts with nothing picked.
  const planKey = next
    ? `${next.subject.id}:${next.plan.qty}:${next.plan.fillerTotal}`
    : "";
  const [shownPlan, setShownPlan] = useState(planKey);
  if (shownPlan !== planKey) {
    setShownPlan(planKey);
    setTimer(null);
    setNotes("");
  }

  async function send() {
    if (!next || !timer || sending) return;
    const skill = prefs.skill.trim() === "" ? undefined : Number(prefs.skill);
    const parsed = baseValueTestSchema.safeParse({
      testId: crypto.randomUUID(),
      mode,
      entries: [{ subjectId: next.subject.id, qty: next.plan.qty }],
      fillers: next.plan.fillers.map(({ itemId, name, baseValue, qty }) => ({
        ...(itemId ? { itemId } : {}),
        name,
        baseValue,
        qty,
      })),
      timer,
      ...(skill !== undefined ? { hideoutSkill: skill } : {}),
      ...(prefs.name.trim() ? { contributor: prefs.name.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    if (!parsed.success) {
      toast.error(
        skill !== undefined && !(skill >= 0 && skill <= MAX_HIDEOUT_SKILL)
          ? `Hideout Management must be 0–${MAX_HIDEOUT_SKILL}.`
          : "That test could not be sent.",
      );
      return;
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save your result.",
      );
    } finally {
      setSending(false);
    }
  }

  const recent = useMemo(
    () =>
      [...tests]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 25),
    [tests],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-gray-100">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold">Base Value Lab</h1>
        <p className="text-sm text-gray-400">
          The API gets some base values wrong (mostly guns). Each cultist circle
          timer tells us roughly what went in, so a few tests pin down the true
          value.
        </p>
      </header>

      <div className="mb-6 grid gap-3 rounded-xl border border-gray-700 bg-gray-900/70 p-4 sm:grid-cols-3">
        <fieldset className="space-y-1">
          <legend className="text-xs text-gray-400">Game mode</legend>
          <div className="flex gap-2">
            {(modes.length ? modes : (["pve"] as const)).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={m === mode ? "default" : "outline"}
                onClick={() => {
                  updatePrefs({ mode: m });
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
      </div>

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

      <Tabs defaultValue="test">
        <TabsList>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="test">
          {loading || !items[mode] ? (
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
                Nothing left to test in {MODE_LABELS[mode]} right now. Thank
                you!
              </p>
              {skip.size > 0 && (
                <Button variant="outline" onClick={() => setSkip(new Set())}>
                  Show the ones I skipped
                </Button>
              )}
            </div>
          ) : (
            <TestCard
              key={planKey}
              next={next}
              fillers={fillers}
              timer={timer}
              onTimer={setTimer}
              notes={notes}
              onNotes={setNotes}
              sending={sending}
              onSend={() => void send()}
              onSkip={() =>
                setSkip((current) => new Set(current).add(next.subject.id))
              }
            />
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">
              What we know ({MODE_LABELS[mode]})
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/80 text-left text-xs text-gray-400">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">True value</th>
                    <th className="p-2">API says</th>
                    <th className="p-2">Tests</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modeSubjects.map((s) => {
                    const r = results.get(s.id);
                    const status = STATUS[r?.status ?? "untested"];
                    const tested =
                      r && r.testCount > 0 && r.status !== "conflict";
                    return (
                      <tr
                        key={s.id}
                        className="border-t border-gray-800 align-top"
                      >
                        <td className="p-2">{s.name}</td>
                        <td className="whitespace-nowrap p-2">
                          {tested ? `${k(r.range.lo)} – ${k(r.range.hi)}` : "?"}
                        </td>
                        <td className="whitespace-nowrap p-2 text-gray-400">
                          {s.apiBaseValue !== undefined
                            ? k(s.apiBaseValue)
                            : "–"}
                        </td>
                        <td className="p-2">{r?.testCount ?? 0}</td>
                        <td className="p-2">
                          <span
                            className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-xs ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

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
                      {MODE_LABELS[t.mode]} ·{" "}
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
        </TabsContent>
      </Tabs>
    </main>
  );
}

function TestCard({
  next,
  fillers,
  timer,
  onTimer,
  notes,
  onNotes,
  sending,
  onSend,
  onSkip,
}: {
  next: NonNullable<ReturnType<typeof pickNextTest>>;
  fillers: SiteFiller[];
  timer: Timer | null;
  onTimer: (t: Timer) => void;
  notes: string;
  onNotes: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onSkip: () => void;
}) {
  const { subject, plan } = next;
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
      </div>
      <ul className="space-y-2">
        <li className="rounded-lg bg-gray-800/70 p-3">
          <span className="font-semibold">{plan.qty}×</span> {subject.name}
          <span className="block text-xs text-gray-400">
            {subject.durability !== undefined
              ? `${subject.durability}% durability`
              : ""}
            {subject.build ? " · build it from the bare gun with:" : ""}
          </span>
          {subject.build && (
            <ul className="mt-1 list-disc pl-5 text-xs text-gray-300">
              {subject.build.mods.map((m) => (
                <li key={m.itemId ?? m.name}>
                  {m.count > 1 ? `${m.count}× ` : ""}
                  {m.name}
                </li>
              ))}
            </ul>
          )}
        </li>
        {plan.fillers.map((f) => (
          <li
            key={f.itemId ?? f.name}
            className="rounded-lg bg-gray-800/70 p-3"
          >
            <span className="font-semibold">{f.qty}×</span> {f.name}
            <span className="block text-xs text-gray-400">
              {sourceOf(f.itemId) ?? "Buy"} · about {rub(f.cost)} each
            </span>
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
          <SkipForward className="mr-1 h-4 w-4" /> Can&apos;t do this one
        </Button>
      </div>
    </div>
  );
}
