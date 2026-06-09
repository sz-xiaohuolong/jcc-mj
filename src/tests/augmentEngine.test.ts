import { describe, expect, it } from "vitest";
import { augmentDefinitions } from "../data/augments";
import { tileDefinitions } from "../data/tiles";
import type { PlayerState, TileInstance } from "../types";
import {
  chooseAugmentForAI,
  createAugmentChoices,
  getAugmentRoundGoldBonus,
  getLevelUpCostModifier,
  getRefreshCostRefund,
  getSuitFocusShopBias
} from "../engine/augmentEngine";
import { createSeededRandom } from "../utils/random";

function instances(ids: string[]): TileInstance[] {
  return ids.map((id, index) => ({ instanceId: `${id}-${index}`, tileId: id }));
}

function player(hand: string[], overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "ai",
    name: "AI",
    isAI: true,
    hp: 100,
    gold: 10,
    level: 2,
    xp: 0,
    handTiles: instances(hand),
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

function choices(ids: string[]) {
  return ids.map((id) => {
    const augment = augmentDefinitions.find((item) => item.id === id);
    if (!augment) throw new Error(`missing augment ${id}`);
    return augment;
  });
}

describe("augmentEngine", () => {
  it("excludes augments that the player has already selected", () => {
    const choices = createAugmentChoices(createSeededRandom(12), 20, ["golden-ticket", "stable-econ"]);

    expect(choices.map((augment) => augment.id)).not.toContain("golden-ticket");
    expect(choices.map((augment) => augment.id)).not.toContain("stable-econ");
  });

  it("prefers pair augments when the AI has many pairs", () => {
    const picked = chooseAugmentForAI(
      player(["wan-1", "wan-1", "tong-2", "tong-2", "tiao-3", "tiao-3", "wind-east", "wind-east"]),
      choices(["pair-master", "golden-ticket", "triplet-urgency"])
    );

    expect(picked.id).toBe("pair-master");
  });

  it("prefers defensive augments at low health", () => {
    const picked = chooseAugmentForAI(
      player(["wan-1", "tong-2", "tiao-3"], { hp: 20 }),
      choices(["last-stand", "suit-focus", "stable-econ"])
    );

    expect(picked.id).toBe("last-stand");
  });

  it("prefers suit augments when one suit dominates the hand", () => {
    const picked = chooseAugmentForAI(
      player(["wan-1", "wan-2", "wan-3", "wan-4", "wan-5", "wan-6", "tong-1"]),
      choices(["suit-focus", "golden-ticket", "trait-tracker"])
    );

    expect(picked.id).toBe("suit-focus");
  });

  it("applies economy and shop runtime helpers for augments", () => {
    const goldenTicket = choices(["golden-ticket"])[0];
    const rollFever = choices(["roll-fever"])[0];
    const suitFocus = choices(["suit-focus"])[0];
    const flowingSequence = choices(["flowing-sequence"])[0];
    const traitTracker = choices(["trait-tracker"])[0];
    const focusedPlayer = player(["wan-1", "wan-2", "wan-3", "wan-4", "wan-5", "tong-1"], {
      augments: [goldenTicket, rollFever, suitFocus, flowingSequence, traitTracker],
      activeTraits: [
        { id: "bloodblade", name: "血刃军", count: 2, tier: 1, threshold: 2, description: "" },
        { id: "swiftblade", name: "迅刃", count: 2, tier: 1, threshold: 2, description: "" },
        { id: "starvault", name: "星穹", count: 2, tier: 1, threshold: 2, description: "" }
      ]
    });
    const handDefinitions = focusedPlayer.handTiles.map((tile) => tileDefinitions.find((definition) => definition.id === tile.tileId)!);

    expect(getRefreshCostRefund(focusedPlayer, 2, { next: () => 0.1 })).toBe(2);
    expect(getLevelUpCostModifier(focusedPlayer)).toBe(2);
    expect(getSuitFocusShopBias(focusedPlayer)?.suit).toBe("wan");
    expect(getAugmentRoundGoldBonus(focusedPlayer, handDefinitions)).toBeGreaterThanOrEqual(3);
  });
});
