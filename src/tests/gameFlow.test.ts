import { describe, expect, it } from "vitest";
import { augmentDefinitions } from "../data/augments";
import { createInitialGame, discardTile, endRound, getLevelUpCost, levelUpPlayer, sellTile } from "../engine/gameEngine";
import type { GameState, TileInstance } from "../types";
import { createSeededRandom } from "../utils/random";

function instances(ids: string[], prefix: string): TileInstance[] {
  return ids.map((tileId, index) => ({ tileId, instanceId: `${prefix}-${tileId}-${index}` }));
}

function withHands(game: GameState, hands: Record<string, string[]>): GameState {
  return {
    ...game,
    city: {
      id: "sequence-city",
      name: "顺子之城",
      description: "顺子类胡牌伤害提高。",
      modifiers: { sequenceDamageBonus: 3 }
    },
    players: game.players.map((player) => ({
      ...player,
      hp: 40,
      gold: player.id === "player" ? 20 : 10,
      handTiles: instances(hands[player.id] ?? hands.default ?? [], player.id),
      activeTraits: player.activeTraits
    }))
  };
}

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

  it("applies roll-fever's level-up cost penalty", () => {
    const rollFever = augmentDefinitions.find((augment) => augment.id === "roll-fever");
    if (!rollFever) throw new Error("Missing roll-fever augment");
    const game = createInitialGame({ rng: createSeededRandom(34) });
    const baseCost = getLevelUpCost(1);
    const blocked = {
      ...game,
      players: game.players.map((player) =>
        player.id === "player" ? { ...player, gold: baseCost + 1, augments: [rollFever] } : player
      )
    };

    const after = levelUpPlayer(blocked, "player");
    const player = after.players.find((item) => item.id === "player");

    expect(player?.level).toBe(1);
    expect(player?.gold).toBe(baseCost + 1);
  });

  it("keeps the shop unchanged across round end when the player locks it", () => {
    const game = createInitialGame({ rng: createSeededRandom(44) });
    const lockedGame = {
      ...game,
      players: game.players.map((player) => (player.id === "player" ? { ...player, lockedShop: true } : player))
    };
    const beforeShopIds = lockedGame.shop.map((tile) => tile.instanceId);

    const advanced = endRound(lockedGame, createSeededRandom(45));

    expect(advanced.players.find((player) => player.id === "player")?.lockedShop).toBe(true);
    expect(advanced.shop.map((tile) => tile.instanceId)).toEqual(beforeShopIds);
  });

  it("does not offer already selected augments again", () => {
    const game = createInitialGame({ rng: createSeededRandom(46) });
    const goldenTicket = augmentDefinitions.find((augment) => augment.id === "golden-ticket");
    if (!goldenTicket) throw new Error("Missing golden-ticket augment");
    const gameWithAugment = {
      ...game,
      round: 1,
      players: game.players.map((player) => (player.id === "player" ? { ...player, augments: [goldenTicket] } : player))
    };

    const advanced = endRound(gameWithAugment, createSeededRandom(47));

    expect(advanced.phase).toBe("augment_select");
    expect(advanced.augmentChoices).toHaveLength(3);
    expect(advanced.augmentChoices.map((augment) => augment.id)).not.toContain("golden-ticket");
  });

  it("resolves simultaneous winning hands by winning combat score", () => {
    const base = createInitialGame({ rng: createSeededRandom(71) });
    const game = withHands(base, {
      player: [
        "wan-1",
        "wan-2",
        "wan-3",
        "wan-2",
        "wan-3",
        "wan-4",
        "wan-4",
        "wan-5",
        "wan-6",
        "wan-7",
        "wan-8",
        "wan-9",
        "wan-5",
        "wan-5"
      ],
      "ai-1": [
        "wan-1",
        "wan-2",
        "wan-3",
        "tong-1",
        "tong-2",
        "tong-3",
        "tiao-1",
        "tiao-2",
        "tiao-3",
        "wan-7",
        "wan-8",
        "wan-9",
        "dragon-red",
        "dragon-red"
      ],
      "ai-2": [
        "wan-1",
        "wan-1",
        "tong-2",
        "tong-2",
        "tiao-3",
        "tiao-3",
        "wan-4",
        "wan-4",
        "tong-5",
        "tong-5",
        "tiao-6",
        "tiao-6",
        "wind-east",
        "wind-east"
      ],
      "ai-3": [
        "wan-1",
        "wan-1",
        "wan-1",
        "tong-2",
        "tong-2",
        "tong-2",
        "tiao-3",
        "tiao-3",
        "tiao-3",
        "wind-east",
        "wind-east",
        "wind-east",
        "dragon-red",
        "dragon-red"
      ]
    });

    const advanced = endRound(game, createSeededRandom(72));
    const settlement = advanced.lastSettlement;
    const playerEntry = settlement.find((entry) => entry.playerId === "player");
    const otherWinningEntries = settlement.filter((entry) => entry.playerId !== "player" && entry.status === "winning");

    expect(playerEntry?.isRoundWinner).toBe(true);
    expect(playerEntry?.combatScore).toBeGreaterThan(0);
    expect(playerEntry?.damage).toBe(0);
    expect(playerEntry?.hpAfter).toBe(playerEntry?.hpBefore);
    expect(otherWinningEntries.length).toBeGreaterThan(0);
    expect(otherWinningEntries.every((entry) => entry.damage >= 1 && entry.damage <= 5)).toBe(true);
  });

  it("returns discarded and sold tiles to the pool and allows only one discard per round", () => {
    const game = createInitialGame({ rng: createSeededRandom(81) });
    const firstTile = game.players[0].handTiles[0];
    const secondTile = game.players[0].handTiles[1];
    const afterDiscard = discardTile(game, "player", firstTile.instanceId);
    const afterSecondDiscard = discardTile(afterDiscard, "player", secondTile.instanceId);
    const discardedPlayer = afterSecondDiscard.players.find((player) => player.id === "player");

    expect(afterDiscard.tilePool.map((tile) => tile.instanceId)).toContain(firstTile.instanceId);
    expect(discardedPlayer?.handTiles.map((tile) => tile.instanceId)).toContain(secondTile.instanceId);

    const tileToSell = discardedPlayer?.handTiles[0];
    if (!tileToSell) throw new Error("expected a tile to sell");
    const afterSell = sellTile(afterSecondDiscard, "player", tileToSell.instanceId);

    expect(afterSell.tilePool.map((tile) => tile.instanceId)).toContain(tileToSell.instanceId);
  });
});
