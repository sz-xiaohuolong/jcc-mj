import { describe, expect, it } from "vitest";
import { tileDefinitions } from "../data/tiles";
import { runAITurn } from "../engine/aiEngine";
import { createInitialGame } from "../engine/gameEngine";
import { createSeededRandom } from "../utils/random";

describe("aiEngine", () => {
  it("buys useful affordable tiles and keeps hand within limit", () => {
    const game = createInitialGame({ rng: createSeededRandom(18) });
    const ai = game.players.find((player) => player.isAI);

    if (!ai) {
      throw new Error("expected an AI player");
    }

    const targetTile = ai.handTiles[0];
    const offeredTile = game.tilePool.find((tile) => tile.tileId === targetTile.tileId);

    if (!offeredTile) {
      throw new Error("expected a matching shop tile");
    }

    const updated = runAITurn({
      game: {
        ...game,
        shop: [offeredTile],
        tilePool: game.tilePool.filter((tile) => tile.instanceId !== offeredTile.instanceId),
        players: game.players.map((player) => (player.id === ai.id ? { ...player, gold: 20 } : player))
      },
      playerId: ai.id,
      definitions: tileDefinitions,
      rng: createSeededRandom(22)
    });
    const updatedAI = updated.players.find((player) => player.id === ai.id);

    expect(updatedAI?.handTiles.length).toBeLessThanOrEqual(14);
    expect((updatedAI?.handTiles.length ?? 0) + (updatedAI?.benchTiles.length ?? 0)).toBeGreaterThan(
      ai.handTiles.length + ai.benchTiles.length
    );
  });
});
