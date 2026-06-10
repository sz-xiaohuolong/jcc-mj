import { create } from "zustand";
import { playGameSound } from "../audio/playGameSound";
import { playSettlementSounds } from "../audio/settlementSound";
import { tileDefinitions } from "../data/tiles";
import { applyImmediateAugmentEffect } from "../engine/augmentEffects";
import { chooseAugmentForAI, createAugmentChoices, getRefreshCostModifier, getRefreshCostRefund } from "../engine/augmentEngine";
import { runAITurn } from "../engine/aiEngine";
import {
  buyTile,
  createInitialGame,
  createLog,
  definitionsForInstances,
  discardTile,
  endRound,
  getLevelUpCost,
  levelUpPlayer,
  refreshGameShop,
  sellTile
} from "../engine/gameEngine";
import { getRefreshDiscount } from "../engine/traitEngine";
import { recordSoloMatch } from "../rating/localRatingStorage";
import type { RatingChange } from "../../shared/rating/ratingTypes";
import type { AugmentDefinition, GameState, PlayerState, TileDefinition, TileInstance } from "../types";
import { createSeededRandom } from "../utils/random";
import { sortTiles } from "../utils/tileSort";

interface GameStore {
  game: GameState;
  view: "home" | "game" | "rules" | "leaderboard" | "online-home" | "online-lobby" | "online-game";
  seed: number;
  lastError?: string;
  lastSoloRatingChange?: RatingChange;
  startGame: () => void;
  goHome: () => void;
  openRules: () => void;
  openLeaderboard: () => void;
  openOnlineHome: () => void;
  buyFromShop: (instanceId: string) => void;
  refreshShop: () => void;
  toggleLockShop: () => void;
  discard: (instanceId: string) => void;
  sell: (instanceId: string) => void;
  levelUp: () => void;
  organizeHand: () => void;
  chooseAugment: (augment: AugmentDefinition) => void;
  closeSettlement: () => void;
  endTurn: () => void;
  getDefinition: (tile: TileInstance) => TileDefinition | undefined;
  getTileDefinitions: (tiles: TileInstance[]) => TileDefinition[];
}

const initialGame: GameState = {
  phase: "home",
  round: 0,
  stage: 0,
  players: [],
  currentPlayerId: "player",
  shop: [],
  city: null,
  tilePool: [],
  logs: [],
  augmentChoices: [],
  lastSettlement: [],
  winnerId: null
};

function nextRng(seed: number) {
  return createSeededRandom(seed + Date.now() % 9973);
}

function playerOf(game: GameState): PlayerState | undefined {
  return game.players.find((player) => player.id === game.currentPlayerId);
}

function runAITurnWithPrivateShop(game: GameState, playerId: string, seed: number): GameState {
  const originalShop = game.shop;
  const originalCurrentPlayerId = game.currentPlayerId;
  const shopGame = refreshGameShop({ ...game, currentPlayerId: playerId, shop: [] }, nextRng(seed));
  const aiGame = runAITurn({
    game: shopGame,
    playerId,
    definitions: tileDefinitions,
    rng: nextRng(seed + 17)
  });

  return {
    ...aiGame,
    currentPlayerId: originalCurrentPlayerId,
    shop: originalShop,
    tilePool: [...aiGame.tilePool, ...aiGame.shop]
  };
}

function soloRankForPlayer(game: GameState, playerId: string): number {
  const player = game.players.find((item) => item.id === playerId);

  if (!player) return 4;
  if (game.winnerId === playerId) return 1;
  if (!player.isAlive) return Math.min(4, game.players.filter((item) => item.isAlive).length + 1);

  return [...game.players].sort((left, right) => Number(right.isAlive) - Number(left.isAlive) || right.hp - left.hp).findIndex((item) => item.id === playerId) + 1;
}

