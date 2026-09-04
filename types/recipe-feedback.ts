import type { GameMode } from "@/lib/game-mode";

export interface RecipeFeedbackModeCounts {
  worked: number;
  didntWork: number;
}

export type RecipeFeedbackModeBreakdown = Record<
  GameMode,
  RecipeFeedbackModeCounts
>;

export interface RecipeFeedbackStats {
  workedCount: number;
  didntWorkCount: number;
  lastWorkedAt: string | null;
  lastWorkedMode?: GameMode | null;
  modes?: RecipeFeedbackModeBreakdown;
}

export type UserVote = "worked" | "didnt_work";

export type RecipeFeedbackMap = Record<string, RecipeFeedbackStats>;

export type UserVoteMap = Record<string, UserVote>;

export type UserModeMap = Record<string, GameMode>;

export interface RecipeFeedbackVoteResult {
  recipeId: string;
  stats: RecipeFeedbackStats;
  userVote: UserVote | null;
  userMode?: GameMode | null;
}
