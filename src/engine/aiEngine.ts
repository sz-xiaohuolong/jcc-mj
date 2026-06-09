import type { GameState, PlayerState, RandomSource, TileDefinition, TileInstance } from "../types";
import { chooseBestDiscard, evaluateAIHandPlan, scoreCandidateTile } from "./aiHandEvaluator";
import { getLevelUpCostModifier, getRefreshCostModifier, getRefreshCostRefund } from "./augmentEngine";
import { buyTile, definitionsForInstances, getLevelUpCost, levelUpPlayer, refreshGameShop, sellTile } from "./gameEngine";
import { isWinningHand } from "./huChecker";
import { getRefreshDiscount } from "./traitEngine";

function refreshCost(player: PlayerState): number {
  const discount = getRefreshDiscount(player.activeTraits, !player.hasRefreshedThisRound) + Math.abs(getRefreshCostModifier(player));
  return Math.max(0, 2 - discount);
}

function shopTilesWithDefinitions(shop: TileInstance[], definitions: TileDefinition[]): Array<{ instance: TileInstance; definition: TileDefinition }> {
  return shop
    .map((shopTile) => ({
      instance: shopTile,
      definition: definitions.find((definition) => definition.id === shopTile.tileId)
    }))
    .filter((item): item is { instance: TileInstance; definition: TileDefinition } => Boolean(item.definition));
}

function refreshShopForAI(game: GameState, playerId: string, rng: RandomSource): GameState {
  const player = game.players.find((item) => item.id === playerId);

  if (!player || player.lockedShop) {
    return game;
  }

  const cost = refreshCost(player);

  if (player.gold < cost) {
    return game;
  }
  const refund = getRefreshCostRefund(player, cost, rng);
  const finalCost = cost - refund;

  const originalCurrentPlayerId = game.currentPlayerId;
  const charged = {
    ...game,
    players: game.players.map((item) =>
      item.id === playerId ? { ...item, gold: item.gold - finalCost, hasRefreshedThisRound: true } : item
    )
  };
  const refreshed = refreshGameShop({ ...charged, currentPlayerId: playerId }, rng);

  return {
    ...refreshed,
    currentPlayerId: originalCurrentPlayerId
  };
}

function maybeLevelUp(game: GameState, playerId: string, planDistance: number): GameState {
  const player = game.players.find((item) => item.id === playerId);

  if (!player || player.level >= 6 || game.round < 3 || player.hp < 35 || planDistance <= 2) {
    return game;
  }

  const cost = getLevelUpCost(player.level) + getLevelUpCostModifier(player);

  if (player.gold < cost + 6) {
    return game;
  }

  return levelUpPlayer(game, playerId);
}

function buyBestCandidate(game: GameState, playerId: string, definitions: TileDefinition[], minScore: number): { game: GameState; bought: boolean } {
  const player = game.players.find((item) => item.id === playerId);

  if (!player || player.handTiles.length >= 14) {
    return { game, bought: false };
  }

  const handDefinitions = definitionsForInstances(player.handTiles, definitions);
  const best = shopTilesWithDefinitions(game.shop, definitions)
    .filter((item) => item.definition.cost <= player.gold)
    .map((item) => ({
      ...item,
      score: scoreCandidateTile(handDefinitions, item.definition, definitions)
    }))
    .sort((left, right) => right.score - left.score || right.definition.cost - left.definition.cost)[0];

  if (!best || best.score < minScore) {
    return { game, bought: false };
  }

  return { game: buyTile(game, playerId, best.instance.instanceId), bought: true };
}

function shouldRefresh(player: PlayerState, distance: number, refreshes: number, maxRefreshes: number): boolean {
  if (refreshes >= maxRefreshes || player.lockedShop) {
    return false;
  }

  const cost = refreshCost(player);

  if (player.gold < cost) {
    return false;
  }

  if (distance <= 2 || player.hp < 35) {
    return true;
  }

  return player.gold >= cost + 6;
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

  let handDefinitions = definitionsForInstances(ai.handTiles, definitions);

  if (isWinningHand(handDefinitions)) {
    return nextGame;
  }

  if (ai.handTiles.length >= 14) {
    const discard = chooseBestDiscard(ai.handTiles, definitions);
    if (discard) {
      nextGame = sellTile(nextGame, playerId, discard.instanceId);
    }
  }

  ai = nextGame.players.find((player) => player.id === playerId);
  if (!ai) {
    return nextGame;
  }

  handDefinitions = definitionsForInstances(ai.handTiles, definitions);
  let plan = evaluateAIHandPlan(handDefinitions, definitions);
  nextGame = maybeLevelUp(nextGame, playerId, plan.distance);

  let purchases = 0;
  let refreshes = 0;
  const maxRefreshes = plan.distance <= 2 || ai.hp < 35 ? 3 : ai.gold >= 12 ? 2 : 1;

  for (let actions = 0; actions < 8; actions += 1) {
    ai = nextGame.players.find((player) => player.id === playerId);
    if (!ai) {
      break;
    }

    handDefinitions = definitionsForInstances(ai.handTiles, definitions);
    if (isWinningHand(handDefinitions)) {
      break;
    }

    if (ai.handTiles.length >= 14) {
      break;
    }

    plan = evaluateAIHandPlan(handDefinitions, definitions);
    const buyThreshold = plan.distance <= 2 || ai.hp < 35 ? 5 : 8;
    const bought = buyBestCandidate(nextGame, playerId, definitions, buyThreshold);
    if (bought.bought) {
      nextGame = bought.game;
      purchases += 1;
      if (purchases >= 4) {
        break;
      }
      continue;
    }

    if (shouldRefresh(ai, plan.distance, refreshes, maxRefreshes)) {
      const refreshed = refreshShopForAI(nextGame, playerId, rng);
      if (refreshed === nextGame) {
        break;
      }
      nextGame = refreshed;
      refreshes += 1;
      continue;
    }

    break;
  }

  ai = nextGame.players.find((player) => player.id === playerId);
  while (ai && ai.handTiles.length > 14) {
    const discard = chooseBestDiscard(ai.handTiles, definitions);

    if (!discard) {
      break;
    }

    nextGame = sellTile(nextGame, playerId, discard.instanceId);
    ai = nextGame.players.find((player) => player.id === playerId);
  }

  return nextGame;
}
