import { augmentDefinitions } from "../data/augments";
import type { AugmentDefinition, PlayerState, RandomSource } from "../types";
import { shuffle } from "../utils/random";

export function shouldOfferAugment(round: number): boolean {
  return [2, 5, 8].includes(round);
}

export function createAugmentChoices(rng: RandomSource, count = 3): AugmentDefinition[] {
  return shuffle(augmentDefinitions, rng).slice(0, count);
}

export function chooseAugmentForAI(player: PlayerState, choices: AugmentDefinition[]): AugmentDefinition {
  const traitCount = player.activeTraits.filter((trait) => trait.tier > 0).length;

  return (
    choices.find((augment) => traitCount >= 2 && augment.tags.includes("trait")) ??
    choices.find((augment) => player.gold < 8 && augment.tags.includes("economy")) ??
    choices.find((augment) => augment.tags.includes("damage")) ??
    choices[0]
  );
}

export function getInterestCapBonus(player: PlayerState): number {
  return player.augments.some((augment) => augment.id === "stable-econ") ? 2 : 0;
}

export function getRefreshCostModifier(player: PlayerState): number {
  return player.augments.some((augment) => augment.id === "roll-fever") ? -1 : 0;
}
