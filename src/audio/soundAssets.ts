export const soundAssets = {
  uiClick: "/sounds/ui-click.mp3",
  tileBuy: "/sounds/tile-buy.mp3",
  tileSell: "/sounds/tile-sell.mp3",
  shopRefresh: "/sounds/shop-refresh.mp3",
  shopLock: "/sounds/shop-lock.mp3",
  levelUp: "/sounds/level-up.mp3",
  handSort: "/sounds/hand-sort.mp3",
  augmentPick: "/sounds/augment-pick.mp3",
  turnEnd: "/sounds/turn-end.mp3",
  winHu: "/sounds/win-hu.mp3",
  aiHu: "/sounds/ai-hu.mp3",
  damageHit: "/sounds/damage-hit.mp3",
  gameWin: "/sounds/game-win.mp3",
  gameLose: "/sounds/game-lose.mp3"
} as const;

export const musicAssets = {
  bgmLoop: "/sounds/bgm-loop.mp3"
} as const;

export type SoundKey = keyof typeof soundAssets;
export type MusicKey = keyof typeof musicAssets;
