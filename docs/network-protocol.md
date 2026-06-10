# Socket.IO 协议

事件名集中定义在 `shared/protocol/events.ts`，payload 和视图类型定义在 `shared/types/network.ts`。

## Client to Server

| 事件 | 说明 |
| --- | --- |
| `room:create` | 创建房间，payload 包含 `nickname` 和长期身份 `profileId` |
| `room:join` | 加入房间，payload 包含 `roomId`、`nickname`、长期身份 `profileId` 和可选 `sessionToken` |
| `room:leave` | 离开房间 |
| `room:ready` | 设置准备状态 |
| `game:start` | 房主开始游戏 |
| `game:buyTile` | 购买私有商店牌 |
| `game:sellTile` | 兼容遗留动作；当前前端玩法不再暴露备牌出售 |
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
- `privatePlayer`：当前 socket 对应玩家的手牌、私有商店、海克斯选项。`benchTiles` 字段短期保留为空数组用于兼容旧客户端。

`PublicGameView` 还会带上：

- `ranking`：最终排名或当前排序。
- `ratingChanges`：游戏结束后的联机积分变化。
- `leaderboard`：当前服务端联机榜快照。

## REST API

| 接口 | 说明 |
| --- | --- |
| `GET /health` | 服务健康检查 |
| `GET /leaderboard` | 获取联机排行榜 |

`/leaderboard` 返回 `LeaderboardItem[]`，字段包括昵称、段位、积分、胜场、对局、胜率和最高胡牌战力。

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
