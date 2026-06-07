import type { AckResponse, JoinRoomResult, RoomPlayerView, RoomStateView } from "../../../shared/types/network";
import { fail, ok } from "../utils/result";

export interface RoomPlayer extends RoomPlayerView {
  sessionToken: string;
  socketId?: string;
}

export interface Room {
  id: string;
  ownerId: string;
  status: "lobby" | "playing" | "finished";
  players: RoomPlayer[];
  createdAt: number;
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function roomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function toRoomStateView(room: Room): RoomStateView {
  return {
    id: room.id,
    ownerId: room.ownerId,
    status: room.status,
    players: room.players.map(({ sessionToken: _sessionToken, socketId: _socketId, ...player }) => player)
  };
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom({ nickname, socketId }: { nickname: string; socketId?: string }): { room: Room; player: RoomPlayer } {
    let id = roomCode();

    while (this.rooms.has(id)) {
      id = roomCode();
    }

    const player: RoomPlayer = {
      id: randomId("player"),
      nickname: nickname.trim() || "玩家",
      isOwner: true,
      isAI: false,
      ready: false,
      connected: true,
      sessionToken: randomId("session"),
      socketId
    };
    const room: Room = {
      id,
      ownerId: player.id,
      status: "lobby",
      players: [player],
      createdAt: Date.now()
    };

    this.rooms.set(id, room);
    return { room, player };
  }

  joinRoom({ roomId, nickname, socketId }: { roomId: string; nickname: string; socketId?: string }): AckResponse<JoinRoomResult & { player: RoomPlayer }> {
    const room = this.rooms.get(roomId.toUpperCase());

    if (!room) {
      return fail("ROOM_NOT_FOUND", "房间不存在");
    }

    if (room.status !== "lobby") {
      return fail("GAME_ALREADY_STARTED", "游戏已经开始");
    }

    if (room.players.filter((player) => !player.isAI).length >= 4) {
      return fail("ROOM_FULL", "房间已满");
    }

    const player: RoomPlayer = {
      id: randomId("player"),
      nickname: nickname.trim() || "玩家",
      isOwner: false,
      isAI: false,
      ready: false,
      connected: true,
      sessionToken: randomId("session"),
      socketId
    };

    room.players.push(player);
    return ok({ room: toRoomStateView(room), player, playerId: player.id, sessionToken: player.sessionToken });
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayer(playerId: string): Room | undefined {
    return [...this.rooms.values()].find((room) => room.players.some((player) => player.id === playerId));
  }

  setReady(roomId: string, playerId: string, ready: boolean): AckResponse<void> {
    const room = this.rooms.get(roomId);
    const player = room?.players.find((item) => item.id === playerId);

    if (!room) return fail("ROOM_NOT_FOUND", "房间不存在");
    if (!player) return fail("PLAYER_NOT_FOUND", "玩家不存在");
    if (room.status !== "lobby") return fail("GAME_ALREADY_STARTED", "游戏已经开始");

    player.ready = ready;
    return ok(undefined);
  }

  leaveRoom(roomId: string, playerId: string): AckResponse<void> {
    const room = this.rooms.get(roomId);

    if (!room) {
      return fail("ROOM_NOT_FOUND", "房间不存在");
    }

    room.players = room.players.filter((player) => player.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return ok(undefined);
    }

    if (room.ownerId === playerId) {
      room.ownerId = room.players[0].id;
      room.players = room.players.map((player) => ({ ...player, isOwner: player.id === room.ownerId }));
    }

    return ok(undefined);
  }

  markPlaying(roomId: string): AckResponse<void> {
    const room = this.rooms.get(roomId);

    if (!room) return fail("ROOM_NOT_FOUND", "房间不存在");

    room.status = "playing";
    return ok(undefined);
  }

  markConnected(playerId: string, socketId: string, connected: boolean, now = Date.now()): void {
    const room = this.getRoomByPlayer(playerId);
    const player = room?.players.find((item) => item.id === playerId);

    if (!player) return;

    player.connected = connected;
    player.socketId = connected ? socketId : undefined;
    player.disconnectedAt = connected ? undefined : now;
  }
}
