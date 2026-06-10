import { describe, expect, it } from "vitest";
import { applyRatingDelta, calculateRatingDelta, onlineHumanMultiplier, tierForPoints } from "../../shared/rating/ratingRules";

describe("ratingRules", () => {
  it("calculates solo rank deltas", () => {
    expect(calculateRatingDelta({ mode: "solo", rank: 1 })).toBe(30);
    expect(calculateRatingDelta({ mode: "solo", rank: 2 })).toBe(10);
    expect(calculateRatingDelta({ mode: "solo", rank: 3 })).toBe(-10);
    expect(calculateRatingDelta({ mode: "solo", rank: 4 })).toBe(-20);
  });

  it("calculates online rank deltas with human multipliers", () => {
    expect(onlineHumanMultiplier(4)).toBe(1);
    expect(onlineHumanMultiplier(3)).toBe(0.8);
    expect(onlineHumanMultiplier(2)).toBe(0.5);
    expect(onlineHumanMultiplier(1)).toBe(0);
    expect(calculateRatingDelta({ mode: "online", rank: 1, humanPlayerCount: 4 })).toBe(40);
    expect(calculateRatingDelta({ mode: "online", rank: 2, humanPlayerCount: 3 })).toBe(16);
    expect(calculateRatingDelta({ mode: "online", rank: 4, humanPlayerCount: 2 })).toBe(-10);
    expect(calculateRatingDelta({ mode: "online", rank: 1, humanPlayerCount: 1 })).toBe(0);
  });

  it("clamps points to zero", () => {
    expect(applyRatingDelta(5, -20)).toBe(0);
    expect(applyRatingDelta(10, 20)).toBe(30);
  });

  it("maps points to tiers", () => {
    expect(tierForPoints(0)).toBe("青铜雀士");
    expect(tierForPoints(100)).toBe("白银雀士");
    expect(tierForPoints(300)).toBe("黄金雀士");
    expect(tierForPoints(600)).toBe("铂金雀士");
    expect(tierForPoints(1000)).toBe("钻石雀士");
    expect(tierForPoints(1500)).toBe("棋圣雀王");
  });
});
