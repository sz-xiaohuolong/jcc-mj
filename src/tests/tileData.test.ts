import { describe, expect, it } from "vitest";
import { tileDefinitions } from "../data/tiles";

describe("tile data", () => {
  it("keeps low-cost tiles from carrying too many traits", () => {
    for (const tile of tileDefinitions) {
      if (tile.cost <= 2) {
        expect(tile.traits.length, tile.name).toBeLessThanOrEqual(1);
      }
    }
  });

  it("allows only high-cost tiles to carry two traits", () => {
    for (const tile of tileDefinitions) {
      if (tile.traits.length >= 2) {
        expect(tile.cost, tile.name).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
