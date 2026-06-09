# 音效设计说明

当前版本实现轻量音效系统和一条低音量循环 BGM，不包含多轨音乐、动态配乐或角色语音。

## 音效文件

音效资源放在 `public/sounds/`，文件名必须和下表一致。

当前版本的实际音效来自 Kenney Interface Sounds 1.0，许可证为 Creative Commons Zero (CC0)，可用于个人、教育和商业项目。下载页面为 https://kenney.nl/assets/interface-sounds，原始许可证文本保存在 `public/sounds/KENNEY_LICENSE.txt`。

BGM 来自 OpenGameArt 的 `relax_background1`，作者 joaquinton，许可证同样为 CC0。下载页面为 https://opengameart.org/content/relaxbackground1-0。该音乐无歌词，作为低音量循环背景音乐使用。

| 音效 | 文件 | 用途 | 建议音量 |
| --- | --- | --- | --- |
| UI 点击 | `ui-click.mp3` | 按钮点击、进入模式、打开设置 | 中低 |
| 买牌 | `tile-buy.mp3` | 商店买入牌 | 中 |
| 卖牌/弃牌 | `tile-sell.mp3` | 出售或弃掉牌 | 中 |
| 刷新商店 | `shop-refresh.mp3` | 刷新五张商店牌 | 中 |
| 锁定商店 | `shop-lock.mp3` | 锁定或解锁商店 | 中低 |
| 升级 | `level-up.mp3` | 等级提升成功 | 中高 |
| 整理手牌 | `hand-sort.mp3` | 自动排序手牌 | 中低 |
| 选择海克斯 | `augment-pick.mp3` | 选择海克斯强化 | 中高 |
| 结束回合 | `turn-end.mp3` | 玩家结束当前回合 | 中低 |
| 玩家胡牌 | `win-hu.mp3` | 当前玩家胡牌 | 高 |
| AI 胡牌 | `ai-hu.mp3` | 其他玩家或 AI 胡牌 | 中低 |
| 受到伤害 | `damage-hit.mp3` | 当前玩家结算扣血 | 中 |
| 游戏胜利 | `game-win.mp3` | 当前玩家成为最终胜者 | 高 |
| 游戏失败 | `game-lose.mp3` | 当前玩家被淘汰或未获胜 | 中 |
| 背景音乐 | `bgm-loop.mp3` | 全局轻音乐循环，无歌词 | 低 |

## 风格建议

- 以短促、清晰、低延迟反馈为主。
- 可以加入麻将牌碰撞、玉石、金属、轻科幻 UI 质感。
- 单个音效建议控制在 200ms 到 900ms。
- 避免长混响和强低频，防止多个操作连续触发时浑浊。
- `win-hu.mp3`、`game-win.mp3` 可以更有仪式感；`ai-hu.mp3` 应更轻，避免抢过玩家反馈。

## 播放规则

- 操作失败不播放成功音效。
- BGM 在玩家第一次点击或按键后启动，这是浏览器自动播放策略要求；之后低音量循环。
- 音效音量和 BGM 音量分开控制。
- 整理手牌使用较轻、较短的 `hand-sort.mp3`，避免连续整理时过吵。
- 结算音效根据当前玩家视角播放。
- 同一轮结算使用签名去重，避免联机重复收到 `gameState` 时重复播放。
- 结算音效延迟约 300ms，减少和结束回合音效重叠。

## 后续扩展

- 可增加背景音乐开关，独立于音效开关。
- 可增加不同城邦的环境音。
- 可为胡牌类型配置不同音效，例如清一色、七对子、碰碰胡。
