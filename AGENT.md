# AGENT.md

## Project Snapshot

项目名：金铲铲麻将 / 羁绊麻将  
仓库：`https://github.com/sz-xiaohuolong/jcc-mj`  
当前分支：`main`  
最新提交：

- `a84695b fix: add online organize and level actions`
- `14c4d10 feat: add online multiplayer mvp`
- `48de185 feat: initial playable jcc mahjong mvp`

当前版本已经从单机 MVP 扩展到联机 MVP。核心原则是：单机模式保留本地 Zustand 状态；联机模式使用服务端权威状态，客户端只发送操作意图。

## How To Run

安装依赖：

```bash
npm install
```

一键启动前后端：

```bash
npm run dev
```

启动后：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`
- 后端健康检查：`http://localhost:8787/health`

也可以分开启动：

```bash
npm run dev:client
npm run dev:server
```

验证：

```bash
npm test
npm run build
```

最近一次验证结果：

- `npm test`：9 个测试文件，26 个测试通过
- `npm run build`：通过

## Current Feature Set

### Single Player Mode

入口：首页点击“单机模式”。

已实现：

- 1 名玩家 + 3 名 AI
- 随机城邦
- 私有手牌、弃牌
- 商店 5 张牌
- 购买、刷新、锁店、弃牌、整理
- 金币、利息、等级、升级
- 羁绊、海克斯、城邦
- 基础胡牌、七对子、碰碰胡、清一色
- AI 自动行动
- 胡牌质量对决、回合结算、淘汰、胜负展示

单机状态入口：

- `src/store/gameStore.ts`

单机主界面：

- `src/components/GameBoard.tsx`
- `src/components/ShopArea.tsx`
- `src/components/HandArea.tsx`

### Online Mode

入口：首页点击“联机模式”。

已实现：

- Socket.IO + Express 后端
- 创建房间
- 加入房间
- 复制房间号
- 房间玩家列表
- 玩家准备
- 房主开始游戏
- 不足 4 人时服务端自动补 AI
- 服务端生成城邦和游戏状态
- 每名真人玩家独立私有手牌、商店、海克斯选项
- 公共状态广播：玩家血量、金币、等级、羁绊、海克斯名称、弃牌区、回合、城邦、日志、排名
- 服务端校验购买、刷新、锁店、弃牌、选海克斯、结束回合、升级、整理
- 所有操作通过 Socket.IO ack 返回成功或错误
- 服务端倒计时广播
- 超时后服务端统一结算
- 60 秒内基础重连恢复

联机入口和页面：

- `src/pages/OnlineHomePage.tsx`
- `src/pages/RoomLobbyPage.tsx`
- `src/pages/OnlineGamePage.tsx`

联机前端状态：

- `src/store/onlineStore.ts`

联机服务端入口：

- `server/src/index.ts`
- `server/src/socket/socketServer.ts`

## Architecture

### Frontend

技术栈：

- React
- TypeScript
- Vite
- Zustand
- Tailwind CSS + 自定义 CSS
- Framer Motion
- lucide-react

页面路由目前是轻量本地 view 状态，不使用 React Router：

- `src/App.tsx`
- `src/store/gameStore.ts`

`gameStore.view` 当前可能值：

- `home`
- `game`
- `rules`
- `online-home`
- `online-lobby`
- `online-game`

### Engine

规则模块仍在 `src/engine`，供单机和服务端复用：

- `src/engine/huChecker.ts`
- `src/engine/shopEngine.ts`
- `src/engine/traitEngine.ts`
- `src/engine/augmentEngine.ts`
- `src/engine/cityEngine.ts`
- `src/engine/damageEngine.ts`
- `src/engine/aiEngine.ts`
- `src/engine/gameEngine.ts`

重要规则：

- 胡牌判定独立于 UI 和 store。
- 多人同时胡牌时按胡牌战力分决出本回合胜者，其他胡牌者按分差少量扣血。
- 当前版本没有备牌区；手牌满 14 张后不能继续购买，需要先弃 1 张。
- 每名玩家每回合只能弃 1 张牌，弃牌会回到公共牌库。
- `gameEngine.ts` 内有初始化、购买、弃牌、升级、结算等单机通用函数。
- 联机 `GameSessionManager` 复用这些 engine/data/type，不另写一套规则。

### Data

静态配置：

- `src/data/tiles.ts`
- `src/data/traits.ts`
- `src/data/augments.ts`
- `src/data/cities.ts`

注意：不能使用金铲铲、英雄联盟、云顶之弈真实 IP 素材、角色、羁绊名或装备图。

### Shared Protocol

联机协议和网络视图集中在：

- `shared/protocol/events.ts`
- `shared/protocol/socketTypes.ts`
- `shared/types/network.ts`

新增 Socket 事件时，必须同步更新：

1. `shared/protocol/events.ts`
2. `shared/protocol/socketTypes.ts`
3. `shared/types/network.ts`
4. `server/src/socket/socketServer.ts`
5. `src/store/onlineStore.ts`
6. 对应测试

### Server

后端技术栈：

- Node.js
- TypeScript
- Express
- Socket.IO
- 内存存储

核心文件：

- `server/src/index.ts`
- `server/src/socket/socketServer.ts`
- `server/src/managers/RoomManager.ts`
- `server/src/managers/GameSessionManager.ts`
- `server/src/managers/ConnectionManager.ts`
- `server/src/timers/TurnTimer.ts`

职责：

- `RoomManager`：房间创建、加入、离开、房主、准备状态、连接状态。
- `GameSessionManager`：服务端权威游戏状态、私有商店、私有视图、游戏操作、统一结算、AI 补位。
- `ConnectionManager`：socketId / playerId / roomId / sessionToken 映射，基础重连。

