export type RatingMode = "solo" | "online";

export interface RatingChange {
  profileId: string;
  playerId?: string;
  nickname: string;
  mode: RatingMode;
  rank: number;
  pointsBefore: number;
  pointsAfter: number;
  delta: number;
  tierBefore: string;
  tierAfter: string;
  highestHuScore: number;
}

export interface LeaderboardItem {
  profileId: string;
  nickname: string;
  tier: string;
  points: number;
  wins: number;
  matches: number;
  winRate: number;
  highestHuScore: number;
}

export interface RatingMatchRecord extends RatingChange {
  id: string;
  playedAt: number;
  roomId?: string;
  humanPlayerCount?: number;
}
