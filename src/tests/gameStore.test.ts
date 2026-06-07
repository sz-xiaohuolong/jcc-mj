import { beforeEach, describe, expect, it } from "vitest";
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
});
