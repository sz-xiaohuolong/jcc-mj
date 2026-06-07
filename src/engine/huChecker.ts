import type { Suit, TileDefinition, WinningPattern } from "../types";

const numberedSuits: Suit[] = ["wan", "tong", "tiao"];

function countById(tiles: TileDefinition[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const tile of tiles) {
    counts.set(tile.id, (counts.get(tile.id) ?? 0) + 1);
  }

  return counts;
}

function keyFor(tile: TileDefinition): string {
  return tile.rank ? `${tile.suit}-${tile.rank}` : tile.id;
}

function canUseSequence(tile: TileDefinition, counts: Map<string, number>): boolean {
  if (!tile.rank || !numberedSuits.includes(tile.suit)) {
    return false;
  }

  return (
    tile.rank <= 7 &&
    (counts.get(`${tile.suit}-${tile.rank + 1}`) ?? 0) > 0 &&
    (counts.get(`${tile.suit}-${tile.rank + 2}`) ?? 0) > 0
  );
}

function decrement(counts: Map<string, number>, key: string, amount: number): void {
  counts.set(key, (counts.get(key) ?? 0) - amount);
}

function cloneCounts(counts: Map<string, number>): Map<string, number> {
  return new Map([...counts.entries()].filter(([, value]) => value > 0));
}

function canFormMelds(counts: Map<string, number>, definitionsById: Map<string, TileDefinition>): boolean {
  const first = [...counts.entries()].find(([, value]) => value > 0);

  if (!first) {
    return true;
  }

  const [id, count] = first;
  const tile = definitionsById.get(id);

  if (!tile) {
    return false;
  }

  if (count >= 3) {
    const tripletCounts = cloneCounts(counts);
    decrement(tripletCounts, id, 3);

    if (canFormMelds(tripletCounts, definitionsById)) {
      return true;
    }
  }

  if (canUseSequence(tile, counts)) {
    const sequenceCounts = cloneCounts(counts);
    decrement(sequenceCounts, id, 1);
    decrement(sequenceCounts, `${tile.suit}-${(tile.rank ?? 0) + 1}`, 1);
    decrement(sequenceCounts, `${tile.suit}-${(tile.rank ?? 0) + 2}`, 1);

    if (canFormMelds(sequenceCounts, definitionsById)) {
      return true;
    }
  }

  return false;
}

export function isStandardWinningHand(tiles: TileDefinition[]): boolean {
  if (tiles.length !== 14) {
    return false;
  }

  const normalizedTiles = tiles.map((tile) => ({ ...tile, id: keyFor(tile) }));
  const counts = countById(normalizedTiles);
  const definitionsById = new Map(normalizedTiles.map((tile) => [tile.id, tile]));

  for (const [id, count] of counts.entries()) {
    if (count < 2) {
      continue;
    }

    const remaining = cloneCounts(counts);
    decrement(remaining, id, 2);

    if (canFormMelds(remaining, definitionsById)) {
      return true;
    }
  }

  return false;
}

export function isSevenPairs(tiles: TileDefinition[]): boolean {
  if (tiles.length !== 14) {
    return false;
  }

  const counts = countById(tiles);
  return counts.size === 7 && [...counts.values()].every((count) => count === 2);
}

export function isAllTriplets(tiles: TileDefinition[]): boolean {
  if (tiles.length !== 14) {
    return false;
  }

  const counts = countById(tiles);
  const pairCount = [...counts.values()].filter((count) => count === 2).length;
  const tripletCount = [...counts.values()].filter((count) => count === 3).length;

  return pairCount === 1 && tripletCount === 4;
}

export function isPureSuit(tiles: TileDefinition[]): boolean {
  if (tiles.length === 0) {
    return false;
  }

  const suits = new Set(tiles.filter((tile) => numberedSuits.includes(tile.suit)).map((tile) => tile.suit));

  return suits.size === 1 && tiles.every((tile) => tile.suit === [...suits][0]);
}

export function isWinningHand(tiles: TileDefinition[]): boolean {
  return isStandardWinningHand(tiles) || isSevenPairs(tiles);
}

export function getWinningPatterns(tiles: TileDefinition[]): WinningPattern[] {
  const patterns: WinningPattern[] = [];

  if (isStandardWinningHand(tiles)) {
    patterns.push({ id: "standard", name: "基础胡牌", damageBonus: 0 });
  }

  if (isSevenPairs(tiles)) {
    patterns.push({ id: "seven-pairs", name: "七对子", damageBonus: 6 });
  }

  if (isAllTriplets(tiles)) {
    patterns.push({ id: "all-triplets", name: "碰碰胡", damageBonus: 5 });
  }

  if (isPureSuit(tiles) && isWinningHand(tiles)) {
    patterns.push({ id: "pure-suit", name: "清一色", damageBonus: 7 });
  }

  return patterns;
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

export function estimateDistanceToWin(tiles: TileDefinition[]): number {
  if (isWinningHand(tiles)) {
    return 0;
  }

  const counts = countById(tiles);
  const pairs = [...counts.values()].filter((count) => count >= 2).length;
  const triplets = [...counts.values()].filter((count) => count >= 3).length;
  const sequences = countSequenceCandidates(tiles);
  const usefulGroups = Math.min(4, triplets + sequences);
  const hasPair = pairs > 0 ? 1 : 0;

  return Math.max(1, 6 - usefulGroups - hasPair);
}
