import { create } from "zustand";
import { tileDefinitions } from "../data/tiles";
import { chooseAugmentForAI, getRefreshCostModifier } from "../engine/augmentEngine";
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
import type { AugmentDefinition, GameState, PlayerState, TileDefinition, TileInstance } from "../types";
import { createSeededRandom } from "../utils/random";
import { sortTiles } from "../utils/tileSort";

interface GameStore {
  game: GameState;
  view: "home" | "game" | "rules";
  seed: number;
  startGame: () => void;
  goHome: () => void;
  openRules: () => void;
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

export const useGameStore = create<GameStore>((set, get) => ({
  game: initialGame,
  view: "home",
  seed: 42,

  startGame() {
    const seed = Math.floor(Math.random() * 100000);
    set({
      seed,
      view: "game",
      game: createInitialGame({ rng: createSeededRandom(seed) })
    });
  },

  goHome() {
    set({ view: "home", game: initialGame });
  },

  openRules() {
    set({ view: "rules" });
  },

  buyFromShop(instanceId) {
    set((state) => ({ game: buyTile(state.game, state.game.currentPlayerId, instanceId) }));
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

      const players = state.game.players.map((item) =>
        item.id === player.id ? { ...item, gold: item.gold - cost, hasRefreshedThisRound: true } : item
      );
      const refreshed = refreshGameShop({ ...state.game, players }, nextRng(state.seed));

      return {
        game: {
          ...refreshed,
          logs: [...refreshed.logs, createLog(refreshed.round, `刷新商店，花费 ${cost} 金币。`, "info")]
        }
      };
    });
  },

  toggleLockShop() {
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
    set((state) => ({ game: discardTile(state.game, state.game.currentPlayerId, instanceId) }));
  },

  sell(instanceId) {
    set((state) => ({ game: sellTile(state.game, state.game.currentPlayerId, instanceId) }));
  },

  levelUp() {
    set((state) => ({ game: levelUpPlayer(state.game, state.game.currentPlayerId) }));
  },

  organizeHand() {
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
    set((state) => ({
      game: {
        ...state.game,
        phase: "shop",
        augmentChoices: [],
        players: state.game.players.map((player) => {
          if (player.id === state.game.currentPlayerId) {
            return { ...player, augments: [...player.augments, augment] };
          }

          if (player.isAI) {
            return { ...player, augments: [...player.augments, chooseAugmentForAI(player, state.game.augmentChoices)] };
          }

          return player;
        }),
        logs: [...state.game.logs, createLog(state.game.round, `选择海克斯：${augment.name}`, "good")]
      }
    }));
  },

  closeSettlement() {
    set((state) => ({ game: { ...state.game, lastSettlement: [] } }));
  },

  endTurn() {
    set((state) => {
      let game = state.game;

      for (const ai of game.players.filter((player) => player.isAI && player.isAlive)) {
        game = runAITurn({
          game,
          playerId: ai.id,
          definitions: tileDefinitions,
          rng: nextRng(state.seed + game.round)
        });
      }

      return { game: endRound(game, nextRng(state.seed + game.round + 9)) };
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
