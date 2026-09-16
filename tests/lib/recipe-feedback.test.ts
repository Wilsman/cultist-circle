import { describe, expect, it } from "vitest";
import {
  applyModeVote,
  applyUserVote,
  formatCompactRecency,
  formatLastWorkedDetail,
  formatLatestReport,
  formatRecency,
  formatReportStatus,
  getLatestReport,
  getModeLatestSignal,
  getUnspecifiedModeCounts,
  isRecipeFeedbackStats,
  isRecipeRecentlyActive,
  isUserModeMap,
  isUserVoteMap,
} from "@/lib/recipe-feedback";
import type {
  RecipeFeedbackModeBreakdown,
  RecipeFeedbackStats,
} from "@/types/recipe-feedback";

describe("recipe-feedback utilities", () => {
  describe("isUserVoteMap", () => {
    it("validates valid vote maps", () => {
      expect(
        isUserVoteMap({ "recipe-1": "worked", "recipe-2": "didnt_work" }),
      ).toBe(true);
      expect(isUserVoteMap({})).toBe(true);
    });

    it("rejects invalid vote maps", () => {
      expect(isUserVoteMap(null)).toBe(false);
      expect(isUserVoteMap(undefined)).toBe(false);
      expect(isUserVoteMap("string")).toBe(false);
      expect(isUserVoteMap([])).toBe(false);
      expect(isUserVoteMap({ "recipe-1": "invalid" })).toBe(false);
    });
  });

  describe("formatRecency", () => {
    const fixedNow = new Date("2026-09-03T12:00:00.000Z").getTime();

    it("handles null or invalid dates", () => {
      expect(formatRecency(null, fixedNow)).toBe("No reports yet");
      expect(formatRecency("invalid-date", fixedNow)).toBe("No reports yet");
    });

    it("formats minutes ago", () => {
      const zeroMins = new Date("2026-09-03T11:59:45.000Z").toISOString();
      expect(formatRecency(zeroMins, fixedNow)).toBe("Confirmed just now");

      const tenMins = new Date("2026-09-03T11:50:00.000Z").toISOString();
      expect(formatRecency(tenMins, fixedNow)).toBe("Confirmed 10m ago");
    });

    it("formats hours ago", () => {
      const twoHours = new Date("2026-09-03T10:00:00.000Z").toISOString();
      expect(formatRecency(twoHours, fixedNow)).toBe("Confirmed 2h ago");
    });

    it("formats days ago", () => {
      const yesterday = new Date("2026-09-02T10:00:00.000Z").toISOString();
      expect(formatRecency(yesterday, fixedNow)).toBe("Confirmed yesterday");

      const threeDays = new Date("2026-08-31T10:00:00.000Z").toISOString();
      expect(formatRecency(threeDays, fixedNow)).toBe("Confirmed 3d ago");
    });
  });

  describe("formatReportStatus", () => {
    const fixedNow = new Date("2026-09-03T12:00:00.000Z").getTime();

    it("shows recency when a worked timestamp exists", () => {
      expect(
        formatReportStatus(
          {
            workedCount: 1,
            didntWorkCount: 2,
            lastWorkedAt: "2026-09-03T10:00:00.000Z",
            lastDidntWorkAt: null,
          },
          fixedNow,
        ),
      ).toBe("Confirmed 2h ago");
    });

    it("shows didnt-work recency for didnt-work-only recipes", () => {
      expect(
        formatReportStatus(
          {
            workedCount: 0,
            didntWorkCount: 2,
            lastWorkedAt: null,
            lastDidntWorkAt: "2026-09-01T12:00:00.000Z",
          },
          fixedNow,
        ),
      ).toBe("Didn't work 2d ago");
    });

    it("prefers whichever signal is most recent", () => {
      expect(
        formatReportStatus(
          {
            workedCount: 5,
            didntWorkCount: 1,
            lastWorkedAt: "2026-08-29T12:00:00.000Z",
            lastDidntWorkAt: "2026-09-03T10:00:00.000Z",
          },
          fixedNow,
        ),
      ).toBe("Didn't work 2h ago");
      expect(
        formatReportStatus(
          {
            workedCount: 5,
            didntWorkCount: 1,
            lastWorkedAt: "2026-09-03T10:00:00.000Z",
            lastDidntWorkAt: "2026-08-29T12:00:00.000Z",
          },
          fixedNow,
        ),
      ).toBe("Confirmed 2h ago");
    });

    it("falls back to counts when timestamps are missing", () => {
      expect(
        formatReportStatus(
          {
            workedCount: 0,
            didntWorkCount: 2,
            lastWorkedAt: null,
            lastDidntWorkAt: null,
          },
          fixedNow,
        ),
      ).toBe("Not confirmed yet");
    });

    it("shows no reports only when both counts are zero", () => {
      expect(
        formatReportStatus(
          {
            workedCount: 0,
            didntWorkCount: 0,
            lastWorkedAt: null,
            lastDidntWorkAt: null,
          },
          fixedNow,
        ),
      ).toBe("No reports yet");
    });
  });

  describe("formatLastWorkedDetail", () => {
    const fixedNow = new Date("2026-09-03T12:00:00.000Z").getTime();

    it("includes the mode and compact relative time", () => {
      expect(
        formatLastWorkedDetail("pve", "2026-09-02T22:00:00.000Z", fixedNow),
      ).toBe("Last worked on PVE · 14h ago");
    });

    it("omits the detail when the mode or timestamp is unavailable", () => {
      expect(formatLastWorkedDetail(null, null, fixedNow)).toBeNull();
      expect(
        formatLastWorkedDetail("pvp", "invalid-date", fixedNow),
      ).toBeNull();
    });
  });

  describe("isRecipeRecentlyActive", () => {
    const fixedNow = new Date("2026-09-03T12:00:00.000Z").getTime();

    it("returns false for null or invalid dates", () => {
      expect(isRecipeRecentlyActive(null, 72, fixedNow)).toBe(false);
      expect(isRecipeRecentlyActive("invalid", 72, fixedNow)).toBe(false);
    });

    it("returns true for timestamps within maxAgeHours", () => {
      const twoHours = new Date("2026-09-03T10:00:00.000Z").toISOString();
      expect(isRecipeRecentlyActive(twoHours, 72, fixedNow)).toBe(true);

      const twoDays = new Date("2026-09-01T12:00:00.000Z").toISOString();
      expect(isRecipeRecentlyActive(twoDays, 72, fixedNow)).toBe(true);
    });

    it("returns false for timestamps older than maxAgeHours", () => {
      const fourDays = new Date("2026-08-29T12:00:00.000Z").toISOString();
      expect(isRecipeRecentlyActive(fourDays, 72, fixedNow)).toBe(false);
    });
  });

  describe("applyUserVote", () => {
    const initialStats: RecipeFeedbackStats = {
      workedCount: 10,
      didntWorkCount: 2,
      lastWorkedAt: "2026-09-01T12:00:00.000Z",
    };
    const testTimestamp = "2026-09-03T12:00:00.000Z";

    it("increments workedCount and updates lastWorkedAt when voting worked", () => {
      const result = applyUserVote(
        initialStats,
        undefined,
        "worked",
        testTimestamp,
      );
      expect(result.workedCount).toBe(11);
      expect(result.didntWorkCount).toBe(2);
      expect(result.lastWorkedAt).toBe(testTimestamp);
    });

    it("increments didntWorkCount without updating lastWorkedAt when voting didnt_work", () => {
      const result = applyUserVote(
        initialStats,
        undefined,
        "didnt_work",
        testTimestamp,
      );
      expect(result.workedCount).toBe(10);
      expect(result.didntWorkCount).toBe(3);
      expect(result.lastWorkedAt).toBe(initialStats.lastWorkedAt);
      expect(result.lastDidntWorkAt).toBe(testTimestamp);
    });

    it("removes the current vote when the desired vote is null", () => {
      const result = applyUserVote(initialStats, "worked", null, testTimestamp);
      expect(result.workedCount).toBe(9);
      expect(result.didntWorkCount).toBe(2);

      const resultDidntWork = applyUserVote(
        initialStats,
        "didnt_work",
        null,
        testTimestamp,
      );
      expect(resultDidntWork.didntWorkCount).toBe(1);
    });

    it("switches vote from worked to didnt_work", () => {
      const result = applyUserVote(
        initialStats,
        "worked",
        "didnt_work",
        testTimestamp,
      );
      expect(result.workedCount).toBe(9);
      expect(result.didntWorkCount).toBe(3);
    });

    it("switches vote from didnt_work to worked", () => {
      const result = applyUserVote(
        initialStats,
        "didnt_work",
        "worked",
        testTimestamp,
      );
      expect(result.workedCount).toBe(11);
      expect(result.didntWorkCount).toBe(1);
      expect(result.lastWorkedAt).toBe(testTimestamp);
    });

    it("keeps aggregate totals stable when a vote moves between modes", () => {
      const result = applyUserVote(
        initialStats,
        "worked",
        "worked",
        testTimestamp,
      );
      expect(result.workedCount).toBe(10);
      expect(result.lastWorkedAt).toBe(testTimestamp);
    });
  });

  it("derives legacy unspecified counts from aggregate totals", () => {
    expect(
      getUnspecifiedModeCounts({
        workedCount: 10,
        didntWorkCount: 3,
        lastWorkedAt: null,
        modes: {
          pvp: { worked: 6, didntWork: 1 },
          pve: { worked: 2, didntWork: 1 },
          season: { worked: 1, didntWork: 0 },
        },
      }),
    ).toEqual({ worked: 1, didntWork: 1 });
  });

  describe("isUserModeMap", () => {
    it("validates valid mode maps", () => {
      expect(isUserModeMap({ "recipe-1": "pvp", "recipe-2": "season" })).toBe(
        true,
      );
      expect(isUserModeMap({})).toBe(true);
    });

    it("rejects invalid mode maps", () => {
      expect(isUserModeMap(null)).toBe(false);
      expect(isUserModeMap({ "recipe-1": "pvp-s" })).toBe(false);
      expect(isUserModeMap({ "recipe-1": "coop" })).toBe(false);
    });
  });

  describe("isRecipeFeedbackStats", () => {
    it("accepts stats with and without a mode breakdown", () => {
      expect(
        isRecipeFeedbackStats({
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: null,
        }),
      ).toBe(true);
      expect(
        isRecipeFeedbackStats({
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: null,
          modes: {
            pvp: { worked: 1, didntWork: 0 },
            pve: { worked: 0, didntWork: 0 },
            season: { worked: 0, didntWork: 0 },
          },
        }),
      ).toBe(true);
    });

    it("accepts per-mode recency timestamps and didnt-work mode", () => {
      expect(
        isRecipeFeedbackStats({
          workedCount: 2,
          didntWorkCount: 1,
          lastWorkedAt: "2026-09-03T10:00:00.000Z",
          lastWorkedMode: "pve",
          lastDidntWorkAt: "2026-09-03T11:00:00.000Z",
          lastDidntWorkMode: "pve",
          modes: {
            pvp: { worked: 0, didntWork: 0 },
            pve: {
              worked: 2,
              didntWork: 1,
              lastWorkedAt: "2026-09-03T10:00:00.000Z",
              lastDidntWorkAt: "2026-09-03T11:00:00.000Z",
            },
            season: { worked: 0, didntWork: 0 },
          },
        }),
      ).toBe(true);
    });

    it("rejects malformed breakdowns", () => {
      expect(
        isRecipeFeedbackStats({
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: null,
          modes: { pvp: { worked: -1, didntWork: 0 } },
        }),
      ).toBe(false);
      expect(
        isRecipeFeedbackStats({
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: null,
          modes: { pvp: { worked: 1, didntWork: 0 } },
        }),
      ).toBe(false);
      expect(
        isRecipeFeedbackStats({
          workedCount: 1,
          didntWorkCount: 0,
          lastWorkedAt: null,
          lastWorkedMode: "coop",
        }),
      ).toBe(false);
    });
  });

  describe("per-mode recency helpers", () => {
    const fixedNow = new Date("2026-09-03T12:00:00.000Z").getTime();

    it("formats compact recency without a prefix", () => {
      expect(
        formatCompactRecency("2026-09-03T11:13:00.000Z", fixedNow),
      ).toBe("47m ago");
      expect(formatCompactRecency(null, fixedNow)).toBeNull();
      expect(formatCompactRecency("invalid", fixedNow)).toBeNull();
    });

    it("picks the newest signal within a mode bucket", () => {
      expect(
        getModeLatestSignal({
          worked: 1,
          didntWork: 7,
          lastWorkedAt: "2026-09-03T11:13:00.000Z",
          lastDidntWorkAt: "2026-09-03T11:55:00.000Z",
        }),
      ).toEqual({
        vote: "didnt_work",
        at: "2026-09-03T11:55:00.000Z",
      });
      expect(
        getModeLatestSignal({ worked: 0, didntWork: 0 }),
      ).toEqual({ vote: null, at: null });
    });

    it("finds the overall latest report across modes", () => {
      expect(
        getLatestReport({
          workedCount: 3,
          didntWorkCount: 15,
          lastWorkedAt: "2026-09-03T11:13:00.000Z",
          lastWorkedMode: "pve",
          lastDidntWorkAt: "2026-09-03T11:55:00.000Z",
          lastDidntWorkMode: "pve",
          modes: {
            pvp: {
              worked: 1,
              didntWork: 1,
              lastWorkedAt: "2026-09-03T10:00:00.000Z",
              lastDidntWorkAt: null,
            },
            pve: {
              worked: 1,
              didntWork: 7,
              lastWorkedAt: "2026-09-03T11:13:00.000Z",
              lastDidntWorkAt: "2026-09-03T11:55:00.000Z",
            },
            season: { worked: 1, didntWork: 7 },
          },
        }),
      ).toEqual({
        vote: "didnt_work",
        mode: "pve",
        at: "2026-09-03T11:55:00.000Z",
      });
    });

    it("formats the popover footer line with mode and time", () => {
      expect(
        formatLatestReport(
          {
            workedCount: 3,
            didntWorkCount: 15,
            lastWorkedAt: "2026-09-03T11:13:00.000Z",
            lastWorkedMode: "pve",
            lastDidntWorkAt: "2026-09-03T11:55:00.000Z",
            lastDidntWorkMode: "pve",
            modes: {
              pvp: { worked: 1, didntWork: 1 },
              pve: {
                worked: 1,
                didntWork: 7,
                lastWorkedAt: "2026-09-03T11:13:00.000Z",
                lastDidntWorkAt: "2026-09-03T11:55:00.000Z",
              },
              season: { worked: 1, didntWork: 7 },
            },
          },
          fixedNow,
        ),
      ).toBe("Latest: Didn't work on PVE · 5m ago");
      expect(
        formatLatestReport(
          { workedCount: 0, didntWorkCount: 0, lastWorkedAt: null },
          fixedNow,
        ),
      ).toBeNull();
    });
  });

  describe("applyModeVote", () => {
    const baseModes: RecipeFeedbackModeBreakdown = {
      pvp: { worked: 5, didntWork: 1 },
      pve: { worked: 2, didntWork: 0 },
      season: { worked: 0, didntWork: 0 },
    };

    it("increments the picked bucket for a fresh vote", () => {
      const result = applyModeVote(baseModes, null, {
        vote: "worked",
        mode: "pve",
      });
      expect(result.pve).toEqual({ worked: 3, didntWork: 0 });
      expect(result.pvp).toEqual({ worked: 5, didntWork: 1 });
    });

    it("moves a count between buckets when switching votes", () => {
      const result = applyModeVote(
        baseModes,
        { vote: "worked", mode: "pvp" },
        { vote: "didnt_work", mode: "season" },
      );
      expect(result.pvp).toEqual({ worked: 4, didntWork: 1 });
      expect(result.season).toEqual({ worked: 0, didntWork: 1 });
    });

    it("decrements the stored bucket when removing a vote", () => {
      const result = applyModeVote(
        baseModes,
        { vote: "didnt_work", mode: "pvp" },
        null,
      );
      expect(result.pvp).toEqual({ worked: 5, didntWork: 0 });
    });

    it("clamps at zero and tolerates missing buckets", () => {
      const result = applyModeVote(
        undefined,
        { vote: "worked", mode: "pvp" },
        null,
      );
      expect(result.pvp).toEqual({ worked: 0, didntWork: 0 });
      const added = applyModeVote(undefined, null, {
        vote: "worked",
        mode: "season",
      });
      expect(added.season).toEqual({ worked: 1, didntWork: 0 });
    });
  });
});
