import { tileDefinitions } from "../data/tiles";
import type { Suit, TileDefinition, TileInstance } from "../types";
import { calculateActiveTraits } from "./traitEngine";
import { estimateDistanceToWin, isWinningHand } from "./huChecker";

export type AIHandPlanType = "standard" | "seven_pairs" | "all_triplets" | "pure_suit";

export interface AIHandPlan {
  planType: AIHandPlanType;
  distance: number;
  score: number;
  targetSuit?: Suit;
  usefulTileIds: string[];
  weakTileIds: string[];
}

interface HandStats {
  counts: Map<string, number>;
  pairCount: number;
  tripletCount: number;
  sequenceCandidateCount: number;
  traitCount: number;
  handCostTotal: number;
  suitCounts: Map<Suit, number>;
  bestSuit?: Suit;
  bestSuitCount: number;
}

const numberedSuits: Suit[] = ["wan", "tong", "tiao"];

function keyFor(tile: TileDefinition): string {
  return tile.rank ? `${tile.suit}-${tile.rank}` : tile.id;
}

function definitionsForTileInstances(instances: TileInstance[], definitions: TileDefinition[]): TileDefinition[] {
  return instances
    .map((instance) => definitions.find((definition) => definition.id === instance.tileId))
    .filter((definition): definition is TileDefinition => Boolean(definition));
}

function countSequenceCandidates(tiles: TileDefinition[]): number {
  const ids = new Set(tiles.map((tile) => keyFor(tile)));
  let candidates = 0;

  for (const suit of numberedSuits) {
    for (let rank = 1; rank <= 7; rank += 1) {
      if (ids.has(`${suit}-${rank}`) && ids.has(`${suit}-${rank + 1}`) && ids.has(`${suit}-${rank + 2}`)) {
        candidates += 1;
      }
    }
  }

  return candidates;
}

function countPartialSequenceLinks(tile: TileDefinition, hand: TileDefinition[]): number {
  if (!tile.rank || !numberedSuits.includes(tile.suit)) {
    return 0;
  }

  const rank = tile.rank;
  return hand.filter((owned) => owned.suit === tile.suit && owned.rank && owned.id !== tile.id && Math.abs(owned.rank - rank) <= 2).length;
}

function collectStats(tiles: TileDefinition[]): HandStats {
  const counts = new Map<string, number>();
  const suitCounts = new Map<Suit, number>();

  for (const tile of tiles) {
    counts.set(tile.id, (counts.get(tile.id) ?? 0) + 1);
    suitCounts.set(tile.suit, (suitCounts.get(tile.suit) ?? 0) + 1);
  }

  let bestSuit: Suit | undefined;
  let bestSuitCount = 0;

  for (const suit of numberedSuits) {
    const count = suitCounts.get(suit) ?? 0;
    if (count > bestSuitCount) {
      bestSuit = suit;
      bestSuitCount = count;
    }
  }

  return {
    counts,
    pairCount: [...counts.values()].filter((count) => count >= 2).length,
    tripletCount: [...counts.values()].filter((count) => count >= 3).length,
    sequenceCandidateCount: countSequenceCandidates(tiles),
    traitCount: calculateActiveTraits(tiles).filter((trait) => trait.tier > 0).length,
    handCostTotal: tiles.reduce((sum, tile) => sum + tile.cost, 0),
    suitCounts,
    bestSuit,
    bestSuitCount
  };
}

function createStandardUsefulIds(tiles: TileDefinition[], definitions: TileDefinition[]): Set<string> {
  const useful = new Set<string>();
  const ids = new Set(tiles.map((tile) => tile.id));

  for (const tile of tiles) {
    const count = tiles.filter((owned) => owned.id === tile.id).length;
    if (count >= 2) {
      useful.add(tile.id);
    }

    if (!tile.rank || !numberedSuits.includes(tile.suit)) {
      continue;
    }

    for (let rank = Math.max(1, tile.rank - 2); rank <= Math.min(9, tile.rank + 2); rank += 1) {
      useful.add(`${tile.suit}-${rank}`);
    }
  }

  for (const definition of definitions) {
    if (!definition.rank || !numberedSuits.includes(definition.suit) || ids.has(definition.id)) {
      continue;
    }

    const linked = tiles.filter((tile) => tile.suit === definition.suit && tile.rank && Math.abs(tile.rank - definition.rank!) <= 2).length;
    if (linked >= 2) {
      useful.add(definition.id);
    }
  }

  return useful;
}

function createWeakIds(tiles: TileDefinition[], planType: AIHandPlanType, targetSuit?: Suit): Set<string> {
  const counts = collectStats(tiles).counts;
  const weak = new Set<string>();

  for (const tile of tiles) {
    const count = counts.get(tile.id) ?? 0;
    const sequenceLinks = countPartialSequenceLinks(tile, tiles);

    if (planType === "pure_suit" && targetSuit && tile.suit !== targetSuit) {
      weak.add(tile.id);
      continue;
    }

    if (planType === "seven_pairs" && count >= 3) {
      weak.add(tile.id);
      continue;
    }

    if (planType === "all_triplets" && count === 1) {
      weak.add(tile.id);
      continue;
    }

    if (count === 1 && sequenceLinks === 0 && tile.traits.length === 0) {
      weak.add(tile.id);
    }
  }

  return weak;
}

