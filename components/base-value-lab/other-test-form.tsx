"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MinimalItem } from "@/hooks/use-tarkov-api";
import { TIMERS, type Subject, type Timer } from "@/lib/base-value-lab";
import { gunVersion } from "@/lib/base-value-site";

export interface OtherTest {
  entries: { subjectId: string; qty: number }[];
  fillers: { itemId: string; name: string; baseValue: number; qty: number }[];
  timer: Timer;
  notes: string;
}

const MAX_ENTRIES = 5;
const MAX_FILLERS = 10;
const MAX_QTY = 20;

const subjectLabel = (s: Subject) => {
  const version = gunVersion(s);
  return version ? `${version.name} (${version.tag})` : s.name;
};

const clampQty = (value: string) =>
  Math.min(MAX_QTY, Math.max(1, Math.floor(Number(value)) || 1));

function QtyInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (qty: number) => void;
  label: string;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      max={MAX_QTY}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(clampQty(e.target.value))}
      className="w-16 shrink-0"
    />
  );
}

/**
 * For a tester who sacrificed something other than the suggested test (or lost
 * the card, for instance by refreshing the page): they say exactly what went
 * into the circle and what timer they got.
 */
export function OtherTestForm({
  subjects,
  items,
  sending,
  onSubmit,
}: {
  subjects: Subject[];
  items: readonly MinimalItem[];
  sending: boolean;
  onSubmit: (test: OtherTest) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<{ subjectId: string; qty: number }[]>(
    [],
  );
  const [fillers, setFillers] = useState<OtherTest["fillers"]>([]);
  const [search, setSearch] = useState("");
  const [timer, setTimer] = useState<Timer | null>(null);
  const [notes, setNotes] = useState("");

  const options = useMemo(
    () =>
      subjects
        .map((s) => ({ id: s.id, label: subjectLabel(s) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [subjects],
  );

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    const taken = new Set(fillers.map((f) => f.itemId));
    return items
      .filter(
        (it) =>
          it.basePrice > 0 &&
          !taken.has(it.id) &&
          (it.name.toLowerCase().includes(query) ||
            it.shortName.toLowerCase().includes(query)),
      )
      .slice(0, 6);
  }, [items, search, fillers]);

  const ready = entries.length > 0 && timer !== null;

  function reset() {
    setEntries([]);
    setFillers([]);
    setSearch("");
    setTimer(null);
    setNotes("");
    setOpen(false);
  }

  async function send() {
    if (!ready || !timer || sending) return;
    const saved = await onSubmit({ entries, fillers, timer, notes });
    if (saved) reset();
  }

  if (!open) {
    return (
      <div className="mt-4">
        <Button variant="outline" onClick={() => setOpen(true)}>
          I did a different test
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-5 rounded-xl border border-gray-700 bg-gray-900/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">I did a different test</p>
          <p className="mt-1 text-sm text-gray-400">
            Say exactly what you put in the circle and the timer you got.
            Include everything that was in there.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Items being tested</h3>
        <p className="text-xs text-gray-400">
          Guns say whether they were stripped, Default or a custom build.
        </p>
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-2">
            <select
              aria-label="Item"
              value={entry.subjectId}
              onChange={(e) =>
                setEntries((current) =>
                  current.map((c, j) =>
                    j === i ? { ...c, subjectId: e.target.value } : c,
                  ),
                )
              }
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-gray-900 px-2 text-sm"
            >
              {options.map((o) => (
                <option
                  key={o.id}
                  value={o.id}
                  disabled={
                    o.id !== entry.subjectId &&
                    entries.some((c) => c.subjectId === o.id)
                  }
                >
                  {o.label}
                </option>
              ))}
            </select>
            <QtyInput
              label="Quantity"
              value={entry.qty}
              onChange={(qty) =>
                setEntries((current) =>
                  current.map((c, j) => (j === i ? { ...c, qty } : c)),
                )
              }
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove item"
              onClick={() =>
                setEntries((current) => current.filter((_, j) => j !== i))
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {entries.length < MAX_ENTRIES && options.length > entries.length && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const free = options.find(
                (o) => !entries.some((c) => c.subjectId === o.id),
              );
              if (free)
                setEntries((current) => [
                  ...current,
                  { subjectId: free.id, qty: 1 },
                ]);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add a tested item
          </Button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Any other items in the circle</h3>
        {fillers.map((f) => (
          <div key={f.itemId} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
            <QtyInput
              label={`Quantity of ${f.name}`}
              value={f.qty}
              onChange={(qty) =>
                setFillers((current) =>
                  current.map((c) =>
                    c.itemId === f.itemId ? { ...c, qty } : c,
                  ),
                )
              }
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${f.name}`}
              onClick={() =>
                setFillers((current) =>
                  current.filter((c) => c.itemId !== f.itemId),
                )
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {fillers.length < MAX_FILLERS && (
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for an item to add"
            aria-label="Search for an item"
          />
        )}
        {matches.length > 0 && (
          <ul className="overflow-hidden rounded-md border border-gray-700">
            {matches.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-800"
                  onClick={() => {
                    setFillers((current) => [
                      ...current,
                      {
                        itemId: it.id,
                        name: it.name,
                        baseValue: Math.round(it.basePrice),
                        qty: 1,
                      },
                    ]);
                    setSearch("");
                  }}
                >
                  {it.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">
          What timer did you get?
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {TIMERS.map((t) => (
            <Button
              key={t}
              type="button"
              variant={timer === t ? "default" : "outline"}
              aria-pressed={timer === t}
              onClick={() => setTimer(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </fieldset>

      <Input
        value={notes}
        maxLength={300}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything odd? (optional)"
      />

      <Button onClick={() => void send()} disabled={!ready || sending}>
        {sending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
        Send result
      </Button>
    </div>
  );
}
