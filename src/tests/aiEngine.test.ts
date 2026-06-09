import { describe, expect, it } from "vitest";
import { tileDefinitions } from "../data/tiles";
import { runAITurn } from "../engine/aiEngine";
import { createInitialGame } from "../engine/gameEngine";
import type { GameState, TileInstance } from "../types";
import { createSeededRandom } from "../utils/random";

function instances(ids: string[], prefix: string): TileInstance[] {
  return ids.map((id, index) => ({ instanceId: `${prefix}-${id}-${index}`, tileId: id }));
}

function countTile(hand: TileInstance[], tileId: string): number {
  return hand.filter((tile) => tile.tileId === tileId).length;
}

function createAIGame({
  hand,
  shop,
  pool = ["wan-4", "wan-5", "wan-6", "tong-1", "tong-2", "tong-3", "tiao-1", "tiao-2", "tiao-3", "wind-south"],
  gold = 20,
  hp = 100,
  level = 2
}: {
  hand: string[];
  shop: string[];
  pool?: string[];
  gold?: number;
  hp?: number;
  level?: number;
}): { game: GameState; aiId: string } {
  const game = createInitialGame({ rng: createSeededRandom(18) });
  const ai = game.players.find((player) => player.isAI);

  if (!ai) {
    throw new Error("expected an AI player");
  }

  return {
    aiId: ai.id,
    game: {
      ...game,
      currentPlayerId: "player",
      shop: instances(shop, "shop"),
      tilePool: instances(pool, "pool"),
      players: game.players.map((player) =>
        player.id === ai.id
          ? {
              ...player,
              hp,
              gold,
              level,
              handTiles: instances(hand, "hand"),
              discardTiles: [],
              activeTraits: []
            }
          : player
      )
    }
  };
}

describe("aiEngine", () => {
  it("buys a key tile that forms a triplet", () => {
    const { game, aiId } = createAIGame({
      hand: ["wan-1", "wan-1", "wan-2", "wan-3", "tong-5", "tong-6", "wind-east"],
      shop: ["wan-1", "dragon-white", "wind-south"]
    });

    const updated = runAITurn({ game, playerId: aiId, definitions: tileDefinitions, rng: createSeededRandom(22) });
    const updatedAI = updated.players.find((player) => player.id === aiId);

    expect(countTile(updatedAI?.handTiles ?? [], "wan-1")).toBe(3);
    expect(updatedAI?.handTiles.length).toBeLessThanOrEqual(14);
  });

  it("sells the weakest tile from a full non-winning hand and buys a useful tile", () => {
    const { game, aiId } = createAIGame({
      hand: ["wan-1", "wan-2", "tong-5", "tong-5", "tiao-7", "wind-east", "wind-south", "wind-west", "wind-north", "dragon-red", "dragon-green", "dragon-white", "tong-1", "tiao-9"],
      shop: ["tong-5", "wan-3"],
      gold: 10
    });

    const beforeAI = game.players.find((player) => player.id === aiId)!;
    const updated = runAITurn({ game, playerId: aiId, definitions: tileDefinitions, rng: createSeededRandom(31) });
    const updatedAI = updated.players.find((player) => player.id === aiId)!;

    expect(beforeAI.handTiles).toHaveLength(14);
    expect(updatedAI.handTiles).toHaveLength(14);
    expect(countTile(updatedAI.handTiles, "tong-5")).toBe(3);
    expect(updatedAI.discardTiles.length).toBeGreaterThan(0);
  });

  it("refreshes more aggressively when close to winning than when unformed", () => {
    const close = createAIGame({
      hand: ["wan-1", "wan-2", "wan-3", "wan-4", "wan-5", "wan-6", "tong-1", "tong-2", "tong-3", "tiao-7", "tiao-8", "wind-east", "wind-east"],
      shop: ["dragon-red", "dragon-green", "dragon-white"],
      gold: 3
    });
    const far = createAIGame({
      hand: ["wan-1", "tong-3", "tiao-5", "wind-east", "wind-south", "wind-west", "wind-north", "dragon-red"],
      shop: ["dragon-red", "dragon-green", "dragon-white"],
      gold: 3
    });

    const closeUpdated = runAITurn({ game: close.game, playerId: close.aiId, definitions: tileDefinitions, rng: createSeededRandom(41) });
    const farUpdated = runAITurn({ game: far.game, playerId: far.aiId, definitions: tileDefinitions, rng: createSeededRandom(41) });
    const closeAI = closeUpdated.players.find((player) => player.id === close.aiId)!;
    const farAI = farUpdated.players.find((player) => player.id === far.aiId)!;

    expect(closeAI.gold).toBeLessThan(farAI.gold);
    expect(closeUpdated.shop.map((tile) => tile.instanceId)).not.toEqual(close.game.shop.map((tile) => tile.instanceId));
    expect(farUpdated.shop.map((tile) => tile.instanceId)).toEqual(far.game.shop.map((tile) => tile.instanceId));
  });

  it("does not break an already winning AI hand", () => {
    const winningHand = ["wan-1", "wan-2", "wan-3", "wan-4", "wan-5", "wan-6", "tong-1", "tong-2", "tong-3", "tiao-7", "tiao-8", "tiao-9", "wind-east", "wind-east"];
    const { game, aiId } = createAIGame({
      hand: winningHand,
      shop: ["wan-1", "wan-9", "dragon-white"],
      gold: 20
    });

    const updated = runAITurn({ game, playerId: aiId, definitions: tileDefinitions, rng: createSeededRandom(52) });
    const updatedAI = updated.players.find((player) => player.id === aiId)!;

    expect(updatedAI.handTiles.map((tile) => tile.tileId)).toEqual(winningHand);
    expect(updatedAI.gold).toBe(20);
  });
});
