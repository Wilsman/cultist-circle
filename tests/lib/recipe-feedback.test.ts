import { describe, expect, it } from "vitest";
import {
  applyUserVote,
  formatRecency,
  isRecipeRecentlyActive,
  isUserVoteMap,
} from "@/lib/recipe-feedback";
import type { RecipeFeedbackStats } from "@/types/recipe-feedback";

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
      expect(formatRecency(zeroMins, fixedNow)).toBe("Worked just now");

      const tenMins = new Date("2026-09-03T11:50:00.000Z").toISOString();
      expect(formatRecency(tenMins, fixedNow)).toBe("Worked 10m ago");
    });

    it("formats hours ago", () => {
      const twoHours = new Date("2026-09-03T10:00:00.000Z").toISOString();
      expect(formatRecency(twoHours, fixedNow)).toBe("Worked 2h ago");
    });

    it("formats days ago", () => {
      const yesterday = new Date("2026-09-02T10:00:00.000Z").toISOString();
      expect(formatRecency(yesterday, fixedNow)).toBe("Worked yesterday");

      const threeDays = new Date("2026-08-31T10:00:00.000Z").toISOString();
      expect(formatRecency(threeDays, fixedNow)).toBe("Worked 3d ago");
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
      expect(result.nextVote).toBe("worked");
      expect(result.updatedStats.workedCount).toBe(11);
      expect(result.updatedStats.didntWorkCount).toBe(2);
      expect(result.updatedStats.lastWorkedAt).toBe(testTimestamp);
    });

    it("increments didntWorkCount without updating lastWorkedAt when voting didnt_work", () => {
      const result = applyUserVote(
        initialStats,
        undefined,
        "didnt_work",
        testTimestamp,
      );
      expect(result.nextVote).toBe("didnt_work");
      expect(result.updatedStats.workedCount).toBe(10);
      expect(result.updatedStats.didntWorkCount).toBe(3);
      expect(result.updatedStats.lastWorkedAt).toBe(initialStats.lastWorkedAt);
    });

    it("unvotes when clicking the active vote", () => {
      const result = applyUserVote(
        initialStats,
        "worked",
        "worked",
        testTimestamp,
      );
      expect(result.nextVote).toBeNull();
      expect(result.updatedStats.workedCount).toBe(9);
      expect(result.updatedStats.didntWorkCount).toBe(2);

      const resultDidntWork = applyUserVote(
        initialStats,
        "didnt_work",
        "didnt_work",
        testTimestamp,
      );
      expect(resultDidntWork.nextVote).toBeNull();
      expect(resultDidntWork.updatedStats.didntWorkCount).toBe(1);
    });

    it("switches vote from worked to didnt_work", () => {
      const result = applyUserVote(
        initialStats,
        "worked",
        "didnt_work",
        testTimestamp,
      );
      expect(result.nextVote).toBe("didnt_work");
      expect(result.updatedStats.workedCount).toBe(9);
      expect(result.updatedStats.didntWorkCount).toBe(3);
    });

    it("switches vote from didnt_work to worked", () => {
      const result = applyUserVote(
        initialStats,
        "didnt_work",
        "worked",
        testTimestamp,
      );
      expect(result.nextVote).toBe("worked");
      expect(result.updatedStats.workedCount).toBe(11);
      expect(result.updatedStats.didntWorkCount).toBe(1);
      expect(result.updatedStats.lastWorkedAt).toBe(testTimestamp);
    });
  });
});
