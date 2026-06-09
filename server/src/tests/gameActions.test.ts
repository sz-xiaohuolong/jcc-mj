import { describe, expect, it } from "vitest";
import { augmentDefinitions } from "../../../src/data/augments";
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

function allSessionTileInstanceIds(session: ReturnType<GameSessionManager["getSession"]>): string[] {
  if (!session) return [];

  return [
    ...session.game.tilePool.map((tile) => tile.instanceId),
    ...session.game.shop.map((tile) => tile.instanceId),
    ...session.game.players.flatMap((player) => [
      ...player.handTiles.map((tile) => tile.instanceId),
      ...player.benchTiles.map((tile) => tile.instanceId),
      ...player.discardTiles.map((tile) => tile.instanceId)
    ]),
    ...Object.values(session.playerShops).flatMap((shop) => shop.map((tile) => tile.instanceId))
  ];
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

  it("rejects a buy when the player's hand is full", () => {
    const { sessionManager, session, owner } = createStartedSession();
    const view = sessionManager.buildClientGameView(session.roomId, owner.id)!;
    const fullHand = session.game.tilePool.slice(0, 14);
    sessionManager.setPlayerHandForTest(session.roomId, owner.id, fullHand);

    const result = sessionManager.buyTile(session.roomId, owner.id, view.privatePlayer.shop[0].instanceId);
    const after = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ACTION");
    expect(after.privatePlayer.handTiles).toHaveLength(14);
    expect(after.privatePlayer.shop.map((tile) => tile.instanceId)).toContain(view.privatePlayer.shop[0].instanceId);
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
    session.game = {
      ...session.game,
      players: session.game.players.map((player) => (player.id === owner.id ? { ...player, activeTraits: [] } : player))
    };
    const before = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    const result = sessionManager.refreshShop(session.roomId, owner.id);
    const after = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    expect(result.ok).toBe(true);
    expect(after.privatePlayer.gold).toBeLessThan(before.privatePlayer.gold);
    expect(after.privatePlayer.shop).toHaveLength(5);
  });

  it("keeps tile instances unique after online round settlement", () => {
    const { sessionManager, session, owner, second } = createStartedSession();
    const firstEnd = sessionManager.endTurn(session.roomId, owner.id);
    const secondEnd = sessionManager.endTurn(session.roomId, second.id);
    const after = sessionManager.getSession(session.roomId)!;
    const ids = allSessionTileInstanceIds(after);

    expect(firstEnd.ok).toBe(true);
    expect(secondEnd.ok).toBe(true);
    expect(after.game.round).toBe(2);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.values(after.playerShops).every((shop) => shop.length === 5)).toBe(true);
  });

  it("keeps locked shop tiles out of other players' shops across refreshes and settlement", () => {
    const { sessionManager, session, owner, second } = createStartedSession();
    const ownerView = sessionManager.buildClientGameView(session.roomId, owner.id)!;
    const lockedIds = ownerView.privatePlayer.shop.map((tile) => tile.instanceId);

    const lockResult = sessionManager.lockShop(session.roomId, owner.id);
    for (let index = 0; index < 6; index += 1) {
      sessionManager.setPlayerGoldForTest(session.roomId, second.id, 99);
      const refreshResult = sessionManager.refreshShop(session.roomId, second.id);
      expect(refreshResult.ok).toBe(true);
      const secondView = sessionManager.buildClientGameView(session.roomId, second.id)!;
      expect(secondView.privatePlayer.shop).toHaveLength(5);
      expect(secondView.privatePlayer.shop.some((tile) => lockedIds.includes(tile.instanceId))).toBe(false);
    }

    sessionManager.endTurn(session.roomId, owner.id);
    sessionManager.endTurn(session.roomId, second.id);
    const after = sessionManager.getSession(session.roomId)!;
    const ownerAfter = sessionManager.buildClientGameView(session.roomId, owner.id)!;
    const secondAfter = sessionManager.buildClientGameView(session.roomId, second.id)!;
    const ids = allSessionTileInstanceIds(after);

    expect(lockResult.ok).toBe(true);
    expect(ownerAfter.privatePlayer.shop.map((tile) => tile.instanceId)).toEqual(lockedIds);
    expect(secondAfter.privatePlayer.shop).toHaveLength(5);
    expect(secondAfter.privatePlayer.shop.some((tile) => lockedIds.includes(tile.instanceId))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
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

  it("allows only one discard per round and returns the discarded tile to the pool", () => {
    const { sessionManager, session, owner } = createStartedSession();
    const before = sessionManager.buildClientGameView(session.roomId, owner.id)!;
    const firstTile = before.privatePlayer.handTiles[0];
    const secondTile = before.privatePlayer.handTiles[1];

    const firstResult = sessionManager.discardTile(session.roomId, owner.id, firstTile.instanceId);
    const secondResult = sessionManager.discardTile(session.roomId, owner.id, secondTile.instanceId);
    const after = sessionManager.getSession(session.roomId)!;

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(false);
    expect(secondResult.error?.code).toBe("INVALID_ACTION");
    expect(after.game.tilePool.map((tile) => tile.instanceId)).toContain(firstTile.instanceId);
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

  it("applies fast-form immediately when selected in online play", () => {
    const { sessionManager, session, owner } = createStartedSession();
    const fastForm = augmentDefinitions.find((augment) => augment.id === "fast-form");
    if (!fastForm) throw new Error("Missing fast-form augment");
    sessionManager.forcePhaseForTest(session.roomId, "augment_select");
    session.playerAugmentChoices[owner.id] = [fastForm];
    const before = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    const result = sessionManager.chooseAugment(session.roomId, owner.id, fastForm.id);
    const after = sessionManager.buildClientGameView(session.roomId, owner.id)!;

    expect(result.ok).toBe(true);
    expect(after.privatePlayer.handTiles.length + after.privatePlayer.benchTiles.length).toBe(
      before.privatePlayer.handTiles.length + before.privatePlayer.benchTiles.length + 2
    );
  });
});
