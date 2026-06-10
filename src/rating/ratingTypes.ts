export type { LeaderboardItem, RatingChange, RatingMatchRecord, RatingMode } from "../../shared/rating/ratingTypes";

export interface SoloRatingProfile {
  profileId: string;
  nickname: string;
  soloPoints: number;
  soloMatches: number;
  soloWins: number;
  highestHuScore: number;
  matchRecords: import("../../shared/rating/ratingTypes").RatingMatchRecord[];
}
