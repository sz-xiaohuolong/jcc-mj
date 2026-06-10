import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RatingManager } from "../rating/RatingManager";
import { RatingFileStore } from "../rating/ratingFileStore";
import type { RatedPlayerInput } from "../rating/RatingManager";
import type { PlayerState, SettlementEntry } from "../../../src/types";

let tempDir = "";

function manager(): RatingManager {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jcc-rating-"));
  return new RatingManager(new RatingFileStore({ dataDir: tempDir }));
}

function ratedPlayer(playerId: string, profileId: string | undefined, nickname: string, isAI = false): RatedPlayerInput {
  return { playerId, profileId, nickname, isAI };
}

function gamePlayer(id: string, isAI = false): PlayerState {
  return {
    id,
    name: id,
    isAI,
    hp: 10,
    gold: 0,
    level: 1,
    xp: 0,
    handTiles: [],
    benchTiles: [],
    discardTiles: [],
    augments: [],
    activeTraits: [],
    isAlive: true,
    isWinning: false,
    lockedShop: false,
    hasRefreshedThisRound: false,
    hasDiscardedThisRound: false
  };
}

function settlement(playerId: string, score = 0): SettlementEntry {
  return {
    playerId,
    playerName: playerId,
    hpBefore: 10,
    hpAfter: 10,
    damage: 0,
    status: score > 0 ? "winning" : "unformed",
    patterns: [],
    combatScore: score,
    isRoundWinner: score > 0,
    roundRank: score > 0 ? 1 : 0
  };
}

describe("RatingManager", () => {
  beforeEach(() => {
    tempDir = "";
  });

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("updates online ratings from final ranking", () => {
    const ratingManager = manager();
    const changes = ratingManager.settleOnlineMatch({
      roomId: "ROOM01",
      ranking: ["p1", "p2", "p3", "p4"],
      roomPlayers: [
        ratedPlayer("p1", "profile-1", "A"),
        ratedPlayer("p2", "profile-2", "B"),
        ratedPlayer("p3", "profile-3", "C"),
        ratedPlayer("p4", "profile-4", "D")
      ],
      gamePlayers: [gamePlayer("p1"), gamePlayer("p2"), gamePlayer("p3"), gamePlayer("p4")],
      settlement: [settlement("p1", 25), settlement("p2"), settlement("p3"), settlement("p4")]
    });

    expect(changes.map((change) => change.delta)).toEqual([40, 20, 0, 0]);
    expect(ratingManager.getLeaderboard()[0]).toMatchObject({ profileId: "profile-1", points: 40, wins: 1, highestHuScore: 25 });
  });

  it("does not include AI players in online leaderboard", () => {
    const ratingManager = manager();

    ratingManager.settleOnlineMatch({
      roomId: "ROOM02",
      ranking: ["ai-1", "p1", "p2", "ai-2"],
      roomPlayers: [
        ratedPlayer("p1", "profile-1", "A"),
        ratedPlayer("p2", "profile-2", "B"),
        ratedPlayer("ai-1", undefined, "AI 1", true),
        ratedPlayer("ai-2", undefined, "AI 2", true)
      ],
      gamePlayers: [gamePlayer("p1"), gamePlayer("p2"), gamePlayer("ai-1", true), gamePlayer("ai-2", true)],
      settlement: [settlement("ai-1", 30), settlement("p1"), settlement("p2"), settlement("ai-2")]
    });

    expect(ratingManager.getLeaderboard().map((item) => item.profileId)).toEqual(["profile-1", "profile-2"]);
  });

  it("skips online rating when fewer than two humans are present", () => {
    const ratingManager = manager();
    const changes = ratingManager.settleOnlineMatch({
      roomId: "ROOM03",
      ranking: ["p1", "ai-1", "ai-2", "ai-3"],
      roomPlayers: [
        ratedPlayer("p1", "profile-1", "A"),
        ratedPlayer("ai-1", undefined, "AI 1", true)
      ],
      gamePlayers: [gamePlayer("p1"), gamePlayer("ai-1", true)],
      settlement: [settlement("p1", 20), settlement("ai-1")]
    });

    expect(changes).toEqual([]);
    expect(ratingManager.getLeaderboard()).toEqual([]);
  });
});
