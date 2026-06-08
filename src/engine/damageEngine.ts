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

function patternPriority(patterns: ReturnType<typeof getWinningPatterns>): number {
  if (patterns.some((pattern) => pattern.id === "pure-suit")) return 4;
  if (patterns.some((pattern) => pattern.id === "all-triplets")) return 3;
  if (patterns.some((pattern) => pattern.id === "seven-pairs")) return 2;
  if (patterns.some((pattern) => pattern.id === "standard")) return 1;
  return 0;
}

function traitTierTotal(activeTraits: ActiveTrait[]): number {
  return activeTraits.reduce((sum, trait) => sum + trait.tier, 0);
}

function handCostTotal(tiles: TileDefinition[]): number {
  return tiles.reduce((sum, tile) => sum + tile.cost, 0);
}

function augmentCombatBonus(player: PlayerState, tiles: TileDefinition[], patterns: ReturnType<typeof getWinningPatterns>): number {
  let bonus = 0;
  const triplets = countTriplets(tiles);

  if (player.augments.some((augment) => augment.id === "triplet-urgency") && triplets > 0) {
    bonus += 5;
  }

  if (player.augments.some((augment) => augment.id === "final-ready")) {
    bonus += 3;
  }

  if (player.augments.some((augment) => augment.id === "pair-master") && patterns.some((pattern) => pattern.id === "seven-pairs")) {
    bonus += 2;
  }

  if (player.augments.some((augment) => augment.id === "suit-focus") && patterns.some((pattern) => pattern.id === "pure-suit")) {
    bonus += 2;
  }

  if (player.augments.some((augment) => augment.id === "flowing-sequence") && patterns.some((pattern) => pattern.id === "standard")) {
    bonus += 2;
  }

  return bonus;
}

export function calculateWinningCombatScore({
  player,
  tiles,
  city
}: {
  player: PlayerState;
  tiles: TileDefinition[];
  city: CityDefinition | null;
}): number {
  const patterns = getWinningPatterns(tiles);
  const activeTraits = player.activeTraits.filter((trait) => trait.tier > 0);
  const advancedTraits = activeTraits.filter((trait) => trait.tier >= 2);
  const tripletBonus = activeTraits.some((trait) => trait.id === "bloodblade") ? countTriplets(tiles) : 0;
  const cityBonus =
    city?.modifiers.sequenceDamageBonus && patterns.some((pattern) => pattern.id === "standard")
      ? city.modifiers.sequenceDamageBonus
      : 0;

  return (
    10 +
    patterns.reduce((sum, pattern) => sum + pattern.damageBonus, 0) +
    activeTraits.length * 2 +
    advancedTraits.length * 2 +
    tripletBonus +
    cityBonus +
    augmentCombatBonus(player, tiles, patterns)
  );
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
    patterns,
    combatScore: winning ? calculateWinningCombatScore({ player, tiles, city }) : 0,
    isRoundWinner: false,
    roundRank: 0
  };
}

export function settlePlayers({
  players,
  tilesByPlayer,
  city
}: {
  players: PlayerState[];
  tilesByPlayer: Map<string, TileDefinition[]>;
  city: CityDefinition | null;
}): SettlementEntry[] {
  const entries = players.map((player) =>
    settlePlayer({
      player,
      tiles: tilesByPlayer.get(player.id) ?? [],
      city
    })
  );
  const winningEntries = entries.filter((entry) => entry.status === "winning");

  if (winningEntries.length === 0) {
    return entries;
  }

  const tiebreakers = new Map(
    players.map((player) => {
      const tiles = tilesByPlayer.get(player.id) ?? [];
      const patterns = getWinningPatterns(tiles);
      return [
        player.id,
        {
          patternPriority: patternPriority(patterns),
          traitTierTotal: traitTierTotal(player.activeTraits),
          handCostTotal: handCostTotal(tiles),
          gold: player.gold
        }
      ];
    })
  );
  const sortedWinners = [...winningEntries].sort((left, right) => {
    const leftTie = tiebreakers.get(left.playerId);
    const rightTie = tiebreakers.get(right.playerId);

    return (
      right.combatScore - left.combatScore ||
      (rightTie?.patternPriority ?? 0) - (leftTie?.patternPriority ?? 0) ||
      (rightTie?.traitTierTotal ?? 0) - (leftTie?.traitTierTotal ?? 0) ||
      (rightTie?.handCostTotal ?? 0) - (leftTie?.handCostTotal ?? 0) ||
      (rightTie?.gold ?? 0) - (leftTie?.gold ?? 0)
    );
  });
  const best = sortedWinners[0];
  const bestTie = tiebreakers.get(best.playerId);
  const isTiedWithBest = (entry: SettlementEntry): boolean => {
    const tie = tiebreakers.get(entry.playerId);

    return (
      entry.combatScore === best.combatScore &&
      (tie?.patternPriority ?? 0) === (bestTie?.patternPriority ?? 0) &&
      (tie?.traitTierTotal ?? 0) === (bestTie?.traitTierTotal ?? 0) &&
      (tie?.handCostTotal ?? 0) === (bestTie?.handCostTotal ?? 0) &&
      (tie?.gold ?? 0) === (bestTie?.gold ?? 0)
    );
  };

  return entries.map((entry) => {
    if (entry.status !== "winning") {
      return entry;
    }

    if (isTiedWithBest(entry)) {
      return { ...entry, isRoundWinner: true, roundRank: 1 };
    }

    const damage = Math.min(5, Math.max(1, best.combatScore - entry.combatScore));

    return {
      ...entry,
      damage,
      hpAfter: Math.max(0, entry.hpBefore - damage),
      roundRank: sortedWinners.findIndex((winner) => winner.playerId === entry.playerId) + 1
    };
  });
}
