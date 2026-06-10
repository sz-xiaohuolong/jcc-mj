import type { RatingMode } from "./ratingTypes";

const soloRankDeltas: Record<number, number> = {
  1: 30,
  2: 10,
  3: -10,
  4: -20
};

const onlineRankDeltas: Record<number, number> = {
  1: 40,
  2: 20,
  3: 0,
  4: -20
};

export function tierForPoints(points: number): string {
  if (points >= 1500) return "棋圣雀王";
  if (points >= 1000) return "钻石雀士";
  if (points >= 600) return "铂金雀士";
  if (points >= 300) return "黄金雀士";
  if (points >= 100) return "白银雀士";
  return "青铜雀士";
}

export function onlineHumanMultiplier(humanPlayerCount: number): number {
  if (humanPlayerCount >= 4) return 1;
  if (humanPlayerCount === 3) return 0.8;
  if (humanPlayerCount === 2) return 0.5;
  return 0;
}

export function baseRankDelta(mode: RatingMode, rank: number): number {
  const table = mode === "solo" ? soloRankDeltas : onlineRankDeltas;
  return table[Math.min(4, Math.max(1, rank))] ?? 0;
}

export function calculateRatingDelta({
  mode,
  rank,
  humanPlayerCount
}: {
  mode: RatingMode;
  rank: number;
  humanPlayerCount?: number;
}): number {
  const baseDelta = baseRankDelta(mode, rank);
  const multiplier = mode === "online" ? onlineHumanMultiplier(humanPlayerCount ?? 0) : 1;
  const delta = Math.round(baseDelta * multiplier);

  return rank >= 4 ? Math.min(0, delta) : delta;
}

export function applyRatingDelta(points: number, delta: number): number {
  return Math.max(0, points + delta);
}
