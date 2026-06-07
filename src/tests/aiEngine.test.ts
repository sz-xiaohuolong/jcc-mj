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

    const updated = runAITurn({
      game,
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
