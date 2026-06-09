import { beforeEach, describe, expect, it, vi } from "vitest";
import { playGameSound } from "../audio/playGameSound";
import { playSettlementSounds, resetSettlementSoundHistory } from "../audio/settlementSound";
import type { SettlementEntry } from "../types";

vi.mock("../audio/playGameSound", () => ({
  playGameSound: vi.fn()
}));

const winningEntry: SettlementEntry = {
  playerId: "player",
  playerName: "你",
  hpBefore: 40,
  hpAfter: 40,
  damage: 0,
  status: "winning",
  patterns: [],
  combatScore: 10,
  isRoundWinner: true,
  roundRank: 1
};

describe("settlementSound", () => {
  beforeEach(() => {
    vi.mocked(playGameSound).mockClear();
    resetSettlementSoundHistory();
  });

  it("plays a settlement sound once per signature", () => {
    const input = {
      scope: "single" as const,
      round: 2,
      phase: "shop" as const,
      currentPlayerId: "player",
      winnerId: null,
      lastSettlement: [winningEntry]
    };

    playSettlementSounds(input);
    playSettlementSounds(input);

    expect(playGameSound).toHaveBeenCalledTimes(1);
    expect(playGameSound).toHaveBeenCalledWith("winHu", { delayMs: 300 });
  });

  it("plays game result sound when the game is over", () => {
    playSettlementSounds({
      scope: "online",
      round: 8,
      phase: "game_over",
      currentPlayerId: "player",
      winnerId: "ai-1",
      lastSettlement: [winningEntry]
    });

    expect(playGameSound).toHaveBeenCalledWith("gameLose", { delayMs: 300 });
  });
});