function planScore(planType: AIHandPlanType, tiles: TileDefinition[], definitions: TileDefinition[]): AIHandPlan {
  const stats = collectStats(tiles);
  const baseDistance = estimateDistanceToWin(tiles);
  const uniqueCount = stats.counts.size;
  const singleCount = [...stats.counts.values()].filter((count) => count === 1).length;
  const pairSlots = [...stats.counts.values()].reduce((sum, count) => sum + Math.floor(Math.min(count, 2) / 2), 0);
  const targetSuit = stats.bestSuit;
  const offSuitCount = targetSuit ? tiles.filter((tile) => tile.suit !== targetSuit).length : tiles.length;
  let distance = baseDistance;
  let score = 0;
  let usefulTileIds = new Set<string>();

  if (planType === "seven_pairs") {
    distance = isWinningHand(tiles) ? 0 : Math.max(0, 7 - pairSlots) + Math.max(0, 7 - uniqueCount);
    usefulTileIds = new Set(tiles.filter((tile) => (stats.counts.get(tile.id) ?? 0) <= 2).map((tile) => tile.id));
    score = 42 - distance * 11 + stats.pairCount * 8 + singleCount * 2 + stats.traitCount * 3 + stats.handCostTotal * 0.4;
  } else if (planType === "all_triplets") {
    distance = isWinningHand(tiles) ? 0 : Math.max(0, 4 - stats.tripletCount) * 2 + (stats.pairCount > stats.tripletCount ? 0 : 1);
    usefulTileIds = new Set(tiles.filter((tile) => (stats.counts.get(tile.id) ?? 0) >= 2).map((tile) => tile.id));
    score = 38 - distance * 10 + stats.tripletCount * 13 + stats.pairCount * 5 + stats.traitCount * 3 + stats.handCostTotal * 0.35;
  } else if (planType === "pure_suit") {
    distance = isWinningHand(tiles) ? 0 : Math.max(1, baseDistance + Math.ceil(offSuitCount / 2) - Math.floor(stats.bestSuitCount / 5));
    usefulTileIds = new Set(definitions.filter((tile) => targetSuit && tile.suit === targetSuit).map((tile) => tile.id));
    score = 34 - distance * 9 + stats.bestSuitCount * 7 - offSuitCount * 5 + stats.sequenceCandidateCount * 4 + stats.traitCount * 3 + stats.handCostTotal * 0.25;
  } else {
    distance = baseDistance;
    usefulTileIds = createStandardUsefulIds(tiles, definitions);
    score =
      36 -
      distance * 12 +
      stats.sequenceCandidateCount * 7 +
      stats.tripletCount * 8 +
      stats.pairCount * 5 +
      stats.traitCount * 3 +
      stats.handCostTotal * 0.25;
  }

  return {
    planType,
    distance,
    score: Number(score.toFixed(2)),
    targetSuit,
    usefulTileIds: [...usefulTileIds],
    weakTileIds: [...createWeakIds(tiles, planType, planType === "pure_suit" ? targetSuit : undefined)]
  };
}

export function evaluateAIHandPlan(tiles: TileDefinition[], definitions = tileDefinitions): AIHandPlan {
  if (tiles.length === 0) {
    return { planType: "standard", distance: 6, score: 0, usefulTileIds: [], weakTileIds: [] };
  }

  const plans = (["standard", "seven_pairs", "all_triplets", "pure_suit"] as const).map((planType) => planScore(planType, tiles, definitions));

  return plans.sort((left, right) => right.score - left.score || left.distance - right.distance)[0];
}

export function scoreCandidateTile(hand: TileDefinition[], candidate: TileDefinition, definitions = tileDefinitions): number {
  const before = evaluateAIHandPlan(hand, definitions);
  const after = evaluateAIHandPlan([...hand, candidate], definitions);
  const counts = collectStats(hand).counts;
  const sameCount = counts.get(candidate.id) ?? 0;
  const sequenceLinks = countPartialSequenceLinks(candidate, hand);
  const traitMatches = hand.reduce((sum, tile) => sum + tile.traits.filter((trait) => candidate.traits.includes(trait)).length, 0);
  const routeBonus = before.usefulTileIds.includes(candidate.id) || after.usefulTileIds.includes(candidate.id) ? 8 : 0;
  const distanceBonus = Math.max(0, before.distance - after.distance) * 16;
  const duplicateBonus = sameCount === 1 ? 9 : sameCount >= 2 ? 15 : 0;
  const sequenceBonus = sequenceLinks * 4;
  const suitBonus = before.targetSuit && candidate.suit === before.targetSuit ? 4 : 0;
  const weakPenalty = before.planType === "pure_suit" && before.targetSuit && candidate.suit !== before.targetSuit ? 10 : 0;

  return Number((after.score - before.score + routeBonus + distanceBonus + duplicateBonus + sequenceBonus + traitMatches * 2 + suitBonus + candidate.cost * 0.8 - weakPenalty).toFixed(2));
}

export function chooseBestDiscard(handTiles: TileInstance[], definitions = tileDefinitions): TileInstance | null {
  const hand = definitionsForTileInstances(handTiles, definitions);

  if (handTiles.length === 0 || hand.length === 0 || isWinningHand(hand)) {
    return null;
  }

  const currentPlan = evaluateAIHandPlan(hand, definitions);
  const scored = handTiles
    .map((tile, index) => {
      const definition = hand[index];
      const remaining = hand.filter((_, otherIndex) => otherIndex !== index);
      const nextPlan = evaluateAIHandPlan(remaining, definitions);
      const isWeak = currentPlan.weakTileIds.includes(definition.id);
      const usefulPenalty = currentPlan.usefulTileIds.includes(definition.id) ? 8 : 0;
      const sameCount = currentPlan.planType === "seven_pairs" ? hand.filter((owned) => owned.id === definition.id).length : 0;
      const pairPenalty = sameCount === 2 ? 10 : 0;

      return {
        tile,
        score: nextPlan.score - currentPlan.score + (isWeak ? 14 : 0) - usefulPenalty - pairPenalty - definition.cost * 0.25
      };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.tile ?? null;
}
