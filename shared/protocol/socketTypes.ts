import type {
  Ack,
  ActionResult,
  BuyTilePayload,
  ChooseAugmentPayload,
  CreateRoomPayload,
  CreateRoomResult,
  DiscardTilePayload,
  EndTurnPayload,
  LevelUpPayload,
  GameError,
  GameEventLog,
  JoinRoomPayload,
  JoinRoomResult,
  LeaveRoomPayload,
  LockShopPayload,
  OrganizeHandPayload,
  PlayerConnectionPayload,
  ReadyPayload,
  RefreshShopPayload,
  ResumePayload,
  ResumeResult,
  RoomStateView,
  SellTilePayload,
  StartGamePayload,
  TimerPayload,
  ClientGameView
} from "../types/network";

export type ClientToServerEvents = {
  "room:create": (payload: CreateRoomPayload, ack: Ack<CreateRoomResult>) => void;
  "room:join": (payload: JoinRoomPayload, ack: Ack<JoinRoomResult>) => void;
  "room:leave": (payload: LeaveRoomPayload, ack: Ack<void>) => void;
  "room:ready": (payload: ReadyPayload, ack: Ack<void>) => void;
  "game:start": (payload: StartGamePayload, ack: Ack<void>) => void;
  "game:buyTile": (payload: BuyTilePayload, ack: Ack<ActionResult>) => void;
  "game:sellTile": (payload: SellTilePayload, ack: Ack<ActionResult>) => void;
  "game:refreshShop": (payload: RefreshShopPayload, ack: Ack<ActionResult>) => void;
  "game:lockShop": (payload: LockShopPayload, ack: Ack<ActionResult>) => void;
  "game:discardTile": (payload: DiscardTilePayload, ack: Ack<ActionResult>) => void;
  "game:chooseAugment": (payload: ChooseAugmentPayload, ack: Ack<ActionResult>) => void;
  "game:endTurn": (payload: EndTurnPayload, ack: Ack<ActionResult>) => void;
  "game:levelUp": (payload: LevelUpPayload, ack: Ack<ActionResult>) => void;
  "game:organizeHand": (payload: OrganizeHandPayload, ack: Ack<ActionResult>) => void;
  "connection:resume": (payload: ResumePayload, ack: Ack<ResumeResult>) => void;
};

export type ServerToClientEvents = {
  "room:state": (payload: RoomStateView) => void;
  "game:state": (payload: ClientGameView) => void;
  "game:event": (payload: GameEventLog) => void;
  "game:error": (payload: GameError) => void;
  "player:connected": (payload: PlayerConnectionPayload) => void;
  "player:disconnected": (payload: PlayerConnectionPayload) => void;
  "timer:update": (payload: TimerPayload) => void;
};
