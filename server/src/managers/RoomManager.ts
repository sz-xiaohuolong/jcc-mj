import type { AckResponse, JoinRoomResult, RoomPlayerView, RoomStateView } from "../../../shared/types/network";
import { fail, ok } from "../utils/result";

export interface RoomPlayer extends RoomPlayerView {
  sessionToken: string;
  socketId?: string;
  profileId?: string;
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
    players: room.players.map(({ sessionToken: _sessionToken, socketId: _socketId, profileId: _profileId, ...player }) => player)
  };
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom({ nickname, profileId, socketId }: { nickname: string; profileId?: string; socketId?: string }): { room: Room; player: RoomPlayer } {
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
      profileId: profileId ?? randomId("profile"),
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

  joinRoom({ roomId, nickname, profileId, socketId, sessionToken }: { roomId: string; nickname: string; profileId?: string; socketId?: string; sessionToken?: string }): AckResponse<JoinRoomResult & { player: RoomPlayer }> {
    const room = this.rooms.get(roomId.toUpperCase());
    const normalizedNickname = nickname.trim() || "玩家";

    if (!room) {
      return fail("ROOM_NOT_FOUND", "房间不存在");
    }

    const existingSessionPlayer = sessionToken ? room.players.find((player) => !player.isAI && player.sessionToken === sessionToken) : undefined;

    if (existingSessionPlayer) {
      existingSessionPlayer.connected = true;
      existingSessionPlayer.socketId = socketId;
      existingSessionPlayer.profileId = existingSessionPlayer.profileId ?? profileId ?? randomId("profile");
      existingSessionPlayer.disconnectedAt = undefined;
      return ok({
        room: toRoomStateView(room),
        player: existingSessionPlayer,
        playerId: existingSessionPlayer.id,
        sessionToken: existingSessionPlayer.sessionToken
      });
    }

    if (room.status !== "lobby") {
      const reconnectingPlayer = room.players.find(
        (player) => !player.isAI && !player.connected && (player.sessionToken === sessionToken || player.nickname === normalizedNickname)
      );

      if (reconnectingPlayer) {
        reconnectingPlayer.connected = true;
        reconnectingPlayer.socketId = socketId;
        reconnectingPlayer.profileId = reconnectingPlayer.profileId ?? profileId ?? randomId("profile");
        reconnectingPlayer.disconnectedAt = undefined;
        return ok({
          room: toRoomStateView(room),
          player: reconnectingPlayer,
          playerId: reconnectingPlayer.id,
          sessionToken: reconnectingPlayer.sessionToken
        });
      }

      return fail("GAME_ALREADY_STARTED", "游戏已经开始");
    }

    if (room.players.filter((player) => !player.isAI).length >= 4) {
      return fail("ROOM_FULL", "房间已满");
    }

    const player: RoomPlayer = {
      id: randomId("player"),
      nickname: normalizedNickname,
      isOwner: false,
      isAI: false,
      ready: false,
      connected: true,
      sessionToken: randomId("session"),
      profileId: profileId ?? randomId("profile"),
      socketId
    };

    room.players.push(player);
    return ok({ room: toRoomStateView(room), player, playerId: player.id, sessionToken: player.sessionToken });
  }

  destroyRoom(roomId: string): AckResponse<void> {
    if (!this.rooms.has(roomId)) {
      return fail("ROOM_NOT_FOUND", "房间不存在");
    }

    this.rooms.delete(roomId);
    return ok(undefined);
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

    if (room.status === "playing") {
      const player = room.players.find((item) => item.id === playerId);
      if (!player) {
        return fail("PLAYER_NOT_FOUND", "玩家不存在");
      }

      player.connected = false;
      player.socketId = undefined;
      player.disconnectedAt = Date.now();
      return ok(undefined);
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

  kickPlayer(roomId: string, ownerId: string, targetPlayerId: string): AckResponse<RoomPlayer> {
    const room = this.rooms.get(roomId);

    if (!room) {
      return fail("ROOM_NOT_FOUND", "房间不存在");
    }
    if (room.status !== "lobby") {
      return fail("GAME_ALREADY_STARTED", "游戏已经开始");
    }
    if (room.ownerId !== ownerId) {
      return fail("NOT_ROOM_OWNER", "只有房主可以踢出玩家");
    }
    if (ownerId === targetPlayerId) {
      return fail("INVALID_ACTION", "房主不能踢出自己");
    }

    const target = room.players.find((player) => player.id === targetPlayerId);

    if (!target) {
      return fail("PLAYER_NOT_FOUND", "玩家不存在");
    }
    if (target.isAI) {
      return fail("INVALID_ACTION", "不能踢出 AI 补位");
    }

    room.players = room.players.filter((player) => player.id !== targetPlayerId);
    return ok(target);
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
