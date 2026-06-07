import { describe, expect, it } from "vitest";
import { createTileSet } from "./testUtils";
import {
  estimateDistanceToWin,
  getWinningPatterns,
  isAllTriplets,
  isPureSuit,
  isSevenPairs,
  isWinningHand
} from "../engine/huChecker";

describe("huChecker", () => {
  it("detects a standard 4 melds and 1 pair winning hand", () => {
    const tiles = createTileSet([
      "wan-1", "wan-2", "wan-3",
      "wan-3", "wan-4", "wan-5",
      "tong-2", "tong-3", "tong-4",
      "tiao-7", "tiao-7", "tiao-7",
      "dragon-red", "dragon-red"
    ]);

    expect(isWinningHand(tiles)).toBe(true);
    expect(getWinningPatterns(tiles).map((pattern) => pattern.id)).toContain("standard");
  });

  it("detects seven pairs", () => {
    const tiles = createTileSet([
      "wan-1", "wan-1",
      "wan-3", "wan-3",
      "tong-2", "tong-2",
      "tong-5", "tong-5",
      "tiao-4", "tiao-4",
      "tiao-9", "tiao-9",
      "wind-east", "wind-east"
    ]);

    expect(isSevenPairs(tiles)).toBe(true);
    expect(isWinningHand(tiles)).toBe(true);
  });

  it("detects all triplets", () => {
    const tiles = createTileSet([
      "wan-2", "wan-2", "wan-2",
      "tong-4", "tong-4", "tong-4",
      "tiao-6", "tiao-6", "tiao-6",
      "dragon-green", "dragon-green", "dragon-green",
      "wind-west", "wind-west"
    ]);

    expect(isAllTriplets(tiles)).toBe(true);
    expect(getWinningPatterns(tiles).map((pattern) => pattern.id)).toContain("all-triplets");
  });

  it("detects pure suit for numbered tiles", () => {
    const tiles = createTileSet([
      "wan-1", "wan-2", "wan-3",
      "wan-3", "wan-4", "wan-5",
      "wan-5", "wan-6", "wan-7",
      "wan-7", "wan-8", "wan-9",
      "wan-9", "wan-9"
    ]);

    expect(isPureSuit(tiles)).toBe(true);
    expect(getWinningPatterns(tiles).map((pattern) => pattern.id)).toContain("pure-suit");
  });

  it("estimates a lower distance for a near hand than scattered tiles", () => {
    const near = createTileSet([
      "wan-1", "wan-2", "wan-3",
      "wan-3", "wan-4", "wan-5",
      "tong-2", "tong-3", "tong-4",
      "tiao-7", "tiao-7", "tiao-7",
      "dragon-red"
    ]);
    const far = createTileSet([
      "wan-1", "wan-4", "wan-8",
      "tong-2", "tong-6", "tong-9",
      "tiao-1", "tiao-5", "tiao-8",
      "wind-east", "wind-south", "dragon-red",
      "dragon-green"
    ]);

    expect(estimateDistanceToWin(near)).toBeLessThan(estimateDistanceToWin(far));
  });
});
