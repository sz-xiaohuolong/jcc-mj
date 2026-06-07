import type { GameState, RandomSource, TileDefinition, TileInstance } from "../types";
import { buyTile, definitionsForInstances, discardTile, refreshGameShop } from "./gameEngine";

function tileValue(tile: TileDefinition, hand: TileDefinition[]): number {
  const sameCount = hand.filter((owned) => owned.id === tile.id).length;
  const adjacentCount = hand.filter(
    (owned) => owned.suit === tile.suit && owned.rank && tile.rank && Math.abs(owned.rank - tile.rank) <= 2
  ).length;
  const traitMatches = hand.reduce((sum, owned) => sum + owned.traits.filter((trait) => tile.traits.includes(trait)).length, 0);

  return sameCount * 8 + adjacentCount * 3 + traitMatches * 2 + tile.cost;
}

function lowestValueTile(hand: TileInstance[], definitions: TileDefinition[]): TileInstance | null {
  const handDefinitions = definitionsForInstances(hand, definitions);
  const scored = hand.map((tile, index) => ({
    tile,
    score: tileValue(handDefinitions[index], handDefinitions.filter((_, otherIndex) => otherIndex !== index))
  }));

  return scored.sort((left, right) => left.score - right.score)[0]?.tile ?? null;
}

export function runAITurn({
  game,
  playerId,
  definitions,
  rng
}: {
  game: GameState;
  playerId: string;
  definitions: TileDefinition[];
  rng: RandomSource;
}): GameState {
  let nextGame = game;
  let ai = nextGame.players.find((player) => player.id === playerId);

  if (!ai || !ai.isAlive) {
    return game;
  }

  for (let refreshes = 0; refreshes < 2; refreshes += 1) {
    ai = nextGame.players.find((player) => player.id === playerId);

    if (!ai) {
      break;
    }

    const handDefinitions = definitionsForInstances(ai.handTiles, definitions);
    const availableGold = ai.gold;
    const affordableShop = nextGame.shop
      .map((shopTile) => ({
        instance: shopTile,
        definition: definitions.find((definition) => definition.id === shopTile.tileId)
      }))
      .filter((item): item is { instance: TileInstance; definition: TileDefinition } => Boolean(item.definition))
      .filter((item) => item.definition.cost <= availableGold)
      .map((item) => ({ ...item, score: tileValue(item.definition, handDefinitions) }))
      .sort((left, right) => right.score - left.score);

    const best = affordableShop[0];

    if (best && best.score >= 7) {
      nextGame = buyTile(nextGame, playerId, best.instance.instanceId);
      continue;
    }

    if (ai && ai.gold >= 4 && refreshes === 0 && rng.next() > 0.35) {
      nextGame = refreshGameShop(nextGame, rng);
      continue;
    }

    break;
  }

  ai = nextGame.players.find((player) => player.id === playerId);

  while (ai && ai.handTiles.length > 14) {
    const discard = lowestValueTile(ai.handTiles, definitions);

    if (!discard) {
      break;
    }

    nextGame = discardTile(nextGame, playerId, discard.instanceId);
    ai = nextGame.players.find((player) => player.id === playerId);
  }

  return nextGame;
}
