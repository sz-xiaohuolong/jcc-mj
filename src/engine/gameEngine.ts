import { augmentDefinitions } from "../data/augments";
import { tileDefinitions } from "../data/tiles";
import type { GameLog, GameState, PlayerState, RandomSource, TileDefinition, TileInstance, TileWithDefinition } from "../types";
import { pickOne } from "../utils/random";
import { createAugmentChoices, getInterestCapBonus, shouldOfferAugment } from "./augmentEngine";
import { chooseRandomCity } from "./cityEngine";
import { settlePlayers } from "./damageEngine";
import { calculateActiveTraits } from "./traitEngine";
import { calculateInterest, createInitialTilePool, drawTiles, refreshShop } from "./shopEngine";

let logCounter = 0;

export function createLog(round: number, message: string, tone: GameLog["tone"] = "info"): GameLog {
  logCounter += 1;
  return { id: `log-${logCounter}`, round, message, tone };
}

export function definitionsForInstances(instances: TileInstance[], definitions = tileDefinitions): TileDefinition[] {
  return instances
    .map((instance) => definitions.find((definition) => definition.id === instance.tileId))
    .filter((definition): definition is TileDefinition => Boolean(definition));
}

function createPlayer({
  id,
  name,
  isAI,
  handTiles,
  startingGold
}: {
  id: string;
  name: string;
  isAI: boolean;
  handTiles: TileInstance[];
  startingGold: number;
}): PlayerState {
  const handDefinitions = definitionsForInstances(handTiles);

  return {
    id,
    name,
    isAI,
    hp: 100,
    gold: startingGold,
    level: 1,
    xp: 0,
    handTiles,
    benchTiles: [],
    discardTiles: [],
    augments: [],
    activeTraits: calculateActiveTraits(handDefinitions),
    isAlive: true,
    isWinning: false,
    lockedShop: false,
    hasRefreshedThisRound: false,
    hasDiscardedThisRound: false
  };
}

function hydrateShop(shop: TileInstance[], pool: TileWithDefinition[]): TileWithDefinition[] {
  return shop
    .map((tile) => pool.find((entry) => entry.instanceId === tile.instanceId))
    .filter((tile): tile is TileWithDefinition => Boolean(tile));
}

export function createInitialGame({ rng }: { rng: RandomSource }): GameState {
  const city = chooseRandomCity(rng);
  let pool = createInitialTilePool(tileDefinitions);
  const startingGold = 12 + (city.modifiers.startingGold ?? 0);
  const players: PlayerState[] = [];

  for (let index = 0; index < 4; index += 1) {
    const draw = drawTiles(pool, 8, rng);
    pool = draw.pool;
    players.push(
      createPlayer({
        id: index === 0 ? "player" : `ai-${index}`,
        name: index === 0 ? "你" : `AI ${index}`,
        isAI: index !== 0,
        handTiles: draw.drawn,
        startingGold
      })
    );
  }

  const shopResult = refreshShop({
    pool,
    level: 1,
    rng,
    highCostBias: city.modifiers.highCostShopBias ?? 0,
    tripletBias: city.modifiers.tripletShopBias ?? 0
  });

  return {
    phase: "shop",
    round: 1,
    stage: 1,
    players,
    currentPlayerId: "player",
    shop: shopResult.shop.map(({ instanceId, tileId }) => ({ instanceId, tileId })),
    city,
    tilePool: shopResult.pool.map(({ instanceId, tileId }) => ({ instanceId, tileId })),
    logs: [createLog(1, `城邦降临：${city.name}。${city.description}`, "good")],
    augmentChoices: [],
    lastSettlement: [],
    winnerId: null
  };
}

export function rebuildPool(instances: TileInstance[]): TileWithDefinition[] {
  return instances
    .map((instance) => {
      const definition = tileDefinitions.find((tile) => tile.id === instance.tileId);

      if (!definition) {
        return null;
      }

      return { ...instance, definition };
    })
    .filter((tile): tile is TileWithDefinition => Boolean(tile));
}

export function refreshGameShop(game: GameState, rng: RandomSource): GameState {
  const player = game.players.find((item) => item.id === game.currentPlayerId);
  const pool = rebuildPool([...game.tilePool, ...game.shop]);
  const result = refreshShop({
    pool,
    level: player?.level ?? 1,
    rng,
    highCostBias: game.city?.modifiers.highCostShopBias ?? 0,
    tripletBias: game.city?.modifiers.tripletShopBias ?? 0
  });

  return {
    ...game,
    shop: result.shop.map(({ instanceId, tileId }) => ({ instanceId, tileId })),
    tilePool: result.pool.map(({ instanceId, tileId }) => ({ instanceId, tileId }))
  };
}

export function buyTile(game: GameState, playerId: string, instanceId: string): GameState {
  const shopTile = game.shop.find((tile) => tile.instanceId === instanceId);
  const definition = tileDefinitions.find((tile) => tile.id === shopTile?.tileId);
  const buyer = game.players.find((player) => player.id === playerId);

  if (!shopTile || !definition || !buyer || buyer.gold < definition.cost || buyer.handTiles.length >= 14) {
    return game;
  }

  const players = game.players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    const nextPlayer = {
      ...player,
      gold: player.gold - definition.cost,
      handTiles: [...player.handTiles, shopTile]
    };

    return {
      ...nextPlayer,
      activeTraits: calculateActiveTraits(definitionsForInstances(nextPlayer.handTiles))
    };
  });

  return {
    ...game,
    players,
    shop: game.shop.filter((tile) => tile.instanceId !== instanceId),
    logs: [...game.logs, createLog(game.round, `${players.find((p) => p.id === playerId)?.name ?? "玩家"} 买入 ${definition.name}`, "good")]
  };
}

