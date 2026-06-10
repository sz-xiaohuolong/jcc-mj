import { applyRatingDelta, calculateRatingDelta, tierForPoints } from "../../../shared/rating/ratingRules";
import type { LeaderboardItem, RatingChange, RatingMatchRecord } from "../../../shared/rating/ratingTypes";
import type { PlayerState, SettlementEntry } from "../../../src/types";
import { RatingFileStore } from "./ratingFileStore";
import type { OnlineRatingProfile } from "./ratingTypes";

export interface RatedPlayerInput {
  playerId: string;
  profileId?: string;
  nickname: string;
  isAI: boolean;
}

export interface SettleOnlineRatingInput {
  roomId: string;
  ranking: string[];
  roomPlayers: RatedPlayerInput[];
  gamePlayers: PlayerState[];
  settlement: SettlementEntry[];
}

export class RatingManager {
  private readonly profiles = new Map<string, OnlineRatingProfile>();
  private readonly store: RatingFileStore;

  constructor(store = new RatingFileStore()) {
    this.store = store;
    for (const profile of store.loadProfiles()) {
      this.profiles.set(profile.profileId, this.normalizeProfile(profile));
    }
  }

  getProfile(profileId: string, nickname = "玩家"): OnlineRatingProfile {
    const existing = this.profiles.get(profileId);
    if (existing) {
      return existing;
    }

    const created = this.normalizeProfile({
      profileId,
      nickname: nickname.trim() || "玩家",
      onlinePoints: 0,
      onlineMatches: 0,
      onlineWins: 0,
      highestHuScore: 0,
      updatedAt: Date.now()
    });
    this.profiles.set(profileId, created);
    return created;
  }

  settleOnlineMatch(input: SettleOnlineRatingInput): RatingChange[] {
    const humansByProfile = new Map<string, RatedPlayerInput>();

    for (const player of input.roomPlayers) {
      if (player.isAI || !player.profileId || humansByProfile.has(player.profileId)) {
        continue;
      }
      humansByProfile.set(player.profileId, player);
    }

    const humanPlayerCount = humansByProfile.size;
    if (humanPlayerCount < 2) {
      return [];
    }

    const settlementByPlayerId = new Map(input.settlement.map((entry) => [entry.playerId, entry]));
    const changes: RatingChange[] = [];

    for (const player of humansByProfile.values()) {
      const rankIndex = input.ranking.indexOf(player.playerId);
      if (rankIndex < 0 || !player.profileId) {
        continue;
      }

      const rank = rankIndex + 1;
      const profile = this.getProfile(player.profileId, player.nickname);
      const pointsBefore = profile.onlinePoints;
      const delta = calculateRatingDelta({ mode: "online", rank, humanPlayerCount });
      const pointsAfter = applyRatingDelta(pointsBefore, delta);
      const highestHuScore = Math.max(0, settlementByPlayerId.get(player.playerId)?.combatScore ?? 0);
      const change: RatingChange = {
        profileId: profile.profileId,
        playerId: player.playerId,
        nickname: player.nickname,
        mode: "online",
        rank,
        pointsBefore,
        pointsAfter,
        delta: pointsAfter - pointsBefore,
        tierBefore: tierForPoints(pointsBefore),
        tierAfter: tierForPoints(pointsAfter),
        highestHuScore
      };
      const updated: OnlineRatingProfile = {
        ...profile,
        nickname: player.nickname,
        onlinePoints: pointsAfter,
        onlineMatches: profile.onlineMatches + 1,
        onlineWins: profile.onlineWins + (rank === 1 ? 1 : 0),
        highestHuScore: Math.max(profile.highestHuScore, highestHuScore),
        updatedAt: Date.now()
      };
      const record: RatingMatchRecord = {
        ...change,
        id: `${input.roomId}_${Date.now()}_${player.playerId}`,
        playedAt: Date.now(),
        roomId: input.roomId,
        humanPlayerCount
      };

      this.profiles.set(profile.profileId, updated);
      this.store.appendMatchRecord(record);
      changes.push(change);
    }

    this.persist();
    return changes;
  }

  getLeaderboard(limit = 50): LeaderboardItem[] {
    return [...this.profiles.values()]
      .sort((left, right) => right.onlinePoints - left.onlinePoints || right.onlineWins - left.onlineWins || left.updatedAt - right.updatedAt)
      .slice(0, limit)
      .map((profile) => ({
        profileId: profile.profileId,
        nickname: profile.nickname,
        tier: tierForPoints(profile.onlinePoints),
        points: profile.onlinePoints,
        wins: profile.onlineWins,
        matches: profile.onlineMatches,
        winRate: profile.onlineMatches > 0 ? profile.onlineWins / profile.onlineMatches : 0,
        highestHuScore: profile.highestHuScore
      }));
  }

  private persist(): void {
    this.store.saveProfiles([...this.profiles.values()]);
  }

  private normalizeProfile(profile: OnlineRatingProfile): OnlineRatingProfile {
    return {
      profileId: profile.profileId,
      nickname: profile.nickname || "玩家",
      onlinePoints: Math.max(0, Math.floor(profile.onlinePoints ?? 0)),
      onlineMatches: Math.max(0, Math.floor(profile.onlineMatches ?? 0)),
      onlineWins: Math.max(0, Math.floor(profile.onlineWins ?? 0)),
      highestHuScore: Math.max(0, Math.floor(profile.highestHuScore ?? 0)),
      updatedAt: profile.updatedAt ?? Date.now()
    };
  }
}
