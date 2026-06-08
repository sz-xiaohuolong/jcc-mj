import { augmentDefinitions } from "../data/augments";
import type { AugmentDefinition, PlayerState, RandomSource } from "../types";
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

export function chooseAugmentForAI(player: PlayerState, choices: AugmentDefinition[]): AugmentDefinition {
  const traitCount = player.activeTraits.filter((trait) => trait.tier > 0).length;
  const ownedAugmentIds = new Set(player.augments.map((augment) => augment.id));
  const availableChoices = choices.filter((augment) => !ownedAugmentIds.has(augment.id));
  const selectableChoices = availableChoices.length > 0 ? availableChoices : choices;

  return (
    selectableChoices.find((augment) => traitCount >= 2 && augment.tags.includes("trait")) ??
    selectableChoices.find((augment) => player.gold < 8 && augment.tags.includes("economy")) ??
    selectableChoices.find((augment) => augment.tags.includes("damage")) ??
    selectableChoices[0]
  );
}

export function getInterestCapBonus(player: PlayerState): number {
  return player.augments.some((augment) => augment.id === "stable-econ") ? 2 : 0;
}

export function getRefreshCostModifier(player: PlayerState): number {
  return player.augments.some((augment) => augment.id === "roll-fever") ? -1 : 0;
}
