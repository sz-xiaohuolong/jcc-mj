import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialGame } from "../engine/gameEngine";
import { useGameStore } from "../store/gameStore";
import { createSeededRandom } from "../utils/random";
import { playGameSound } from "../audio/playGameSound";

vi.mock("../audio/playGameSound", () => ({
  playGameSound: vi.fn()
}));

describe("gameStore sound triggers", () => {
  beforeEach(() => {
    vi.mocked(playGameSound).mockClear();
    const game = createInitialGame({ rng: createSeededRandom(88) });
    useGameStore.setState({ seed: 101, view: "game", game, lastError: undefined });
  });

  it("does not play buy success sound when buying fails", () => {
    const current = useGameStore.getState().game;
    const targetTile = current.shop[0];
    useGameStore.setState({
      game: {
        ...current,
        players: current.players.map((player) => (player.id === "player" ? { ...player, gold: 0 } : player))
      }
    });

    useGameStore.getState().buyFromShop(targetTile.instanceId);

    expect(playGameSound).not.toHaveBeenCalledWith("tileBuy");
  });

  it("does not play refresh success sound when the shop is locked", () => {
    const current = useGameStore.getState().game;
    useGameStore.setState({
      game: {
        ...current,
        players: current.players.map((player) => (player.id === "player" ? { ...player, lockedShop: true } : player))
      }
    });

    useGameStore.getState().refreshShop();

    expect(playGameSound).not.toHaveBeenCalledWith("shopRefresh");
  });

  it("plays operation success sounds after valid actions", () => {
    useGameStore.getState().buyFromShop(useGameStore.getState().game.shop[0].instanceId);
    useGameStore.getState().toggleLockShop();

    expect(playGameSound).toHaveBeenCalledWith("tileBuy");
    expect(playGameSound).toHaveBeenCalledWith("shopLock");
  });
});
