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
});
