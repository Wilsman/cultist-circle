// Build-time changelog core: every (non-merge) commit is a release, versioned
// from its message. Pure parsing/classification/bump logic lives here so it can
// be unit tested without touching git; scripts/generate-changelog.ts supplies
// the raw `git log` text and the milestone map.
//
//   milestone hash, "feat!:" or "BREAKING CHANGE" in body -> major bump
//   feat / add / implement / redesign / phase ...          -> minor bump
//   anything else                                        -> patch bump

export interface ChangelogEntry {
  version: string;
  hash: string;
  date: string;
  kind: string;
  scope: string | null;
  title: string;
  body: string[];
  milestone: string | null;
  files: number;
  insertions: number;
  deletions: number;
}

interface ClassifiedCommit {
  kind: string;
  scope: string | null;
  breaking: boolean;
  title: string;
}

// Subjects that look like a feature even without a conventional prefix.
// "add" needs a word boundary so "address"/"additional" don't count as feats.
const MINOR_WORDS =
  /^(add(ed|s|ing)?\b|implement|introduce|redesign|phase \d|expand|integrate)/i;

// Noise commits left out of the log entirely.
export const SKIP_PATTERNS: RegExp[] = [
  /^merge\b/i,
  /^auto-?commit/i,
  /\[skip (ci|changelog)\]/i,
];

// Attribution/sign-off trailers stripped from commit bodies.
const TRAILER =
  /^(Co-Authored-By|Signed-off-by|Reviewed-by|Acked-by|Tested-by|Approved-by|Suggested-by|Reported-by|Cc):/i;

// Manual release markers this repo appends to commit bodies ("[v2.1.2]").
const RELEASE_TAG = /^\[v?\d+\.\d+\.\d+\]$/i;

export function classifyCommit(subject: string): ClassifiedCommit {
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (m)
    return {
      kind: m[1].toLowerCase(),
      scope: m[2] ?? null,
      breaking: !!m[3],
      title: m[4],
    };
  const kind = MINOR_WORDS.test(subject)
    ? "feat"
    : /\bfix/i.test(subject)
      ? "fix"
      : /\bperf\b/i.test(subject)
        ? "perf"
        : "change";
  return { kind, scope: null, breaking: false, title: subject };
}

/**
 * Parse `git log --reverse --no-merges --shortstat
 * --format="%x1e%h%x1f%aI%x1f%s%x1f%b%x1f"` output into releases (newest first).
 */
export function buildChangelog(
  rawLog: string,
  milestones: Record<string, string> = {},
): ChangelogEntry[] {
  let [major, minor, patch] = [0, 0, 0];
  const out: ChangelogEntry[] = [];

  for (const record of rawLog.split("\x1e")) {
    if (!record.trim()) continue;
    // The diffstat is always the last \x1f field; rejoin the fields before it
    // so a stray delimiter in the body cannot silently drop the stat or body.
    const fields = record.split("\x1f");
    const stat = fields.length > 4 ? (fields.pop() as string) : "";
    const [hash, date, subject] = fields;
    if (!hash || !date) continue;
    const bodyRaw = fields.slice(3).join("\x1f");
    const trimmedSubject = (subject ?? "").trim();
    if (SKIP_PATTERNS.some((re) => re.test(trimmedSubject))) continue;

    const { kind, scope, breaking, title } = classifyCommit(trimmedSubject);
    // Milestone keys are abbreviated hashes; match by prefix so they keep
    // working if git's abbreviation length changes as the repo grows.
    const milestoneHash = Object.keys(milestones).find((m) =>
      hash.startsWith(m),
    );
    const milestone = milestoneHash ? milestones[milestoneHash] : null;

    if (milestone || breaking || /BREAKING CHANGE/.test(bodyRaw))
      [major, minor, patch] = [major + 1, 0, 0];
    else if (kind === "feat") [minor, patch] = [minor + 1, 0];
    else patch += 1;

    const body = bodyRaw
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter(
        (l) =>
          l.trim() && !TRAILER.test(l.trim()) && !RELEASE_TAG.test(l.trim()),
      );
    const num = (re: RegExp) => Number(stat.match(re)?.[1] ?? 0);

    out.push({
      version: `${major}.${minor}.${patch}`,
      hash,
      date: date.slice(0, 10),
      kind,
      scope,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      body,
      milestone,
      files: num(/(\d+) files? changed/),
      insertions: num(/(\d+) insertions?/),
      deletions: num(/(\d+) deletions?/),
    });
  }
  return out.reverse();
}
