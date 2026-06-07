# 羁绊麻将 / 金铲铲麻将

一个 Web 单机策略构筑小游戏 MVP：用麻将基础胡牌作为胜利目标，用商店、金币、等级、羁绊、海克斯和城邦组成回合制构筑循环。

本项目只借鉴自走棋机制，不使用《金铲铲之战》《英雄联盟》《云顶之弈》的真实角色、图标、羁绊名或装备素材。

## 技术栈

- React + TypeScript + Vite
- Zustand 状态管理
- Tailwind CSS + 自定义 CSS 游戏 UI
- Framer Motion 轻量弹窗动效
- Vitest 规则测试

## 启动方式

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`

也可以分别启动：

```bash
npm run dev:client
npm run dev:server
```

测试与构建：

```bash
npm test
npm run build
```

## 玩法说明

1. 首页点击“开始游戏”，系统随机城邦并初始化 1 名玩家和 3 名 AI。
2. 每回合玩家看到 5 张商店牌，可以购买、刷新、锁定、整理、弃牌或出售备牌。
3. 手牌达到 14 张并满足胡牌结构时，结算会识别胡牌类型。
4. 第 2 / 5 / 8 回合触发海克斯三选一。
5. 回合结束后 AI 自动行动，系统结算胡牌、羁绊、海克斯、城邦与扣血。
6. 生命值归零淘汰，最后存活者获胜。

## 当前功能

- 单机模式和联机模式入口。
- 基础胡牌：4 组面子 + 1 组雀头。
- 扩展胡牌：七对子、碰碰胡、清一色。
- 商店刷新 5 张牌，按等级概率抽取费用。
- 金币收入、利息、购买、刷新、出售。
- 6 个原创羁绊：圣盾城、血刃军、小灵族、星穹、秘术师、迅刃。
- 12 个原创海克斯。
- 5 个原创城邦。
- 规则评分 AI：购买高价值牌、必要时刷新、超限弃牌。
- 首页、游戏主界面、规则页、海克斯弹窗、结算弹窗。
- 联机 MVP：
  - 创建 / 加入房间
  - 房间号复制
  - 玩家准备
  - 房主开始
  - 不足 4 人 AI 补位
  - 服务端权威状态
  - 每名玩家独立私有商店 / 手牌视图
  - Socket.IO ack 错误返回
  - 60 秒重连窗口
  - 服务端倒计时广播和超时结算

## 目录结构

```text
src/
├── data/          # 静态配置
├── engine/        # 纯规则逻辑
├── store/         # Zustand 状态与 action 编排
├── components/    # UI 组件
├── pages/         # 页面
├── utils/         # 随机数、排序等工具
└── tests/         # Vitest 测试
server/
├── src/managers/  # Room/Game/Connection 管理器
├── src/socket/    # Socket.IO 事件处理
└── src/tests/     # 服务端测试
shared/
├── protocol/      # Socket 事件名和事件类型
└── types/         # 网络视图和 payload 类型
```

## 参考与设计取舍

- GitHub 参考检索时关注了开源 auto chess / mahjong 项目的分层方向，例如 [creature-chess](https://github.com/Jameskmonger/creature-chess) 和 [GitHub mahjong topic](https://github.com/topics/mahjong)。
- 第一版使用 React DOM UI，而不是 Canvas/Phaser，原因是 MVP 重点是规则跑通和可维护界面。
- 胡牌判定、商店、羁绊、AI 都放在 `src/engine`，UI 不直接实现规则。

## 后续计划

- 更准确的向听数算法。
- 玩家升级经验与等级购买。
- 更完整的锁店、独立牌池和 AI 私有商店。
- 更多结算日志解释和数值调平。
- 图鉴页独立化。
- 吃、碰、杠和更多番型。
- Redis / 数据库 / 账号系统 / 排行榜。
