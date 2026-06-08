# 服务端架构

## 总体原则

第二版采用服务端权威状态。

- 客户端只发送操作意图。
- 服务端校验操作是否合法。
- 服务端调用现有 `src/engine` 执行规则。
- 服务端按 playerId 生成不同的 `ClientGameView`。
- 客户端只展示服务端同步状态。

## 目录

```text
server/
├── src/
│   ├── index.ts
│   ├── socket/socketServer.ts
│   ├── managers/RoomManager.ts
│   ├── managers/GameSessionManager.ts
│   ├── managers/ConnectionManager.ts
│   ├── services/
│   ├── timers/TurnTimer.ts
│   └── tests/
shared/
├── protocol/
└── types/
```

## RoomManager

职责：

- 创建房间。
- 加入房间。
- 离开房间。
- 管理房主。
- 管理准备状态。
- 标记玩家连接状态。

## GameSessionManager

职责：

- 创建服务端权威游戏会话。
- 使用现有单机 engine 初始化游戏。
- 为每名玩家生成私有商店。
- 执行购买、刷新、锁店、弃牌、海克斯、升级、整理和结束回合；`sellTile` 作为兼容遗留动作保留。
- 生成公共视图和私有视图。
- 统一结算回合。
- 不足 4 人时补 AI。

## ConnectionManager

职责：

- 保存 socketId、playerId、roomId、sessionToken 映射。
- 断线时标记记录。
- 60 秒内允许 token 恢复。
- 超时返回 `RECONNECT_EXPIRED`。

## 倒计时

Socket 层为操作阶段启动服务端倒计时：

- 定期广播 `timer:update`。
- 超时后调用 `GameSessionManager.expireTurn`。
- 超时结算后广播新的 `game:state`。

## 迁移策略

当前版本采用渐进迁移：

- 第一版单机代码仍保留在 `src`。
- 服务端直接复用 `src/engine`、`src/data`、`src/types`。
- 新增 `shared` 存放网络协议和视图类型。

后续可以把纯规则 engine 从 `src/engine` 移到 `shared/engine`，再让前端和服务端共同引用。
