import { describe, expect, it } from "vitest";
import { ConnectionManager } from "../managers/ConnectionManager";

describe("ConnectionManager", () => {
  it("resumes a disconnected player within the reconnect window", () => {
    const manager = new ConnectionManager(60_000);
    const token = manager.register("socket-a", "room-1", "player-1");

    manager.markDisconnected("socket-a", 1_000);
    const result = manager.resume("socket-b", token, 30_000);

    expect(result.ok).toBe(true);
    expect(result.data?.playerId).toBe("player-1");
  });

  it("rejects reconnect attempts after the reconnect window expires", () => {
    const manager = new ConnectionManager(60_000);
    const token = manager.register("socket-a", "room-1", "player-1");

    manager.markDisconnected("socket-a", 1_000);
    const result = manager.resume("socket-b", token, 70_001);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("RECONNECT_EXPIRED");
  });

  it("removes all connection records for a destroyed room", () => {
    const manager = new ConnectionManager(60_000);
    const removedToken = manager.register("socket-a", "room-1", "player-1");
    const keptToken = manager.register("socket-b", "room-2", "player-2");

    manager.removeRoom("room-1");

    expect(manager.resume("socket-c", removedToken).ok).toBe(false);
    expect(manager.resume("socket-d", keptToken).ok).toBe(true);
  });
});
