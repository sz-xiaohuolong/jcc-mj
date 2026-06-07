import type { ActiveTrait, CityDefinition, PlayerState, SettlementEntry, TileDefinition } from "../types";
import { estimateDistanceToWin, getWinningPatterns, isWinningHand } from "./huChecker";

function countTriplets(tiles: TileDefinition[]): number {
  const counts = new Map<string, number>();

  for (const tile of tiles) {
    counts.set(tile.id, (counts.get(tile.id) ?? 0) + 1);
  }

  return [...counts.values()].filter((count) => count >= 3).length;
}

function traitDamageBonus(activeTraits: ActiveTrait[], tiles: TileDefinition[]): number {
  const bloodbladeTier = activeTraits.find((trait) => trait.id === "bloodblade")?.tier ?? 0;

  return bloodbladeTier * countTriplets(tiles) * 2;
}

function defenseReduction(player: PlayerState, distance: number): number {
  const shieldTier = player.activeTraits.find((trait) => trait.id === "shieldwall")?.tier ?? 0;
  const lowHpReduction = player.augments.some((augment) => augment.id === "last-stand") && player.hp < 35 ? 0.3 : 0;
  const readyReduction = distance <= 2 ? shieldTier * 0.08 : 0;

  return Math.min(0.55, lowHpReduction + readyReduction);
}

export function settlePlayer({
  player,
  tiles,
  city
}: {
  player: PlayerState;
  tiles: TileDefinition[];
  city: CityDefinition | null;
}): SettlementEntry {
  const patterns = getWinningPatterns(tiles);
  const distance = estimateDistanceToWin(tiles);
  const winning = isWinningHand(tiles);
  let damage = 0;

  if (winning) {
    damage =
      12 +
      patterns.reduce((sum, pattern) => sum + pattern.damageBonus, 0) +
      traitDamageBonus(player.activeTraits, tiles);

    if (city?.modifiers.sequenceDamageBonus && patterns.some((pattern) => pattern.id === "standard")) {
      damage += city.modifiers.sequenceDamageBonus;
    }

    if (player.augments.some((augment) => augment.id === "triplet-urgency") && countTriplets(tiles) > 0) {
      damage += 5;
    }

    if (player.augments.some((augment) => augment.id === "final-ready") && distance <= 1) {
      damage += 8;
    }
  } else {
    damage = distance <= 2 ? 4 : distance <= 3 ? 7 : 10;
    damage = Math.ceil(damage * (1 - defenseReduction(player, distance)));
    damage = Math.ceil(damage * (city?.modifiers.damageTakenMultiplier ?? 1));
  }

  return {
    playerId: player.id,
    playerName: player.name,
    hpBefore: player.hp,
    hpAfter: winning ? player.hp : Math.max(0, player.hp - damage),
    damage,
    status: winning ? "winning" : distance <= 2 ? "ready" : distance <= 3 ? "close" : "unformed",
    patterns
  };
}
