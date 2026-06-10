export type { LeaderboardItem, RatingChange, RatingMatchRecord, RatingMode } from "../../../shared/rating/ratingTypes";

export interface OnlineRatingProfile {
  profileId: string;
  nickname: string;
  onlinePoints: number;
  onlineMatches: number;
  onlineWins: number;
  highestHuScore: number;
  updatedAt: number;
}
