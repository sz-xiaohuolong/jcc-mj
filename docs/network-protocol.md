# Socket.IO 协议

事件名集中定义在 `shared/protocol/events.ts`，payload 和视图类型定义在 `shared/types/network.ts`。

## Client to Server

| 事件 | 说明 |
| --- | --- |
| `room:create` | 创建房间 |
| `room:join` | 加入房间 |
| `room:leave` | 离开房间 |
| `room:ready` | 设置准备状态 |
| `game:start` | 房主开始游戏 |
| `game:buyTile` | 购买私有商店牌 |
| `game:sellTile` | 出售手牌或备牌 |
| `game:refreshShop` | 刷新私有商店 |
| `game:lockShop` | 锁定 / 解锁私有商店 |
| `game:discardTile` | 弃牌 |
| `game:chooseAugment` | 选择海克斯 |
| `game:endTurn` | 结束当前回合 |
| `connection:resume` | 使用 sessionToken 重连 |

所有客户端事件都使用 ack：

```ts
{
  ok: boolean;
  data?: T;
  error?: {
    code: GameErrorCode;
    message: string;
  };
}
```

## Server to Client

| 事件 | 说明 |
| --- | --- |
| `room:state` | 房间大厅状态 |
| `game:state` | 当前玩家专属游戏视图 |
| `game:event` | 游戏事件日志 |
| `game:error` | 统一错误 |
| `player:connected` | 玩家连接 |
| `player:disconnected` | 玩家断线 |
| `timer:update` | 服务端倒计时 |

## 私有视图

服务端不会把所有玩家手牌广播给所有人。`ClientGameView` 包含：

- `public`：公共游戏状态，如玩家血量、金币、等级、弃牌区、城邦、回合、日志。
- `privatePlayer`：当前 socket 对应玩家的手牌、备牌、私有商店、海克斯选项。

## 错误码

主要错误码：

- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `GAME_ALREADY_STARTED`
- `NOT_ROOM_OWNER`
- `PLAYER_NOT_FOUND`
- `INVALID_PHASE`
- `NOT_ENOUGH_GOLD`
- `TILE_NOT_FOUND`
- `INVALID_ACTION`
- `ALREADY_READY`
- `ALREADY_ENDED_TURN`
- `RECONNECT_EXPIRED`
- `INTERNAL_ERROR`