export function discardTile(game: GameState, playerId: string, instanceId: string): GameState {
  let returnedTile: TileInstance | null = null;
  const players = game.players.map((player) => {
    if (player.id !== playerId || player.hasDiscardedThisRound) {
      return player;
    }

    const tile = player.handTiles.find((item) => item.instanceId === instanceId);

    if (!tile) {
      return player;
    }

    const nextHand = player.handTiles.filter((item) => item.instanceId !== instanceId);
    returnedTile = tile;

    return {
      ...player,
      handTiles: nextHand,
      discardTiles: [...player.discardTiles, tile],
      activeTraits: calculateActiveTraits(definitionsForInstances(nextHand)),
      hasDiscardedThisRound: true
    };
  });

  return { ...game, players, tilePool: returnedTile ? [...game.tilePool, returnedTile] : game.tilePool };
}

export function sellTile(game: GameState, playerId: string, instanceId: string): GameState {
  let returnedTile: TileInstance | null = null;
  const players = game.players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    const sold = player.handTiles.find((tile) => tile.instanceId === instanceId);
    const definition = tileDefinitions.find((tile) => tile.id === sold?.tileId);

    if (!sold || !definition) {
      return player;
    }

    const handTiles = player.handTiles.filter((tile) => tile.instanceId !== instanceId);
    returnedTile = sold;

    return {
      ...player,
      gold: player.gold + Math.max(1, definition.cost - 1),
      handTiles,
      discardTiles: [...player.discardTiles, sold],
      activeTraits: calculateActiveTraits(definitionsForInstances(handTiles))
    };
  });

  return { ...game, players, tilePool: returnedTile ? [...game.tilePool, returnedTile] : game.tilePool };
}

export function getLevelUpCost(level: number): number {
  return Math.min(28, 4 + level * 4);
}

export function levelUpPlayer(game: GameState, playerId: string): GameState {
  const players = game.players.map((player) => {
    if (player.id !== playerId || player.level >= 6) {
      return player;
    }

    const cost = getLevelUpCost(player.level);

    if (player.gold < cost) {
      return player;
    }

    return {
      ...player,
      gold: player.gold - cost,
      level: player.level + 1,
      xp: 0
    };
  });

  return {
    ...game,
    players,
    logs: [...game.logs, createLog(game.round, `${players.find((player) => player.id === playerId)?.name ?? "玩家"} 升级。`, "good")]
  };
}

export function endRound(game: GameState, rng: RandomSource): GameState {
  const tilesByPlayer = new Map(
    game.players.map((player) => [player.id, definitionsForInstances(player.handTiles)])
  );
  const settlement = settlePlayers({ players: game.players, tilesByPlayer, city: game.city });
  const players = game.players.map((player) => {
    const entry = settlement.find((item) => item.playerId === player.id);
    const interestCap = 5 + (game.city?.modifiers.interestCapBonus ?? 0) + getInterestCapBonus(player);
    const interest = calculateInterest(player.gold, interestCap);
    const traitGold =
      player.augments.some((augment) => augment.id === "trait-tracker") &&
      player.activeTraits.filter((trait) => trait.tier > 0).length >= 3
        ? 2
        : 0;

    return {
      ...player,
      hp: entry?.hpAfter ?? player.hp,
      gold: player.gold + 5 + interest + traitGold,
      isAlive: (entry?.hpAfter ?? player.hp) > 0,
      isWinning: entry?.status === "winning",
      hasRefreshedThisRound: false,
      hasDiscardedThisRound: false
    };
  });
  const alive = players.filter((player) => player.isAlive);
  const baseNextGame: GameState = {
    ...game,
    phase: alive.length <= 1 ? "game_over" : "shop",
    round: game.round + 1,
    stage: Math.ceil((game.round + 1) / 3),
    players,
    lastSettlement: settlement,
    winnerId: alive.length === 1 ? alive[0].id : null,
    logs: [
      ...game.logs,
      ...settlement.map((entry) =>
        createLog(
          game.round,
          `${entry.playerName}：${entry.status === "winning" ? `胡牌 ${entry.patterns.map((p) => p.name).join("、")}` : `未胡，扣血 ${entry.damage}`}`,
          entry.status === "winning" ? "good" : "warn"
        )
      )
    ]
  };

  if (baseNextGame.phase === "game_over") {
    return baseNextGame;
  }

  const currentPlayer = baseNextGame.players.find((player) => player.id === baseNextGame.currentPlayerId);
  const nextWithShop = currentPlayer?.lockedShop ? baseNextGame : refreshGameShop(baseNextGame, rng);

  if (shouldOfferAugment(nextWithShop.round)) {
    const currentPlayerWithAugments = nextWithShop.players.find((player) => player.id === nextWithShop.currentPlayerId);

    return {
      ...nextWithShop,
      phase: "augment_select",
      augmentChoices: createAugmentChoices(
        rng,
        3,
        currentPlayerWithAugments?.augments.map((augment) => augment.id) ?? []
      )
    };
  }

  if (nextWithShop.round === 2) {
    return {
      ...nextWithShop,
      players: nextWithShop.players.map((player) =>
        player.augments.length === 0 && player.isAI
          ? { ...player, augments: [pickOne(augmentDefinitions, rng)] }
          : player
      )
    };
  }

  return nextWithShop;
}
