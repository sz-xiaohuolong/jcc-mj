import type { Server, Socket } from "socket.io";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../../../shared/protocol/events";
import type { ClientToServerEvents, ServerToClientEvents } from "../../../shared/protocol/socketTypes";
import type { AckResponse, ActionResult } from "../../../shared/types/network";
import { GameSessionManager } from "../managers/GameSessionManager";
import { ConnectionManager } from "../managers/ConnectionManager";
import { RoomManager, toRoomStateView } from "../managers/RoomManager";
import { fail, ok } from "../utils/result";

type OnlineServer = Server<ClientToServerEvents, ServerToClientEvents>;
type OnlineSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const roomManager = new RoomManager();
const gameSessionManager = new GameSessionManager();
const connectionManager = new ConnectionManager();
const timerIntervals = new Map<string, ReturnType<typeof setInterval>>();
const timerTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function currentPlayer(socket: OnlineSocket) {
  return connectionManager.getBySocket(socket.id);
}

function emitRoom(io: OnlineServer, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  io.to(room.id).emit(SERVER_EVENTS.roomState, toRoomStateView(room));
}

function emitGame(io: OnlineServer, roomId: string) {
  const room = roomManager.getRoom(roomId);
  const session = gameSessionManager.getSession(roomId);
  if (!room || !session) return;

  for (const player of room.players) {
    if (!player.socketId || player.isAI) continue;
    const view = gameSessionManager.buildClientGameView(roomId, player.id);
    if (view) {
      io.to(player.socketId).emit(SERVER_EVENTS.gameState, view);
    }
  }
}

function stopTurnTimer(roomId: string) {
  const interval = timerIntervals.get(roomId);
  const timeout = timerTimeouts.get(roomId);
  if (interval) clearInterval(interval);
  if (timeout) clearTimeout(timeout);
  timerIntervals.delete(roomId);
  timerTimeouts.delete(roomId);
}

function startTurnTimer(io: OnlineServer, roomId: string) {
  const session = gameSessionManager.getSession(roomId);
  if (!session || session.game.phase !== "shop") return;

  stopTurnTimer(roomId);
  const tick = () => {
    const remainingMs = Math.max(0, session.deadlineAt - Date.now());
    io.to(roomId).emit(SERVER_EVENTS.timerUpdate, { roomId, remainingMs, deadlineAt: session.deadlineAt });
  };

  tick();
  timerIntervals.set(roomId, setInterval(tick, 1000));
  timerTimeouts.set(
    roomId,
    setTimeout(() => {
      gameSessionManager.expireTurn(roomId);
      stopTurnTimer(roomId);
      emitGame(io, roomId);
      startTurnTimer(io, roomId);
    }, Math.max(0, session.deadlineAt - Date.now()))
  );
}

function ackAndBroadcast(io: OnlineServer, roomId: string, result: AckResponse<ActionResult>, ack: (response: AckResponse<ActionResult>) => void) {
  ack(result);
  if (result.ok) {
    emitRoom(io, roomId);
    emitGame(io, roomId);
  }
}

function requireConnection(socket: OnlineSocket): AckResponse<{ roomId: string; playerId: string }> {
  const record = currentPlayer(socket);
  if (!record) {
    return fail("PLAYER_NOT_FOUND", "连接未绑定玩家");
  }
  return ok({ roomId: record.roomId, playerId: record.playerId });
}

