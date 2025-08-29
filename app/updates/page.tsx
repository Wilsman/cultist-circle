import Link from "next/link";
import { CHANGELOG, CURRENT_VERSION, KNOWN_ISSUES } from "@/config/changelog";

export const metadata = {
  title: "What’s New | Cultist Circle",
  description: "Latest changes, fixes, and upcoming features.",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function UpdatesPage() {
  const knownIssues = KNOWN_ISSUES;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-white to-slate-100">
          What’s New
        </h1>
        <Link
          href="/"
          className="text-sm text-slate-300 hover:text-slate-100 underline underline-offset-4 decoration-dotted"
        >
          ← Back
        </Link>
      </header>

      <section className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Current Release: v{CURRENT_VERSION}
        </div>
      </section>

      {knownIssues.length ? (
        <section className="mb-10 rounded-2xl border border-rose-700/50 bg-rose-900/10 p-5">
          <h2 className="mb-3 text-base font-semibold text-rose-300 flex items-center gap-2">
            <span>🚨</span>
            <span>Known Issues</span>
          </h2>
          <ul className="text-sm text-slate-200 space-y-2">
            {knownIssues.map((k, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-300">•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="space-y-8">
        {CHANGELOG.map((entry) => (
          <article
            key={entry.version}
            className="rounded-2xl border border-slate-700/60 bg-slate-900/40 backdrop-blur-sm p-5"
          >
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">
                v{entry.version}
              </h2>
              <time className="text-xs text-slate-400">
                {formatDate(entry.date)}
              </time>
            </header>

            {entry.highlights?.length ? (
              <section className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-yellow-300 flex items-center gap-2">
                  <span>✨</span>
                  <span>Highlights</span>
                </h3>
                <ul className="text-sm text-slate-200 space-y-2">
                  {entry.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {entry.upcoming?.length ? (
              <section className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-sky-300 flex items-center gap-2">
                  <span>🚀</span>
                  <span>Upcoming</span>
                </h3>
                <ul className="text-sm text-slate-200 space-y-2">
                  {entry.upcoming.map((u, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-sky-300">•</span>
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {entry.knownIssues?.length ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-rose-300 flex items-center gap-2">
                  <span>🚨</span>
                  <span>Known Issues</span>
                </h3>
                <ul className="text-sm text-slate-200 space-y-2">
                  {entry.knownIssues.map((k, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-rose-300">•</span>
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        ))}

        <p className="text-center text-sm text-pink-300/90">
          Thanks for all the feedback and support! ❤️
        </p>
      </div>
    </div>
  );
}