function highestHuScoreForPlayer(game: GameState, playerId: string): number {
  return Math.max(
    0,
    ...game.lastSettlement
      .filter((entry) => entry.playerId === playerId)
      .map((entry) => entry.combatScore)
  );
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: initialGame,
  view: "home",
  seed: 42,
  lastError: undefined,
  lastSoloRatingChange: undefined,

  startGame() {
    const seed = Math.floor(Math.random() * 100000);
    playGameSound("uiClick");
    set({
      seed,
      view: "game",
      lastError: undefined,
      lastSoloRatingChange: undefined,
      game: createInitialGame({ rng: createSeededRandom(seed) })
    });
  },

  goHome() {
    set({ view: "home", game: initialGame, lastError: undefined, lastSoloRatingChange: undefined });
  },

  openRules() {
    set({ view: "rules" });
  },

  openLeaderboard() {
    set({ view: "leaderboard" });
  },

  openOnlineHome() {
    set({ view: "online-home" });
  },

  buyFromShop(instanceId) {
    set((state) => {
      const player = playerOf(state.game);
      const shopTile = state.game.shop.find((tile) => tile.instanceId === instanceId);
      const definition = tileDefinitions.find((tile) => tile.id === shopTile?.tileId);

      if (!shopTile || !definition) {
        return { lastError: "商店中没有这张牌。" };
      }

      if (!player || player.gold < definition.cost) {
        return { lastError: `金币不足，需要 ${definition.cost} 金币。` };
      }

      if (player.handTiles.length >= 14) {
        return { lastError: "手牌已满，请先弃 1 张牌再购买。" };
      }

      playGameSound("tileBuy");
      return { game: buyTile(state.game, state.game.currentPlayerId, instanceId), lastError: undefined };
    });
  },

  refreshShop() {
    set((state) => {
      const player = playerOf(state.game);

      if (!player || player.lockedShop) {
        return state;
      }

      const discount = getRefreshDiscount(player.activeTraits, !player.hasRefreshedThisRound) + Math.abs(getRefreshCostModifier(player));
      const cost = Math.max(0, 2 - discount);

      if (player.gold < cost) {
        return state;
      }

      const refreshRng = nextRng(state.seed);
      const finalCost = cost - getRefreshCostRefund(player, cost, refreshRng);
      const players = state.game.players.map((item) =>
        item.id === player.id ? { ...item, gold: item.gold - finalCost, hasRefreshedThisRound: true } : item
      );
      const refreshed = refreshGameShop({ ...state.game, players }, refreshRng);
      playGameSound("shopRefresh");

      return {
        game: {
          ...refreshed,
          logs: [...refreshed.logs, createLog(refreshed.round, `刷新商店，花费 ${finalCost} 金币。`, "info")]
        }
      };
    });
  },

  toggleLockShop() {
    playGameSound("shopLock");
    set((state) => ({
      game: {
        ...state.game,
        players: state.game.players.map((player) =>
          player.id === state.game.currentPlayerId ? { ...player, lockedShop: !player.lockedShop } : player
        )
      }
    }));
  },

  discard(instanceId) {
    set((state) => {
      const player = playerOf(state.game);
      const beforeCount = player?.discardTiles.length ?? 0;
      const game = discardTile(state.game, state.game.currentPlayerId, instanceId);
      const nextPlayer = playerOf(game);
      if ((nextPlayer?.discardTiles.length ?? 0) > beforeCount) {
        playGameSound("tileSell");
      }
      return { game };
    });
  },

  sell(instanceId) {
    set((state) => {
      const player = playerOf(state.game);
      const beforeCount = player?.discardTiles.length ?? 0;
      const game = sellTile(state.game, state.game.currentPlayerId, instanceId);
      const nextPlayer = playerOf(game);
      if ((nextPlayer?.discardTiles.length ?? 0) > beforeCount) {
        playGameSound("tileSell");
      }
      return { game };
    });
  },

  levelUp() {
    set((state) => {
      const beforeLevel = playerOf(state.game)?.level ?? 0;
      const game = levelUpPlayer(state.game, state.game.currentPlayerId);
      if ((playerOf(game)?.level ?? 0) > beforeLevel) {
        playGameSound("levelUp");
      }
      return { game };
    });
  },

  organizeHand() {
    playGameSound("handSort");
    set((state) => ({
      game: {
        ...state.game,
        players: state.game.players.map((player) => {
          if (player.id !== state.game.currentPlayerId) {
            return player;
          }

          const sortedDefinitions = sortTiles(definitionsForInstances(player.handTiles));
          const sortedIds = sortedDefinitions.map((tile) => tile.id);
          const sortedInstances = [...player.handTiles].sort(
            (left, right) => sortedIds.indexOf(left.tileId) - sortedIds.indexOf(right.tileId)
          );

          return { ...player, handTiles: sortedInstances };
        })
      }
    }));
  },

  chooseAugment(augment) {
    playGameSound("augmentPick");
    set((state) => {
      const selectedAugments = new Map<string, AugmentDefinition>();
      let game: GameState = {
        ...state.game,
        phase: "shop",
        augmentChoices: [],
        players: state.game.players.map((player) => {
          if (player.id === state.game.currentPlayerId) {
            selectedAugments.set(player.id, augment);
            return { ...player, augments: [...player.augments, augment] };
          }

          if (player.isAI) {
            const aiChoices = createAugmentChoices(
              createSeededRandom(state.seed + state.game.round + player.id.length + 900),
              3,
              player.augments.map((item) => item.id)
            );
            const aiAugment = chooseAugmentForAI(player, aiChoices);
            selectedAugments.set(player.id, aiAugment);
            return { ...player, augments: [...player.augments, aiAugment] };
          }

          return player;
        }),
        logs: [...state.game.logs, createLog(state.game.round, `选择海克斯：${augment.name}`, "good")]
      };

      for (const [playerId, selected] of selectedAugments) {
        game = applyImmediateAugmentEffect(game, playerId, selected, nextRng(state.seed + game.round + playerId.length));
      }

      return { game, lastError: undefined };
    });
  },

  closeSettlement() {
    set((state) => ({ game: { ...state.game, lastSettlement: [] } }));
  },

  endTurn() {
    playGameSound("turnEnd");
    set((state) => {
      let game = state.game;

      for (const ai of game.players.filter((player) => player.isAI && player.isAlive)) {
        game = runAITurnWithPrivateShop(game, ai.id, state.seed + game.round + ai.id.length);
      }

      const settledGame = endRound(game, nextRng(state.seed + game.round + 9));
      const currentPlayer = settledGame.players.find((player) => player.id === settledGame.currentPlayerId);
      const shouldSettleSoloRating =
        !state.lastSoloRatingChange && (settledGame.phase === "game_over" || currentPlayer?.isAlive === false);
      const lastSoloRatingChange = shouldSettleSoloRating
        ? recordSoloMatch({
            nickname: localStorage.getItem("jcc-mj-nickname") ?? "你",
            rank: soloRankForPlayer(settledGame, settledGame.currentPlayerId),
            highestHuScore: highestHuScoreForPlayer(settledGame, settledGame.currentPlayerId)
          })
        : state.lastSoloRatingChange;
      playSettlementSounds({
        scope: "single",
        round: settledGame.round,
        phase: settledGame.phase,
        currentPlayerId: settledGame.currentPlayerId,
        winnerId: settledGame.winnerId,
        lastSettlement: settledGame.lastSettlement
      });

      return { game: settledGame, lastSoloRatingChange };
    });
  },

  getDefinition(tile) {
    return tileDefinitions.find((definition) => definition.id === tile.tileId);
  },

  getTileDefinitions(tiles) {
    return definitionsForInstances(tiles);
  }
}));

export { getLevelUpCost };
