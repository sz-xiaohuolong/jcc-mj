import { describe, expect, it } from "vitest";
import { RoomManager } from "../managers/RoomManager";
import { GameSessionManager } from "../managers/GameSessionManager";

function createStartedSession() {
  const roomManager = new RoomManager();
  const created = roomManager.createRoom({ nickname: "A" });
  const joined = roomManager.joinRoom({ roomId: created.room.id, nickname: "B" });
  const sessionManager = new GameSessionManager();
  const session = sessionManager.startGame(created.room, 123);

  return { roomManager, sessionManager, session, owner: created.player, second: joined.data!.player };
}

describe("GameSessionManager", () => {
  it("initializes a four-player game and filters private views per player", () => {
    const { sessionManager, session, owner, second } = createStartedSession();

    const ownerView = sessionManager.buildClientGameView(session.roomId, owner.id);
    const secondView = sessionManager.buildClientGameView(session.roomId, second.id);

    expect(ownerView?.privatePlayer.handTiles.length).toBeGreaterThan(0);
    expect(secondView?.privatePlayer.handTiles.length).toBeGreaterThan(0);
    expect(ownerView?.privatePlayer.handTiles).not.toEqual(secondView?.privatePlayer.handTiles);
    expect(ownerView?.public.players.every((player) => player.handTileCount >= 0)).toBe(true);
  });

  it("lets a player buy a tile from their private shop", () => {
    const { sessionManager, session, owner } = createStartedSession();
    const before = sessionManager.buildClientGameView(session.roomId, owner.id)!;
    const tile = before.privatePlayer.shop[0];

    const result = sessionManager.buyTile(session.roomId, owner.id, tile.instanceId);
    const after = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    expect(result.ok).toBe(true);
    expect(after.privatePlayer.handTiles.length + after.privatePlayer.benchTiles.length).toBe(
      before.privatePlayer.handTiles.length + before.privatePlayer.benchTiles.length + 1
    );
    expect(after.privatePlayer.gold).toBeLessThan(before.privatePlayer.gold);
  });

  it("rejects a buy when the player has insufficient gold", () => {
    const { sessionManager, session, owner } = createStartedSession();
    sessionManager.setPlayerGoldForTest(session.roomId, owner.id, 0);
    const view = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    const result = sessionManager.buyTile(session.roomId, owner.id, view.privatePlayer.shop[0].instanceId);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("NOT_ENOUGH_GOLD");
  });

  it("charges gold when refreshing a private shop", () => {
    const { sessionManager, session, owner } = createStartedSession();
    const before = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    const result = sessionManager.refreshShop(session.roomId, owner.id);
    const after = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    expect(result.ok).toBe(true);
    expect(after.privatePlayer.gold).toBeLessThan(before.privatePlayer.gold);
    expect(after.privatePlayer.shop).toHaveLength(5);
  });

  it("lets a player spend gold to level up", () => {
    const { sessionManager, session, owner } = createStartedSession();
    const before = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    const result = sessionManager.levelUp(session.roomId, owner.id);
    const after = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    expect(result.ok).toBe(true);
    expect(after.privatePlayer.level).toBe(before.privatePlayer.level + 1);
    expect(after.privatePlayer.gold).toBeLessThan(before.privatePlayer.gold);
  });

  it("organizes a player's hand in tile order on the server", () => {
    const { sessionManager, session, owner } = createStartedSession();
    const before = sessionManager.buildClientGameView(session.roomId, owner.id)!;
    const reversed = [...before.privatePlayer.handTiles].reverse();
    sessionManager.setPlayerHandForTest(session.roomId, owner.id, reversed);

    const result = sessionManager.organizeHand(session.roomId, owner.id);
    const after = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    expect(result.ok).toBe(true);
    expect(after.privatePlayer.handTiles).not.toEqual(reversed);
    expect(after.privatePlayer.handTiles.map((tile) => tile.tileId)).toEqual(
      [...after.privatePlayer.handTiles.map((tile) => tile.tileId)].sort((left, right) => {
        const suitOrder = ["wan", "tong", "tiao", "wind", "dragon"];
        const [leftSuit, leftRank = "0"] = left.split("-");
        const [rightSuit, rightRank = "0"] = right.split("-");
        const suitDelta = suitOrder.indexOf(leftSuit) - suitOrder.indexOf(rightSuit);
        return suitDelta || Number(leftRank) - Number(rightRank) || left.localeCompare(right);
      })
    );
  });

  it("rejects game actions outside the operation phase", () => {
    const { sessionManager, session, owner } = createStartedSession();
    sessionManager.forcePhaseForTest(session.roomId, "settlement");
    const view = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    const result = sessionManager.buyTile(session.roomId, owner.id, view.privatePlayer.shop[0].instanceId);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_PHASE");
  });

  it("accepts valid augment choices and rejects repeated end turn", () => {
    const { sessionManager, session, owner } = createStartedSession();
    sessionManager.forcePhaseForTest(session.roomId, "augment_select");
    const view = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    const augmentResult = sessionManager.chooseAugment(session.roomId, owner.id, view.privatePlayer.augmentChoices[0].id);
    sessionManager.forcePhaseForTest(session.roomId, "shop");
    const firstEnd = sessionManager.endTurn(session.roomId, owner.id);
    const secondEnd = sessionManager.endTurn(session.roomId, owner.id);

    expect(augmentResult.ok).toBe(true);
    expect(firstEnd.ok).toBe(true);
    expect(secondEnd.ok).toBe(false);
    expect(secondEnd.error?.code).toBe("ALREADY_ENDED_TURN");
  });
});
