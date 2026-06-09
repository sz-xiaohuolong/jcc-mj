export const CLIENT_EVENTS = {
  roomCreate: "room:create",
  roomJoin: "room:join",
  roomLeave: "room:leave",
  roomKick: "room:kick",
  roomReady: "room:ready",
  gameStart: "game:start",
  gameBuyTile: "game:buyTile",
  gameSellTile: "game:sellTile",
  gameRefreshShop: "game:refreshShop",
  gameLockShop: "game:lockShop",
  gameDiscardTile: "game:discardTile",
  gameChooseAugment: "game:chooseAugment",
  gameEndTurn: "game:endTurn",
  gameLevelUp: "game:levelUp",
  gameOrganizeHand: "game:organizeHand",
  connectionResume: "connection:resume"
} as const;

export const SERVER_EVENTS = {
  roomState: "room:state",
  roomKicked: "room:kicked",
  gameState: "game:state",
  gameEvent: "game:event",
  gameError: "game:error",
  playerConnected: "player:connected",
  playerDisconnected: "player:disconnected",
  timerUpdate: "timer:update"
} as const;