export function setupSocketServer(io: OnlineServer) {
  io.on("connection", (socket) => {
    socket.on(CLIENT_EVENTS.roomCreate, (payload, ack) => {
      const created = roomManager.createRoom({ nickname: payload.nickname, socketId: socket.id });
      socket.join(created.room.id);
      connectionManager.register(socket.id, created.room.id, created.player.id, created.player.sessionToken);
      const roomView = toRoomStateView(created.room);
      ack({ ok: true, data: { room: roomView, playerId: created.player.id, sessionToken: created.player.sessionToken } });
      emitRoom(io, created.room.id);
    });

    socket.on(CLIENT_EVENTS.roomJoin, (payload, ack) => {
      const result = roomManager.joinRoom({ roomId: payload.roomId, nickname: payload.nickname, socketId: socket.id });
      if (!result.ok || !result.data) {
        ack({ ok: false, error: result.error });
        return;
      }
      socket.join(result.data.room.id);
      connectionManager.register(socket.id, result.data.room.id, result.data.player.id, result.data.sessionToken);
      ack({ ok: true, data: { room: result.data.room, playerId: result.data.player.id, sessionToken: result.data.sessionToken } });
      emitRoom(io, result.data.room.id);
    });

    socket.on(CLIENT_EVENTS.roomLeave, (payload, ack) => {
      const record = currentPlayer(socket);
      const result = record ? roomManager.leaveRoom(payload.roomId, record.playerId) : fail<void>("PLAYER_NOT_FOUND", "连接未绑定玩家");
      socket.leave(payload.roomId);
      ack(result);
      emitRoom(io, payload.roomId);
    });

    socket.on(CLIENT_EVENTS.roomReady, (payload, ack) => {
      const record = currentPlayer(socket);
      const result = record ? roomManager.setReady(payload.roomId, record.playerId, payload.ready) : fail<void>("PLAYER_NOT_FOUND", "连接未绑定玩家");
      ack(result);
      emitRoom(io, payload.roomId);
    });

    socket.on(CLIENT_EVENTS.gameStart, (payload, ack) => {
      const record = currentPlayer(socket);
      const room = roomManager.getRoom(payload.roomId);

      if (!record || !room) {
        ack(fail("ROOM_NOT_FOUND", "房间不存在"));
        return;
      }
      if (room.ownerId !== record.playerId) {
        ack(fail("NOT_ROOM_OWNER", "只有房主可以开始游戏"));
        return;
      }
      if (room.status !== "lobby") {
        ack(fail("GAME_ALREADY_STARTED", "游戏已经开始"));
        return;
      }
      if (!room.players.filter((player) => !player.isAI && player.id !== room.ownerId).every((player) => player.ready)) {
        ack(fail("INVALID_ACTION", "还有玩家未准备"));
        return;
      }

      roomManager.markPlaying(room.id);
      gameSessionManager.startGame(room);
      ack(ok(undefined));
      emitRoom(io, room.id);
      emitGame(io, room.id);
      startTurnTimer(io, room.id);
    });

    socket.on(CLIENT_EVENTS.gameBuyTile, (payload, ack) => {
      const record = requireConnection(socket);
      if (!record.ok || !record.data) return ack({ ok: false, error: record.error });
      ackAndBroadcast(io, payload.roomId, gameSessionManager.buyTile(payload.roomId, record.data.playerId, payload.instanceId), ack);
    });

    socket.on(CLIENT_EVENTS.gameSellTile, (payload, ack) => {
      const record = requireConnection(socket);
      if (!record.ok || !record.data) return ack({ ok: false, error: record.error });
      ackAndBroadcast(io, payload.roomId, gameSessionManager.sellTile(payload.roomId, record.data.playerId, payload.instanceId), ack);
    });

    socket.on(CLIENT_EVENTS.gameRefreshShop, (payload, ack) => {
      const record = requireConnection(socket);
      if (!record.ok || !record.data) return ack({ ok: false, error: record.error });
      ackAndBroadcast(io, payload.roomId, gameSessionManager.refreshShop(payload.roomId, record.data.playerId), ack);
    });

    socket.on(CLIENT_EVENTS.gameLockShop, (payload, ack) => {
      const record = requireConnection(socket);
      if (!record.ok || !record.data) return ack({ ok: false, error: record.error });
      ackAndBroadcast(io, payload.roomId, gameSessionManager.lockShop(payload.roomId, record.data.playerId), ack);
    });

    socket.on(CLIENT_EVENTS.gameDiscardTile, (payload, ack) => {
      const record = requireConnection(socket);
      if (!record.ok || !record.data) return ack({ ok: false, error: record.error });
      ackAndBroadcast(io, payload.roomId, gameSessionManager.discardTile(payload.roomId, record.data.playerId, payload.instanceId), ack);
    });

    socket.on(CLIENT_EVENTS.gameChooseAugment, (payload, ack) => {
      const record = requireConnection(socket);
      if (!record.ok || !record.data) return ack({ ok: false, error: record.error });
      ackAndBroadcast(io, payload.roomId, gameSessionManager.chooseAugment(payload.roomId, record.data.playerId, payload.augmentId), ack);
    });

    socket.on(CLIENT_EVENTS.gameEndTurn, (payload, ack) => {
      const record = requireConnection(socket);
      if (!record.ok || !record.data) return ack({ ok: false, error: record.error });
      const beforeRound = gameSessionManager.getSession(payload.roomId)?.game.round;
      const result = gameSessionManager.endTurn(payload.roomId, record.data.playerId);
      ackAndBroadcast(io, payload.roomId, result, ack);
      const after = gameSessionManager.getSession(payload.roomId);
      if (result.ok && after && after.game.round !== beforeRound) {
        startTurnTimer(io, payload.roomId);
      }
    });

    socket.on(CLIENT_EVENTS.connectionResume, (payload, ack) => {
      const result = connectionManager.resume(socket.id, payload.sessionToken);
      if (!result.ok || !result.data) {
        ack(result);
        return;
      }
      const room = roomManager.getRoom(result.data.roomId);
      if (!room) {
        ack(fail("ROOM_NOT_FOUND", "房间不存在"));
        return;
      }
      socket.join(room.id);
      roomManager.markConnected(result.data.playerId, socket.id, true);
      ack(ok({ ...result.data, room: toRoomStateView(room) }));
      emitRoom(io, room.id);
      emitGame(io, room.id);
    });

    socket.on("disconnect", () => {
      const record = connectionManager.markDisconnected(socket.id);
      if (!record) return;
      roomManager.markConnected(record.playerId, socket.id, false);
      emitRoom(io, record.roomId);
      io.to(record.roomId).emit(SERVER_EVENTS.playerDisconnected, {
        roomId: record.roomId,
        playerId: record.playerId,
        connected: false
      });
    });
  });
}
