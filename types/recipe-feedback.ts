export interface RecipeFeedbackStats {
  workedCount: number;
  didntWorkCount: number;
  lastWorkedAt: string | null;
}

export type UserVote = "worked" | "didnt_work";

export type RecipeFeedbackMap = Record<string, RecipeFeedbackStats>;

export type UserVoteMap = Record<string, UserVote>;

export interface RecipeFeedbackVoteResult {
  recipeId: string;
  stats: RecipeFeedbackStats;
  userVote: UserVote | null;
}
