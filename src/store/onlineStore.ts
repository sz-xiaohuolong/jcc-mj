import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../../shared/protocol/events";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/protocol/socketTypes";
import type { ClientGameView, CreateRoomResult, GameError, JoinRoomResult, RoomStateView } from "../../shared/types/network";
import { useGameStore } from "./gameStore";

type OnlineSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface OnlineState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  socketId?: string;
  playerId?: string;
  sessionToken?: string;
  roomId?: string;
  nickname: string;
  roomState?: RoomStateView;
  gameView?: ClientGameView;
  lastError?: string;
  timerRemainingMs?: number;
  socket?: OnlineSocket;
  setNickname: (nickname: string) => void;
  connect: () => Promise<OnlineSocket>;
  createRoom: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  setReady: (ready: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  buyTile: (instanceId: string) => Promise<void>;
  sellTile: (instanceId: string) => Promise<void>;
  refreshShop: () => Promise<void>;
  lockShop: () => Promise<void>;
  discardTile: (instanceId: string) => Promise<void>;
  chooseAugment: (augmentId: string) => Promise<void>;
  endTurn: () => Promise<void>;
}

const serverUrl = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";
const sessionKey = "jcc-mj-online-session";

function ackToPromise<T>(emit: (ack: (response: { ok: boolean; data?: T; error?: GameError }) => void) => void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    emit((response) => {
      if (!response.ok) {
        reject(new Error(response.error?.message ?? "操作失败"));
        return;
      }
      resolve(response.data);
    });
  });
}

function installSocketHandlers(socket: OnlineSocket) {
  socket.on("connect", () => {
    useOnlineStore.setState({ connected: true, connecting: false, socketId: socket.id, lastError: undefined });
  });
  socket.on("disconnect", () => {
    useOnlineStore.setState({ connected: false, reconnecting: true });
  });
  socket.on(SERVER_EVENTS.roomState, (roomState) => {
    useOnlineStore.setState({ roomState, roomId: roomState.id });
  });
  socket.on(SERVER_EVENTS.gameState, (gameView) => {
    useOnlineStore.setState({ gameView });
    useGameStore.setState({ view: "online-game" });
  });
  socket.on(SERVER_EVENTS.gameError, (error) => {
    useOnlineStore.setState({ lastError: error.message });
  });
  socket.on(SERVER_EVENTS.timerUpdate, (timer) => {
    useOnlineStore.setState({ timerRemainingMs: Math.max(0, timer.remainingMs) });
  });
}

async function getSocket(): Promise<OnlineSocket> {
  const state = useOnlineStore.getState();
  if (state.socket) return state.socket;
  return state.connect();
}

async function emitAction(event: keyof ClientToServerEvents, payload: { roomId: string; [key: string]: unknown }) {
  const socket = await getSocket();
  try {
    await ackToPromise((ack) => {
      socket.emit(event, payload as never, ack as never);
    });
  } catch (error) {
    useOnlineStore.setState({ lastError: error instanceof Error ? error.message : "操作失败" });
  }
}

export const useOnlineStore = create<OnlineState>((set, get) => ({
  connected: false,
  connecting: false,
  reconnecting: false,
  nickname: localStorage.getItem("jcc-mj-nickname") ?? "玩家",

  setNickname(nickname) {
    localStorage.setItem("jcc-mj-nickname", nickname);
    set({ nickname });
  },

  async connect() {
    const existing = get().socket;
    if (existing) return existing;

    set({ connecting: true, lastError: undefined });
    const socket: OnlineSocket = io(serverUrl, { transports: ["websocket", "polling"] });
    installSocketHandlers(socket);
    set({ socket });

    const savedToken = localStorage.getItem(sessionKey);
    if (savedToken) {
      socket.on("connect", () => {
        socket.emit(CLIENT_EVENTS.connectionResume, { sessionToken: savedToken }, (response) => {
          if (response.ok && response.data) {
            set({
              reconnecting: false,
              playerId: response.data.playerId,
              roomId: response.data.roomId,
              roomState: response.data.room,
              sessionToken: savedToken
            });
            useGameStore.setState({ view: response.data.room.status === "playing" ? "online-game" : "online-lobby" });
          }
        });
      });
    }

    return socket;
  },

  async createRoom() {
    const socket = await getSocket();
    try {
      const data = await ackToPromise<CreateRoomResult>((ack) => socket.emit(CLIENT_EVENTS.roomCreate, { nickname: get().nickname }, ack));
      if (!data) return;
      localStorage.setItem(sessionKey, data.sessionToken);
      set({ playerId: data.playerId, sessionToken: data.sessionToken, roomId: data.room.id, roomState: data.room });
      useGameStore.setState({ view: "online-lobby" });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : "创建房间失败" });
    }
  },

  async joinRoom(roomId) {
    const socket = await getSocket();
    try {
      const data = await ackToPromise<JoinRoomResult>((ack) => socket.emit(CLIENT_EVENTS.roomJoin, { roomId: roomId.toUpperCase(), nickname: get().nickname }, ack));
      if (!data) return;
      localStorage.setItem(sessionKey, data.sessionToken);
      set({ playerId: data.playerId, sessionToken: data.sessionToken, roomId: data.room.id, roomState: data.room });
      useGameStore.setState({ view: "online-lobby" });
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : "加入房间失败" });
    }
  },

  leaveRoom() {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit(CLIENT_EVENTS.roomLeave, { roomId }, () => undefined);
    }
    set({ roomId: undefined, roomState: undefined, gameView: undefined });
    useGameStore.setState({ view: "online-home" });
  },

  async setReady(ready) {
    const roomId = get().roomId;
    if (!roomId) return;
    await emitAction(CLIENT_EVENTS.roomReady, { roomId, ready });
  },

  async startGame() {
    const roomId = get().roomId;
    if (!roomId) return;
    const socket = await getSocket();
    try {
      await ackToPromise((ack) => socket.emit(CLIENT_EVENTS.gameStart, { roomId }, ack));
    } catch (error) {
      set({ lastError: error instanceof Error ? error.message : "开始游戏失败" });
    }
  },

  async buyTile(instanceId) {
    const roomId = get().roomId;
    if (roomId) await emitAction(CLIENT_EVENTS.gameBuyTile, { roomId, instanceId });
  },
  async sellTile(instanceId) {
    const roomId = get().roomId;
    if (roomId) await emitAction(CLIENT_EVENTS.gameSellTile, { roomId, instanceId });
  },
  async refreshShop() {
    const roomId = get().roomId;
    if (roomId) await emitAction(CLIENT_EVENTS.gameRefreshShop, { roomId });
  },
  async lockShop() {
    const roomId = get().roomId;
    if (roomId) await emitAction(CLIENT_EVENTS.gameLockShop, { roomId });
  },
  async discardTile(instanceId) {
    const roomId = get().roomId;
    if (roomId) await emitAction(CLIENT_EVENTS.gameDiscardTile, { roomId, instanceId });
  },
  async chooseAugment(augmentId) {
    const roomId = get().roomId;
    if (roomId) await emitAction(CLIENT_EVENTS.gameChooseAugment, { roomId, augmentId });
  },
  async endTurn() {
    const roomId = get().roomId;
    if (roomId) await emitAction(CLIENT_EVENTS.gameEndTurn, { roomId });
  }
}));
