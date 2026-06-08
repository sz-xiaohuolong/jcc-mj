import { tileDefinitions } from "../data/tiles";
import type { AugmentDefinition, GameState, PlayerState, RandomSource, Suit, TileDefinition, TileInstance, TileWithDefinition, TraitId } from "../types";
import { randomInt } from "../utils/random";
import { calculateActiveTraits } from "./traitEngine";

const numberedSuits: Suit[] = ["wan", "tong", "tiao"];

function definitionFor(tile: TileInstance): TileDefinition | undefined {
  return tileDefinitions.find((definition) => definition.id === tile.tileId);
}

function withDefinitions(tiles: TileInstance[]): TileWithDefinition[] {
  return tiles
    .map((tile) => {
      const definition = definitionFor(tile);
      return definition ? { ...tile, definition } : null;
    })
    .filter((tile): tile is TileWithDefinition => Boolean(tile));
}

function mostCommonNumberedSuit(player: PlayerState, rng: RandomSource): Suit {
  const counts = new Map<Suit, number>();

  for (const definition of withDefinitions(player.handTiles).map((tile) => tile.definition)) {
    if (numberedSuits.includes(definition.suit)) {
      counts.set(definition.suit, (counts.get(definition.suit) ?? 0) + 1);
    }
  }

  let bestSuit = numberedSuits[randomInt(rng, numberedSuits.length)];
  let bestCount = counts.get(bestSuit) ?? 0;

  for (const suit of numberedSuits) {
    const count = counts.get(suit) ?? 0;
    if (count > bestCount) {
      bestSuit = suit;
      bestCount = count;
    }
  }

  return bestSuit;
}

function mostCommonTrait(player: PlayerState): TraitId | undefined {
  const counts = new Map<TraitId, number>();

  for (const definition of withDefinitions(player.handTiles).map((tile) => tile.definition)) {
    for (const trait of definition.traits) {
      counts.set(trait, (counts.get(trait) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function drawMatchingTiles({
  pool,
  count,
  rng,
  prefer,
  fallback
}: {
  pool: TileInstance[];
  count: number;
  rng: RandomSource;
  prefer: (tile: TileWithDefinition) => boolean;
  fallback: (tile: TileWithDefinition) => boolean;
}): { drawn: TileInstance[]; pool: TileInstance[] } {
  const remaining = [...pool];
  const drawn: TileInstance[] = [];

  while (drawn.length < count && remaining.length > 0) {
    const hydrated = withDefinitions(remaining);
    let candidates = hydrated.filter(prefer);

    if (candidates.length === 0) {
      candidates = hydrated.filter(fallback);
    }

    if (candidates.length === 0) {
      candidates = hydrated;
    }

    const picked = candidates[randomInt(rng, candidates.length)];
    const poolIndex = remaining.findIndex((tile) => tile.instanceId === picked.instanceId);
    drawn.push({ instanceId: picked.instanceId, tileId: picked.tileId });
    remaining.splice(poolIndex, 1);
  }

  return { drawn, pool: remaining };
}

function addTilesToPlayer(player: PlayerState, tiles: TileInstance[]): PlayerState {
  const handTiles = [...player.handTiles, ...tiles].slice(0, 14);

  return {
    ...player,
    handTiles,
    activeTraits: calculateActiveTraits(withDefinitions(handTiles).map((tile) => tile.definition))
  };
}

export function applyImmediateAugmentEffect(game: GameState, playerId: string, augment: AugmentDefinition, rng: RandomSource): GameState {
  const player = game.players.find((item) => item.id === playerId);

  if (!player) {
    return game;
  }

  if (augment.id === "fast-form") {
    const suit = mostCommonNumberedSuit(player, rng);
    const availableSlots = Math.max(0, 14 - player.handTiles.length);
    const result = drawMatchingTiles({
      pool: game.tilePool,
      count: Math.min(2, availableSlots),
      rng,
      prefer: (tile) => tile.definition.suit === suit && tile.definition.cost <= 2,
      fallback: (tile) => numberedSuits.includes(tile.definition.suit) && tile.definition.cost <= 2
    });

    return {
      ...game,
      tilePool: result.pool,
      players: game.players.map((item) => (item.id === playerId ? addTilesToPlayer(item, result.drawn) : item))
    };
  }

  if (augment.id === "blessed-start") {
    const trait = mostCommonTrait(player);
    const availableSlots = Math.max(0, 14 - player.handTiles.length);
    const result = drawMatchingTiles({
      pool: game.tilePool,
      count: Math.min(3, availableSlots),
      rng,
      prefer: (tile) => Boolean(trait && tile.definition.traits.includes(trait)),
      fallback: (tile) => tile.definition.cost <= 3
    });

    return {
      ...game,
      tilePool: result.pool,
      players: game.players.map((item) => (item.id === playerId ? addTilesToPlayer(item, result.drawn) : item))
    };
  }

  return game;
}
