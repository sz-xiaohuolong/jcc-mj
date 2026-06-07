import type { ActiveTrait, AugmentDefinition, CityDefinition, GameLog, GamePhase, SettlementEntry, TileInstance } from "../../src/types";

export type GameErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_ALREADY_STARTED"
  | "NOT_ROOM_OWNER"
  | "PLAYER_NOT_FOUND"
  | "INVALID_PHASE"
  | "NOT_ENOUGH_GOLD"
  | "TILE_NOT_FOUND"
  | "INVALID_ACTION"
  | "ALREADY_READY"
  | "ALREADY_ENDED_TURN"
  | "RECONNECT_EXPIRED"
  | "INTERNAL_ERROR";

export interface GameError {
  code: GameErrorCode;
  message: string;
}

export type AckResponse<T> = {
  ok: boolean;
  data?: T;
  error?: GameError;
};

export type Ack<T> = (response: AckResponse<T>) => void;

export interface CreateRoomPayload {
  nickname: string;
}

export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface ReadyPayload {
  roomId: string;
  ready: boolean;
}

export interface StartGamePayload {
  roomId: string;
}

export interface BuyTilePayload {
  roomId: string;
  instanceId: string;
}

export interface SellTilePayload {
  roomId: string;
  instanceId: string;
}

export interface RefreshShopPayload {
  roomId: string;
}

export interface LockShopPayload {
  roomId: string;
}

export interface DiscardTilePayload {
  roomId: string;
  instanceId: string;
}

export interface ChooseAugmentPayload {
  roomId: string;
  augmentId: string;
}

export interface EndTurnPayload {
  roomId: string;
}

export interface ResumePayload {
  sessionToken: string;
}

export interface RoomPlayerView {
  id: string;
  nickname: string;
  isOwner: boolean;
  isAI: boolean;
  ready: boolean;
  connected: boolean;
  disconnectedAt?: number;
}

export interface RoomStateView {
  id: string;
  ownerId: string;
  status: "lobby" | "playing" | "finished";
  players: RoomPlayerView[];
}

export interface CreateRoomResult {
  room: RoomStateView;
  playerId: string;
  sessionToken: string;
}

export interface JoinRoomResult {
  room: RoomStateView;
  playerId: string;
  sessionToken: string;
}

export interface ResumeResult {
  room: RoomStateView;
  playerId: string;
  roomId: string;
}

export interface ActionResult {
  room?: RoomStateView;
  game?: ClientGameView;
}

export interface PublicPlayerGameView {
  id: string;
  name: string;
  isAI: boolean;
  hp: number;
  gold: number;
  level: number;
  isAlive: boolean;
  isWinning: boolean;
  lockedShop: boolean;
  endedTurn: boolean;
  connected: boolean;
  activeTraits: ActiveTrait[];
  augments: Pick<AugmentDefinition, "id" | "name" | "rarity" | "description">[];
  discardTiles: TileInstance[];
  handTileCount: number;
  benchTileCount: number;
}

export interface PublicGameView {
  roomId: string;
  phase: GamePhase;
  round: number;
  stage: number;
  city: CityDefinition | null;
  players: PublicPlayerGameView[];
  logs: GameLog[];
  lastSettlement: SettlementEntry[];
  winnerId: string | null;
  ranking: string[];
  deadlineAt?: number;
}

export interface PrivatePlayerView {
  playerId: string;
  handTiles: TileInstance[];
  benchTiles: TileInstance[];
  shop: TileInstance[];
  augmentChoices: AugmentDefinition[];
  gold: number;
  level: number;
  hp: number;
  lockedShop: boolean;
  endedTurn: boolean;
}

export interface ClientGameView {
  public: PublicGameView;
  privatePlayer: PrivatePlayerView;
}

export interface GameEventLog {
  roomId: string;
  message: string;
  tone?: "info" | "good" | "warn" | "danger";
}

export interface PlayerConnectionPayload {
  roomId: string;
  playerId: string;
  connected: boolean;
}

export interface TimerPayload {
  roomId: string;
  remainingMs: number;
  deadlineAt: number;
}
