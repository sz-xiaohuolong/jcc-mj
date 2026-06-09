import type { AckResponse, ResumeResult } from "../../../shared/types/network";
import { fail, ok } from "../utils/result";

interface ConnectionRecord {
  socketId?: string;
  roomId: string;
  playerId: string;
  sessionToken: string;
  disconnectedAt?: number;
}

export class ConnectionManager {
  private recordsByToken = new Map<string, ConnectionRecord>();
  private tokenBySocket = new Map<string, string>();

  constructor(private readonly reconnectWindowMs = 60_000) {}

  register(socketId: string, roomId: string, playerId: string, sessionToken = `session_${Math.random().toString(36).slice(2, 12)}`): string {
    this.recordsByToken.set(sessionToken, { socketId, roomId, playerId, sessionToken });
    this.tokenBySocket.set(socketId, sessionToken);
    return sessionToken;
  }

  markDisconnected(socketId: string, now = Date.now()): ConnectionRecord | undefined {
    const token = this.tokenBySocket.get(socketId);
    const record = token ? this.recordsByToken.get(token) : undefined;

    if (!record) return undefined;

    record.socketId = undefined;
    record.disconnectedAt = now;
    this.tokenBySocket.delete(socketId);
    return record;
  }

  resume(socketId: string, sessionToken: string, now = Date.now()): AckResponse<ResumeResult> {
    const record = this.recordsByToken.get(sessionToken);

    if (!record) {
      return fail("PLAYER_NOT_FOUND", "无法找到重连会话");
    }

    if (record.disconnectedAt && now - record.disconnectedAt > this.reconnectWindowMs) {
      return fail("RECONNECT_EXPIRED", "重连窗口已过期");
    }

    record.socketId = socketId;
    record.disconnectedAt = undefined;
    this.tokenBySocket.set(socketId, sessionToken);

    return ok({
      playerId: record.playerId,
      roomId: record.roomId,
      room: {
        id: record.roomId,
        ownerId: "",
        status: "lobby",
        players: []
      }
    });
  }

  getBySocket(socketId: string): ConnectionRecord | undefined {
    const token = this.tokenBySocket.get(socketId);
    return token ? this.recordsByToken.get(token) : undefined;
  }

  removeRoom(roomId: string): void {
    for (const [token, record] of this.recordsByToken.entries()) {
      if (record.roomId !== roomId) {
        continue;
      }

      this.recordsByToken.delete(token);
      if (record.socketId) {
        this.tokenBySocket.delete(record.socketId);
      }
    }
  }

  removePlayer(roomId: string, playerId: string): void {
    for (const [token, record] of this.recordsByToken.entries()) {
      if (record.roomId !== roomId || record.playerId !== playerId) {
        continue;
      }

      this.recordsByToken.delete(token);
      if (record.socketId) {
        this.tokenBySocket.delete(record.socketId);
      }
    }
  }
}
