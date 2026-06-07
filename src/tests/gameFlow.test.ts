import { describe, expect, it } from "vitest";
import { createInitialGame, endRound, levelUpPlayer } from "../engine/gameEngine";
import { createSeededRandom } from "../utils/random";

describe("game flow", () => {
  it("creates a playable game and advances through settlement into the next round", () => {
    const game = createInitialGame({ rng: createSeededRandom(3) });

    expect(game.players).toHaveLength(4);
    expect(game.shop).toHaveLength(5);
    expect(game.city).not.toBeNull();

    const advanced = endRound(game, createSeededRandom(4));

    expect(advanced.round).toBe(2);
    expect(advanced.logs.length).toBeGreaterThan(game.logs.length);
    expect(advanced.shop).toHaveLength(5);
  });

  it("lets a player spend gold to level up until the level cap", () => {
    const game = createInitialGame({ rng: createSeededRandom(33) });
    const leveled = levelUpPlayer(game, "player");
    const player = leveled.players.find((item) => item.id === "player");

    expect(player?.level).toBe(2);
    expect(player?.gold).toBeLessThan(game.players[0].gold);
  });
});