## Online Server Actions

当前已经实现的联机客户端到服务端事件：

- `room:create`
- `room:join`
- `room:leave`
- `room:ready`
- `game:start`
- `game:buyTile`
- `game:sellTile`
- `game:refreshShop`
- `game:lockShop`
- `game:discardTile`
- `game:chooseAugment`
- `game:endTurn`
- `game:levelUp`
- `game:organizeHand`
- `connection:resume`

当前服务端到客户端事件：

- `room:state`
- `game:state`
- `game:event`
- `game:error`
- `player:connected`
- `player:disconnected`
- `timer:update`

所有游戏操作应走 ack，不要让客户端自行决定最终结果。

## Privacy Model

联机模式必须严格区分公共状态和私有状态。

公共状态：

- 房间号
- 玩家昵称、生命、金币、等级、准备/结束回合状态
- 玩家羁绊
- 玩家已选择海克斯名称
- 玩家弃牌区
- 城邦、回合、阶段、日志、排名

私有状态：

- 自己的手牌
- 自己的商店
- 自己的海克斯选项

生成视图的核心函数：

- `GameSessionManager.buildPublicGameView`
- `GameSessionManager.buildPrivatePlayerView`
- `GameSessionManager.buildClientGameView`

不要把完整 `GameState` 广播给所有客户端。

## Tests

测试目录：

- `src/tests/`
- `server/src/tests/`

重点测试：

- `src/tests/huChecker.test.ts`
- `src/tests/shopEngine.test.ts`
- `src/tests/traitEngine.test.ts`
- `src/tests/aiEngine.test.ts`
- `src/tests/gameFlow.test.ts`
- `src/tests/gameStore.test.ts`
- `server/src/tests/room.test.ts`
- `server/src/tests/gameActions.test.ts`
- `server/src/tests/reconnect.test.ts`

最近新增的联机修复测试在：

- `server/src/tests/gameActions.test.ts`

覆盖：

- 联机升级扣金币并提升等级
- 联机整理手牌按牌序排序

## Recent Fixes

### Refresh Cost Fix

问题：迅刃“每回合首次刷新折扣”曾经每次刷新都生效。  
修复：`PlayerState.hasRefreshedThisRound`，刷新后置 true，回合结算重置。

相关文件：

- `src/types.ts`
- `src/store/gameStore.ts`
- `src/engine/gameEngine.ts`
- `src/tests/gameStore.test.ts`

### Online Organize / Level Fix

问题：联机模式没有整理和升级。  
修复：

- 新增协议事件 `game:levelUp`、`game:organizeHand`
- 服务端 `GameSessionManager.levelUp`
- 服务端 `GameSessionManager.organizeHand`
- Socket handler 接入
- `onlineStore` 接入
- `OnlineGamePage` 增加按钮

相关文件：

- `shared/protocol/events.ts`
- `shared/protocol/socketTypes.ts`
- `shared/types/network.ts`
- `server/src/managers/GameSessionManager.ts`
- `server/src/socket/socketServer.ts`
- `src/store/onlineStore.ts`
- `src/pages/OnlineGamePage.tsx`
- `server/src/tests/gameActions.test.ts`

## Manual Smoke Test

Socket smoke test流程：

1. 启动 `npm run dev`
2. 用两个 Socket.IO 客户端连接 `http://localhost:8787`
3. A 创建房间
4. B 加入房间
5. B 准备
6. A 开始游戏
7. 确认服务端补到 4 人
8. 确认 A/B 私有手牌不同
9. A 购买牌
10. A 升级
11. A 整理手牌

浏览器 smoke test流程：

1. 打开 `http://localhost:5173`
2. 首页应看到“单机模式”“联机模式”
3. 点击“联机模式”
4. 输入昵称
5. 点击“创建房间”
6. 进入大厅，看到房间号、复制按钮、玩家列表、开始游戏按钮

## Known Limitations

当前版本仍是 MVP，有以下限制：

- 后端使用内存状态，服务重启会丢房间和游戏。
- 没有账号系统、匹配系统、好友、聊天、观战、排行榜。
- 断线 60 秒内可恢复；超时后长期 AI 托管策略还比较轻量。
- 多服务器部署、Redis 同步、数据库持久化未实现。
- 图鉴入口仍复用规则页，未独立实现完整图鉴。
- 移动端未做深度适配。
- 海克斯部分效果仍是标签/轻量效果，后续需要补完整数值闭环。

## Development Rules For Future Agents

1. 不要把游戏规则写进 React 组件。
2. 单机逻辑走 `gameStore`，联机逻辑走 `onlineStore + Socket.IO`。
3. 联机最终状态必须由服务端决定。
4. 新增联机操作时必须新增 ack、错误码或错误处理、服务端校验、测试。
5. 不要广播完整 `GameState` 给所有客户端。
6. 保持原创命名和美术风格，不使用真实金铲铲/LOL/TFT IP。
7. 修 bug 先写失败测试，再实现。
8. 完成前至少运行：

```bash
npm test
npm run build
```

9. 推送前检查：

```bash
git status --short --branch
```

## Useful Files

- `README.md`
- `docs/rules.md`
- `docs/online-mode.md`
- `docs/network-protocol.md`
- `docs/server-architecture.md`
- `docs/development-log.md`
- `src/types.ts`
- `shared/types/network.ts`
- `shared/protocol/events.ts`
- `server/src/managers/GameSessionManager.ts`
- `src/store/onlineStore.ts`
