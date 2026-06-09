import { describe, expect, it } from "vitest";
import { augmentDefinitions } from "../data/augments";
import { tileDefinitions } from "../data/tiles";
import { settlePlayer } from "../engine/damageEngine";
import type { PlayerState } from "../types";

function hand(ids: string[]) {
  return ids.map((id) => {
    const definition = tileDefinitions.find((tile) => tile.id === id);
    if (!definition) throw new Error(`missing tile ${id}`);
    return definition;
  });
}

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "p",
    name: "P",
    isAI: false,
    hp: 30,
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
    hasDiscardedThisRound: false,
    ...overrides
  };
}

describe("damageEngine augment reductions", () => {
  it("reduces close-hand failure damage with pair-master", () => {
    const pairMaster = augmentDefinitions.find((augment) => augment.id === "pair-master");
    if (!pairMaster) throw new Error("Missing pair-master augment");
    const closeHand = hand(["wan-1", "wan-2", "wan-3", "tong-1", "tong-2", "tong-3", "tiao-1", "tiao-2", "tiao-3", "wind-east", "wan-4", "wan-5", "wan-6"]);

    const normal = settlePlayer({ player: player(), tiles: closeHand, city: null });
    const reduced = settlePlayer({ player: player({ augments: [pairMaster] }), tiles: closeHand, city: null });

    expect(reduced.damage).toBeLessThan(normal.damage);
  });

  it("reduces low-health failure damage with last-stand", () => {
    const lastStand = augmentDefinitions.find((augment) => augment.id === "last-stand");
    if (!lastStand) throw new Error("Missing last-stand augment");
    const unformedHand = hand(["wan-1", "tong-3", "tiao-5", "wind-east", "wind-south", "wind-west", "wind-north"]);

    const normal = settlePlayer({ player: player({ hp: 30 }), tiles: unformedHand, city: null });
    const reduced = settlePlayer({ player: player({ hp: 30, augments: [lastStand] }), tiles: unformedHand, city: null });

    expect(reduced.damage).toBeLessThan(normal.damage);
  });
});
