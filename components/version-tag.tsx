"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Portal as HoverCardPortal } from "@radix-ui/react-hover-card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CURRENT_VERSION, LAST_UPDATED } from "@/config/changelog";
import { latestRelease } from "@/config/generated/latest";
import type { ChangelogEntry } from "@/lib/changelog-core";
import { useLanguage } from "@/contexts/language-context";

const KIND_STYLES: Record<string, { label: string; className: string }> = {
  feat: {
    label: "NEW",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  fix: {
    label: "FIX",
    className: "border-red-500/30 bg-red-500/15 text-red-300",
  },
  perf: {
    label: "PERF",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
  refactor: {
    label: "REFAC",
    className: "border-purple-500/30 bg-purple-500/15 text-purple-300",
  },
  docs: {
    label: "DOCS",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  },
  test: {
    label: "TEST",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  },
  chore: {
    label: "CHORE",
    className: "border-slate-600/30 bg-slate-600/15 text-slate-400",
  },
  style: {
    label: "STYLE",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-400",
  },
  ci: {
    label: "CI",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-400",
  },
};

const kindStyle = (kind: string) =>
  KIND_STYLES[kind] ?? {
    label: kind.slice(0, 5).toUpperCase() || "TWEAK",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  };

function KindChip({ kind }: { kind: string }) {
  const { label, className } = kindStyle(kind);
  return (
    <span
      className={`inline-block w-12 shrink-0 rounded border px-1 py-0.5 text-center text-[10px] font-semibold tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}

function Diffstat({ entry }: { entry: ChangelogEntry }) {
  const { t } = useLanguage();
  if (!entry.files) return null;
  return (
    <span className="tabular-nums text-slate-500">
      {entry.files} {t(entry.files === 1 ? "file" : "files")} ·{" "}
      <span className="text-emerald-400">+{entry.insertions}</span>{" "}
      <span className="text-red-400">−{entry.deletions}</span>
    </span>
  );
}

// Format date from YYYY-MM-DD to a readable format. Parsed as a local date:
// `new Date("YYYY-MM-DD")` is UTC midnight and renders a day early in
// negative-offset timezones.
function formatDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

const isDev = process.env.NODE_ENV === "development";

/**
 * Commit-derived version pill. Hover (desktop) shows the latest release;
 * click/tap opens the full changelog dialog. Falls back to the manually
 * maintained CURRENT_VERSION when no git history was available at build time.
 */
export function VersionTag() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
  const loadStarted = useRef(false);

  // The full changelog is a separate chunk, fetched on first interaction.
  const loadChangelog = useCallback(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    void import("@/config/generated/changelog")
      .then((mod) => setEntries(mod.changelog))
      .catch(() => setEntries([]));
  }, []);

  const openDialog = () => {
    loadChangelog();
    setOpen(true);
  };

  if (!latestRelease) {
    return (
      <div className="inline-flex items-center gap-3 justify-center">
        <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-200 shadow-sm">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />v
          {CURRENT_VERSION}
          {isDev ? "-dev" : ""}
        </span>
        <span className="text-xs text-slate-400" suppressHydrationWarning>
          {t("Last updated: {date}", { date: formatDate(LAST_UPDATED) })}
        </span>
      </div>
    );
  }

  const version = `v${latestRelease.version}${isDev ? "-dev" : ""}`;

  return (
    <div className="inline-flex items-center gap-3 justify-center">
      <HoverCard
        openDelay={120}
        closeDelay={80}
        onOpenChange={(hoverOpen) => {
          if (hoverOpen) loadChangelog();
        }}
      >
        <HoverCardTrigger asChild>
          <button
            type="button"
            data-testid="version-tag"
            aria-haspopup="dialog"
            onClick={openDialog}
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-200 shadow-sm transition hover:border-emerald-500/50 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {version}
          </button>
        </HoverCardTrigger>
        {/* Portal so the card ignores the header's centring and opens
            below the pill instead of over the logo. */}
        <HoverCardPortal>
          <HoverCardContent
            side="bottom"
            align="center"
            collisionPadding={8}
            className="w-80 border-slate-700 bg-slate-900 p-3 text-left text-slate-200"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-emerald-300">{version}</span>
              <span className="font-mono text-slate-500">
                {latestRelease.hash} · {latestRelease.date}
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-sm leading-snug">
              <KindChip kind={latestRelease.kind} />
              <span>{latestRelease.title}</span>
            </div>
            {latestRelease.body.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-0.5 overflow-hidden text-xs text-slate-400">
                {latestRelease.body.slice(0, 6).map((line, i) => (
                  <li key={i} className="whitespace-pre-wrap">
                    {line}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-700/60 pt-2 text-[11px]">
              <Diffstat entry={latestRelease} />
              <span className="ml-auto text-emerald-400/80">
                {t("Click for full changelog")} ▸
              </span>
            </div>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>
      <span className="text-xs text-slate-400" suppressHydrationWarning>
        {t("Last updated: {date}", { date: formatDate(latestRelease.date) })}
      </span>
      <ChangelogDialog open={open} onOpenChange={setOpen} entries={entries} />
    </div>
  );
}

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ChangelogEntry[] | null;
}

function ChangelogDialog({
  open,
  onOpenChange,
  entries,
}: ChangelogDialogProps) {
  const { t } = useLanguage();
  // The newest release starts expanded; latestRelease is the same entry.
  const [expanded, setExpanded] = useState<string | null>(
    latestRelease?.hash ?? null,
  );

  // Group releases by major version so each era gets a header.
  const eras = useMemo(() => {
    const groups: {
      major: string;
      name: string | null;
      entries: ChangelogEntry[];
    }[] = [];
    for (const entry of entries ?? []) {
      const major = entry.version.split(".")[0];
      let group = groups[groups.length - 1];
      if (!group || group.major !== major)
        groups.push((group = { major, name: null, entries: [] }));
      group.entries.push(entry);
      if (entry.milestone) group.name = entry.milestone;
    }
    return groups;
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 border-slate-700 bg-slate-900 p-0 text-slate-200">
        <DialogHeader className="border-b border-slate-700/60 px-5 py-4 text-left">
          <DialogTitle className="text-sm font-semibold tracking-wide text-slate-100">
            {t("Changelog")}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {entries
              ? t(
                  "{count} releases, one per commit. Click a release to see what changed.",
                  { count: entries.length },
                )
              : t("Loading...")}
          </DialogDescription>
        </DialogHeader>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"
          data-testid="changelog-list"
        >
          {entries === null && (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              {t("Loading...")}
            </p>
          )}
          {eras.map((era) => (
            <section key={era.major}>
              <h3 className="sticky top-0 z-10 -mx-3 border-b border-slate-700/40 bg-slate-900/95 px-5 py-2 text-[11px] font-semibold tracking-widest text-emerald-300 backdrop-blur">
                V{era.major}
                {era.name && (
                  <span className="ml-2 text-xs font-normal tracking-normal text-slate-400">
                    {era.name}
                  </span>
                )}
              </h3>
              <ul>
                {era.entries.map((entry) => (
                  <ChangelogRow
                    key={entry.hash}
                    entry={entry}
                    open={expanded === entry.hash}
                    onToggle={() =>
                      setExpanded((cur) =>
                        cur === entry.hash ? null : entry.hash,
                      )
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChangelogRow({
  entry,
  open,
  onToggle,
}: {
  entry: ChangelogEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  return (
    <li className="border-b border-slate-700/40 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded px-2 py-2 text-left transition hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
      >
        <span className="w-16 shrink-0 font-mono text-xs text-emerald-300/90">
          v{entry.version}
        </span>
        <KindChip kind={entry.kind} />
        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
          {entry.title}
        </span>
        <span className="hidden shrink-0 font-mono text-[11px] text-slate-500 sm:inline">
          {entry.date}
        </span>
      </button>
      {open && (
        <div className="mb-2 ml-[5.5rem] mr-2 space-y-2 border-l border-emerald-500/20 pl-3 text-xs">
          {entry.milestone && (
            <p className="font-semibold tracking-wider text-emerald-300">
              ★ {t("Milestone")} · {entry.milestone}
            </p>
          )}
          {entry.scope && (
            <p className="text-slate-500">
              {t("Scope: {scope}", { scope: entry.scope })}
            </p>
          )}
          {entry.body.length > 0 ? (
            <ul className="space-y-0.5 text-slate-300">
              {entry.body.map((line, i) => (
                <li key={i} className="whitespace-pre-wrap">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">{entry.title}</p>
          )}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-emerald-400/70">{entry.hash}</span>
            <span className="font-mono text-slate-500 sm:hidden">
              {entry.date}
            </span>
            <Diffstat entry={entry} />
          </p>
        </div>
      )}
    </li>
  );
}
