import { describe, expect, it } from "vitest";
import { RoomManager } from "../managers/RoomManager";

describe("RoomManager", () => {
  it("creates a room and marks the creator as owner", () => {
    const manager = new RoomManager();

    const result = manager.createRoom({ nickname: "房主" });

    expect(result.room.id).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.player.isOwner).toBe(true);
    expect(result.room.players).toHaveLength(1);
  });

  it("lets another player join an existing room", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "房主" });

    const joined = manager.joinRoom({ roomId: created.room.id, nickname: "玩家 B" });

    expect(joined.ok).toBe(true);
    expect(joined.data?.room.players).toHaveLength(2);
  });

  it("reuses an existing lobby seat when the same session joins again", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "房主" });
    const firstJoin = manager.joinRoom({ roomId: created.room.id, nickname: "玩家777", socketId: "socket-a" });

    const secondJoin = manager.joinRoom({
      roomId: created.room.id,
      nickname: "玩家777",
      socketId: "socket-b",
      sessionToken: firstJoin.data!.sessionToken
    });
    const room = manager.getRoom(created.room.id);

    expect(secondJoin.ok).toBe(true);
    expect(secondJoin.data?.player.id).toBe(firstJoin.data?.player.id);
    expect(room?.players.filter((player) => player.nickname === "玩家777")).toHaveLength(1);
  });

  it("rejects a fifth human player", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "P1" });

    for (const nickname of ["P2", "P3", "P4"]) {
      manager.joinRoom({ roomId: created.room.id, nickname });
    }

    const result = manager.joinRoom({ roomId: created.room.id, nickname: "P5" });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("ROOM_FULL");
  });

  it("transfers ownership when the room owner leaves", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "P1" });
    const joined = manager.joinRoom({ roomId: created.room.id, nickname: "P2" });

    manager.leaveRoom(created.room.id, created.player.id);
    const room = manager.getRoom(created.room.id);

    expect(room?.ownerId).toBe(joined.data?.player.id);
    expect(room?.players.find((player) => player.id === joined.data?.player.id)?.isOwner).toBe(true);
  });

  it("lets the room owner kick another player from the lobby", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "P1" });
    const joined = manager.joinRoom({ roomId: created.room.id, nickname: "P2" });

    const result = manager.kickPlayer(created.room.id, created.player.id, joined.data!.player.id);
    const room = manager.getRoom(created.room.id);

    expect(result.ok).toBe(true);
    expect(result.data?.id).toBe(joined.data?.player.id);
    expect(room?.players).toHaveLength(1);
    expect(room?.players[0].id).toBe(created.player.id);
  });

  it("rejects kicking by a non-owner", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "P1" });
    const joined = manager.joinRoom({ roomId: created.room.id, nickname: "P2" });

    const result = manager.kickPlayer(created.room.id, joined.data!.player.id, created.player.id);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("NOT_ROOM_OWNER");
  });

  it("rejects kicking the owner themselves", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "P1" });

    const result = manager.kickPlayer(created.room.id, created.player.id, created.player.id);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_ACTION");
  });

  it("keeps a playing seat available for the same player to rejoin", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "P1" });
    const joined = manager.joinRoom({ roomId: created.room.id, nickname: "P2" });
    manager.markPlaying(created.room.id);

    manager.leaveRoom(created.room.id, joined.data!.player.id);
    const rejoined = manager.joinRoom({ roomId: created.room.id, nickname: "改名后重连", socketId: "socket-rejoin", sessionToken: joined.data!.sessionToken });
    const room = manager.getRoom(created.room.id);

    expect(rejoined.ok).toBe(true);
    expect(rejoined.data?.player.id).toBe(joined.data?.player.id);
    expect(rejoined.data?.player.connected).toBe(true);
    expect(room?.players).toHaveLength(2);
  });

  it("destroys a room explicitly", () => {
    const manager = new RoomManager();
    const created = manager.createRoom({ nickname: "P1" });

    expect(manager.destroyRoom(created.room.id).ok).toBe(true);
    expect(manager.getRoom(created.room.id)).toBeUndefined();
  });
});
