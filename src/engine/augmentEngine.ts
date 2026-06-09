import { augmentDefinitions } from "../data/augments";
import { tileDefinitions } from "../data/tiles";
import type { AugmentDefinition, PlayerState, RandomSource, Suit, TileDefinition } from "../types";
import { shuffle } from "../utils/random";

export function shouldOfferAugment(round: number): boolean {
  return [2, 5, 8].includes(round);
}

export function createAugmentChoices(rng: RandomSource, count = 3, excludedAugmentIds: string[] = []): AugmentDefinition[] {
  const excluded = new Set(excludedAugmentIds);
  return shuffle(
    augmentDefinitions.filter((augment) => !excluded.has(augment.id)),
    rng
  ).slice(0, count);
}

function handDefinitions(player: PlayerState, definitions: TileDefinition[]): TileDefinition[] {
  return player.handTiles
    .map((tile) => definitions.find((definition) => definition.id === tile.tileId))
    .filter((definition): definition is TileDefinition => Boolean(definition));
}

function bestNumberedSuitCount(tiles: TileDefinition[]): number {
  const counts = new Map<Suit, number>();

  for (const tile of tiles) {
    if (tile.suit === "wan" || tile.suit === "tong" || tile.suit === "tiao") {
      counts.set(tile.suit, (counts.get(tile.suit) ?? 0) + 1);
    }
  }

  return Math.max(0, ...counts.values());
}

function mostCommonNumberedSuit(tiles: TileDefinition[]): Suit | undefined {
  const counts = new Map<Suit, number>();

  for (const tile of tiles) {
    if (tile.suit === "wan" || tile.suit === "tong" || tile.suit === "tiao") {
      counts.set(tile.suit, (counts.get(tile.suit) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function countSequenceCandidates(tiles: TileDefinition[]): number {
  const ids = new Set(tiles.map((tile) => (tile.rank ? `${tile.suit}-${tile.rank}` : tile.id)));
  let candidates = 0;

  for (const suit of ["wan", "tong", "tiao"] as const) {
    for (let rank = 1; rank <= 7; rank += 1) {
      if (ids.has(`${suit}-${rank}`) && ids.has(`${suit}-${rank + 1}`) && ids.has(`${suit}-${rank + 2}`)) {
        candidates += 1;
      }
    }
  }

  return candidates;
}

function scoreAugmentForAI(player: PlayerState, augment: AugmentDefinition, definitions: TileDefinition[]): number {
  const tiles = handDefinitions(player, definitions);
  const counts = new Map<string, number>();

  for (const tile of tiles) {
    counts.set(tile.id, (counts.get(tile.id) ?? 0) + 1);
  }

  const pairCount = [...counts.values()].filter((count) => count >= 2).length;
  const duplicateCount = [...counts.values()].filter((count) => count >= 2).reduce((sum, count) => sum + count, 0);
  const tripletCount = [...counts.values()].filter((count) => count >= 3).length;
  const suitCount = bestNumberedSuitCount(tiles);
  const traitCount = player.activeTraits.filter((trait) => trait.tier > 0).length;
  let score = augment.rarity === "prismatic" ? 6 : augment.rarity === "gold" ? 4 : 2;

  if (player.hp < 35 && augment.id === "last-stand") score += 45;
  if (pairCount >= 4 && augment.tags.includes("pair")) score += 36;
  if (pairCount >= 5 && augment.id === "pair-master") score += 12;
  if ((tripletCount > 0 || duplicateCount >= 6) && (augment.tags.includes("triplet") || augment.id === "triplet-urgency")) score += 34;
  if (suitCount >= 6 && augment.tags.includes("suit")) score += 32;
  if (traitCount >= 2 && augment.tags.includes("trait")) score += 22;
  if (player.gold < 8 && (augment.tags.includes("economy") || augment.id === "golden-ticket")) score += 22;
  if (player.gold < 6 && augment.tags.includes("shop")) score += 18;
  if (tiles.length < 12 && augment.id === "fast-form") score += 18;
  if (tiles.length < 11 && augment.id === "blessed-start") score += 20;
  if (augment.id === "final-ready" && player.hp < 55) score += 10;
  if (augment.id === "stable-econ" && player.gold >= 10) score += 14;

  return score;
}

export function chooseAugmentForAI(player: PlayerState, choices: AugmentDefinition[], definitions = tileDefinitions): AugmentDefinition {
  const traitCount = player.activeTraits.filter((trait) => trait.tier > 0).length;
  const ownedAugmentIds = new Set(player.augments.map((augment) => augment.id));
  const availableChoices = choices.filter((augment) => !ownedAugmentIds.has(augment.id));
  const selectableChoices = availableChoices.length > 0 ? availableChoices : choices;

  return [...selectableChoices].sort((left, right) => {
    const scoreDelta = scoreAugmentForAI(player, right, definitions) - scoreAugmentForAI(player, left, definitions);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    if (traitCount >= 2 && left.tags.includes("trait")) return -1;
    if (traitCount >= 2 && right.tags.includes("trait")) return 1;
    return 0;
  })[0];
}

export function getInterestCapBonus(player: PlayerState): number {
  return player.augments.some((augment) => augment.id === "stable-econ") ? 2 : 0;
}

export function getRefreshCostModifier(player: PlayerState): number {
  return player.augments.some((augment) => augment.id === "roll-fever") ? -1 : 0;
}

export function getLevelUpCostModifier(player: PlayerState): number {
  return player.augments.some((augment) => augment.id === "roll-fever") ? 2 : 0;
}

export function getRefreshCostRefund(player: PlayerState, cost: number, rng: RandomSource): number {
  if (cost <= 0 || !player.augments.some((augment) => augment.id === "golden-ticket")) {
    return 0;
  }

  return rng.next() < 0.25 ? cost : 0;
}

export function getSuitFocusShopBias(player: PlayerState, definitions = tileDefinitions): { suit: Suit; chance: number } | undefined {
  if (!player.augments.some((augment) => augment.id === "suit-focus")) {
    return undefined;
  }

  const suit = mostCommonNumberedSuit(handDefinitions(player, definitions));
  return suit ? { suit, chance: 0.45 } : undefined;
}

export function getAugmentRoundGoldBonus(player: PlayerState, hand: TileDefinition[]): number {
  const sequenceGold = player.augments.some((augment) => augment.id === "flowing-sequence") ? countSequenceCandidates(hand) : 0;
  const traitGold =
    player.augments.some((augment) => augment.id === "trait-tracker") &&
    player.activeTraits.filter((trait) => trait.tier > 0).length >= 3
      ? 2
      : 0;

  return sequenceGold + traitGold;
}
