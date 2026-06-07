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
});
