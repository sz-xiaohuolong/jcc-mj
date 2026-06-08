import { beforeEach, describe, expect, it } from "vitest";
import { augmentDefinitions } from "../data/augments";
import { createInitialGame } from "../engine/gameEngine";
import { useGameStore } from "../store/gameStore";
import type { ActiveTrait } from "../types";
import { createSeededRandom } from "../utils/random";

const swiftbladeTrait: ActiveTrait = {
  id: "swiftblade",
  name: "迅刃",
  count: 2,
  tier: 1,
  threshold: 2,
  description: "每回合首次刷新获得折扣。"
};

describe("gameStore refresh economy", () => {
  beforeEach(() => {
    const game = createInitialGame({ rng: createSeededRandom(88) });

    useGameStore.setState({
      seed: 101,
      view: "game",
      game: {
        ...game,
        players: game.players.map((player) =>
          player.id === "player"
            ? {
                ...player,
                gold: 20,
                activeTraits: [swiftbladeTrait],
                lockedShop: false,
                hasRefreshedThisRound: false
              }
            : player
        )
      }
    });
  });

  it("applies swiftblade's first-refresh discount only once per round", () => {
    useGameStore.getState().refreshShop();
    const afterFirstRefresh = useGameStore.getState().game.players.find((player) => player.id === "player");

    useGameStore.getState().refreshShop();
    const afterSecondRefresh = useGameStore.getState().game.players.find((player) => player.id === "player");

    expect(afterFirstRefresh?.gold).toBe(19);
    expect(afterSecondRefresh?.gold).toBe(17);
  });

  it("does not remove a shop tile when the player cannot afford it", () => {
    const current = useGameStore.getState().game;
    const targetTile = current.shop[0];

    useGameStore.setState({
      game: {
        ...current,
        players: current.players.map((player) => (player.id === "player" ? { ...player, gold: 0 } : player))
      }
    });

    useGameStore.getState().buyFromShop(targetTile.instanceId);
    const state = useGameStore.getState() as unknown as { game: typeof current; lastError?: string };
    const player = state.game.players.find((item) => item.id === "player");

    expect(state.game.shop.map((tile) => tile.instanceId)).toContain(targetTile.instanceId);
    expect(player?.handTiles.some((tile) => tile.instanceId === targetTile.instanceId)).toBe(false);
    expect(player?.benchTiles.some((tile) => tile.instanceId === targetTile.instanceId)).toBe(false);
    expect(state.lastError).toContain("金币不足");
  });

  it("applies fast-form immediately when the player chooses it", () => {
    const current = useGameStore.getState().game;
    const fastForm = augmentDefinitions.find((augment) => augment.id === "fast-form");
    if (!fastForm) throw new Error("Missing fast-form augment");
    const beforePlayer = current.players.find((player) => player.id === "player");
    const beforeCount = (beforePlayer?.handTiles.length ?? 0) + (beforePlayer?.benchTiles.length ?? 0);

    useGameStore.setState({
      game: {
        ...current,
        phase: "augment_select",
        augmentChoices: [fastForm]
      }
    });

    useGameStore.getState().chooseAugment(fastForm);
    const afterPlayer = useGameStore.getState().game.players.find((player) => player.id === "player");
    const afterCount = (afterPlayer?.handTiles.length ?? 0) + (afterPlayer?.benchTiles.length ?? 0);

    expect(afterCount).toBe(beforeCount + 2);
    expect(afterPlayer?.augments.some((augment) => augment.id === "fast-form")).toBe(true);
  });

  it("does not buy into a bench when the hand is already full", () => {
    const current = useGameStore.getState().game;
    const targetTile = current.shop[0];
    const fullHand = current.tilePool.slice(0, 14);

    useGameStore.setState({
      game: {
        ...current,
        players: current.players.map((player) =>
          player.id === "player"
            ? {
                ...player,
                gold: 20,
                handTiles: fullHand,
                benchTiles: []
              }
            : player
        )
      }
    });

    useGameStore.getState().buyFromShop(targetTile.instanceId);
    const state = useGameStore.getState() as unknown as { game: typeof current; lastError?: string };
    const player = state.game.players.find((item) => item.id === "player");

    expect(state.game.shop.map((tile) => tile.instanceId)).toContain(targetTile.instanceId);
    expect(player?.handTiles).toHaveLength(14);
    expect(player?.benchTiles).toHaveLength(0);
    expect(state.lastError).toContain("手牌已满");
  });
});
