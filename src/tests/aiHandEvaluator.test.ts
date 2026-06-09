import { describe, expect, it } from "vitest";
import { tileDefinitions } from "../data/tiles";
import type { TileDefinition, TileInstance } from "../types";
import { chooseBestDiscard, evaluateAIHandPlan, scoreCandidateTile } from "../engine/aiHandEvaluator";

function tile(id: string): TileDefinition {
  const definition = tileDefinitions.find((item) => item.id === id);
  if (!definition) throw new Error(`missing tile ${id}`);
  return definition;
}

function tiles(ids: string[]): TileDefinition[] {
  return ids.map(tile);
}

function instances(ids: string[]): TileInstance[] {
  return ids.map((id, index) => ({ instanceId: `${id}@${index}`, tileId: id }));
}

describe("aiHandEvaluator", () => {
  it("recognizes a seven-pairs leaning hand", () => {
    const plan = evaluateAIHandPlan(
      tiles(["wan-1", "wan-1", "tong-2", "tong-2", "tiao-3", "tiao-3", "wan-4", "wan-4", "tong-5", "tong-5", "tiao-6", "tiao-6", "wind-east"])
    );

    expect(plan.planType).toBe("seven_pairs");
    expect(plan.usefulTileIds).toContain("wind-east");
  });

  it("recognizes an all-triplets leaning hand", () => {
    const plan = evaluateAIHandPlan(
      tiles(["wan-1", "wan-1", "wan-1", "tong-2", "tong-2", "tong-2", "tiao-3", "tiao-3", "wind-east", "wind-east", "dragon-red", "dragon-red"])
    );

    expect(plan.planType).toBe("all_triplets");
    expect(plan.usefulTileIds).toContain("wan-1");
  });

  it("recognizes a pure-suit leaning hand", () => {
    const plan = evaluateAIHandPlan(tiles(["wan-1", "wan-2", "wan-3", "wan-4", "wan-5", "wan-6", "wan-7", "wan-8", "tong-1", "wind-east"]));

    expect(plan.planType).toBe("pure_suit");
    expect(plan.targetSuit).toBe("wan");
    expect(plan.weakTileIds).toContain("tong-1");
  });

  it("recognizes a standard sequence leaning hand", () => {
    const plan = evaluateAIHandPlan(tiles(["wan-1", "wan-2", "wan-3", "tong-3", "tong-4", "tong-5", "tiao-6", "tiao-7", "wind-east", "wind-east"]));

    expect(plan.planType).toBe("standard");
    expect(plan.usefulTileIds).toContain("tiao-8");
  });

  it("scores candidate tiles that improve pairs or sequences higher", () => {
    const hand = tiles(["wan-1", "wan-2", "tong-5", "tong-5", "wind-east"]);

    expect(scoreCandidateTile(hand, tile("wan-3"))).toBeGreaterThan(scoreCandidateTile(hand, tile("dragon-white")));
    expect(scoreCandidateTile(hand, tile("tong-5"))).toBeGreaterThan(scoreCandidateTile(hand, tile("dragon-white")));
  });

  it("chooses a weak off-route tile to discard from a full non-winning hand", () => {
    const hand = instances(["wan-1", "wan-2", "wan-3", "wan-4", "wan-5", "wan-6", "wan-7", "wan-8", "wan-9", "tong-1", "wind-east", "dragon-red", "dragon-green", "dragon-white"]);

    const discard = chooseBestDiscard(hand, tileDefinitions);

    expect(discard?.tileId).not.toMatch(/^wan-/);
  });
});
