import { describe, expect, it } from "vitest";
import { tileDefinitions } from "../data/tiles";
import { createInitialTilePool, refreshShop } from "../engine/shopEngine";
import { createSeededRandom } from "../utils/random";

describe("shopEngine", () => {
  it("refreshes exactly five shop tiles and removes them from the pool", () => {
    const rng = createSeededRandom(12);
    const pool = createInitialTilePool(tileDefinitions);

    const result = refreshShop({ pool, level: 3, rng });

    expect(result.shop).toHaveLength(5);
    expect(result.pool).toHaveLength(pool.length - 5);
  });

  it("uses level odds so level 1 only rolls cost 1 tiles", () => {
    const rng = createSeededRandom(7);
    const pool = createInitialTilePool(tileDefinitions);

    const result = refreshShop({ pool, level: 1, rng });

    expect(result.shop.every((tile) => tile.definition.cost === 1)).toBe(true);
  });

  it("keeps triplet shop bias inside the rolled cost bucket", () => {
    const rng = createSeededRandom(7);
    const pool = createInitialTilePool(tileDefinitions);

    const result = refreshShop({ pool, level: 1, rng, tripletBias: 1 });

    expect(result.shop).toHaveLength(5);
    expect(result.shop.every((tile) => tile.definition.cost === 1)).toBe(true);
  });

  it("can bias shop results toward a focused suit", () => {
    const rng = createSeededRandom(9);
    const pool = createInitialTilePool(tileDefinitions);

    const result = refreshShop({ pool, level: 1, rng, suitBias: { suit: "wan", chance: 1 } });

    expect(result.shop).toHaveLength(5);
    expect(result.shop.every((tile) => tile.definition.suit === "wan")).toBe(true);
  });
});
