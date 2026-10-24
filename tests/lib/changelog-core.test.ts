// @vitest-environment node
import { buildChangelog, classifyCommit, SKIP_PATTERNS } from "@/lib/changelog-core";

const ISO = "2026-01-05T10:00:00+00:00";

function rec(hash: string, subject: string, body = "", stat = "") {
  return `\x1e${hash}\x1f${ISO}\x1f${subject}\x1f${body}\x1f${stat}`;
}

const STAT = " 3 files changed, 10 insertions(+), 5 deletions(-)";

describe("classifyCommit", () => {
  it("parses conventional commits", () => {
    expect(classifyCommit("feat(recipes): add thing")).toEqual({
      kind: "feat",
      scope: "recipes",
      breaking: false,
      title: "add thing",
    });
    expect(classifyCommit("fix: a bug")).toMatchObject({
      kind: "fix",
      scope: null,
    });
  });

  it("flags breaking changes from a ! marker", () => {
    expect(classifyCommit("feat(api)!: drop endpoint").breaking).toBe(true);
    expect(classifyCommit("refactor!: rework internals").breaking).toBe(true);
  });

  it("falls back to keywords for non-conventional subjects", () => {
    expect(classifyCommit("Add a settings pane").kind).toBe("feat");
    expect(classifyCommit("Implement dark mode").kind).toBe("feat");
    expect(classifyCommit("Redesign the header").kind).toBe("feat");
    expect(classifyCommit("swapped inputs fix").kind).toBe("fix");
    expect(classifyCommit("speed up perf of the lookup").kind).toBe("perf");
    expect(classifyCommit("tweak spacing").kind).toBe("change");
  });
});

describe("buildChangelog", () => {
  it("bumps minor for feat and patch for everything else", () => {
    const log =
      rec("a000001", "feat: first") +
      rec("b000002", "fix: second") +
      rec("c000003", "chore: third") +
      rec("d000004", "feat: fourth");
    const entries = buildChangelog(log);
    // newest first
    expect(entries.map((e) => e.version)).toEqual([
      "0.2.0",
      "0.1.2",
      "0.1.1",
      "0.1.0",
    ]);
  });

  it("bumps major on ! and on BREAKING CHANGE in the body", () => {
    const log =
      rec("a000001", "feat!: redesign") +
      rec("b000002", "fix: later", "Some note\n\nBREAKING CHANGE: config moved");
    const entries = buildChangelog(log);
    expect(entries.map((e) => e.version)).toEqual(["2.0.0", "1.0.0"]);
    expect(entries[1].kind).toBe("feat");
  });

  it("bumps major on milestone hashes and records the era name", () => {
    const log =
      rec("a000001", "feat: before") +
      rec("b000002", "chore: the milestone commit") +
      rec("c000003", "feat: after");
    const entries = buildChangelog(log, { b000002: "Era two" });
    expect(entries.map((e) => e.version)).toEqual(["1.1.0", "1.0.0", "0.1.0"]);
    expect(entries[1].milestone).toBe("Era two");
    expect(entries[0].milestone).toBeNull();
  });

  it("matches milestone keys by hash prefix", () => {
    const entries = buildChangelog(rec("abc1234def", "feat: x"), {
      abc1234: "Era",
    });
    expect(entries[0].version).toBe("1.0.0");
    expect(entries[0].milestone).toBe("Era");
  });

  it("parses the shortstat diffstat", () => {
    const entries = buildChangelog(rec("a000001", "fix: x", "", STAT));
    expect(entries[0]).toMatchObject({
      files: 3,
      insertions: 10,
      deletions: 5,
    });
  });

  it("strips attribution trailers and blank lines from bodies", () => {
    const body = [
      "First note",
      "",
      "Second note",
      "Co-Authored-By: Dev <dev@example.com>",
      "Signed-off-by: Someone <s@example.com>",
    ].join("\n");
    const entries = buildChangelog(rec("a000001", "fix: x", body));
    expect(entries[0].body).toEqual(["First note", "Second note"]);
  });

  it("skips noise commits", () => {
    const log =
      rec("a000001", "feat: keep me") +
      rec("b000002", "Merge branch 'x' into main") +
      rec("c000003", "Auto-commit before deploy") +
      rec("d000004", "chore: bump deps [skip ci]");
    const entries = buildChangelog(log);
    expect(entries).toHaveLength(1);
    expect(entries[0].hash).toBe("a000001");
  });

  it("drops records without a subject", () => {
    const entries = buildChangelog(rec("a000001", ""));
    expect(entries[0].title).toBe("");
    expect(entries[0].kind).toBe("change");
  });

  it("capitalizes titles and slices the date", () => {
    const entries = buildChangelog(rec("a000001", "fix(ui): lowercase title"));
    expect(entries[0].title).toBe("Lowercase title");
    expect(entries[0].date).toBe("2026-01-05");
    expect(entries[0].scope).toBe("ui");
  });

  it("returns an empty list for empty input", () => {
    expect(buildChangelog("")).toEqual([]);
  });

  it("SKIP_PATTERNS stays narrow", () => {
    expect(SKIP_PATTERNS.some((re) => re.test("feat: real work"))).toBe(false);
  });
});
