import { describe, expect, it } from "vitest";
import { createTileSet } from "./testUtils";
import { calculateActiveTraits, getRefreshDiscount } from "../engine/traitEngine";
import type { ActiveTrait } from "../types";

describe("traitEngine", () => {
  it("counts traits from hand and activates configured thresholds", () => {
    const tiles = createTileSet(["wan-3", "tong-3", "tiao-3", "wan-7", "tong-7", "tiao-7"]);

    const activeTraits = calculateActiveTraits(tiles);
    const bloodblade = activeTraits.find((trait) => trait.id === "bloodblade");

    expect(bloodblade?.count).toBeGreaterThanOrEqual(2);
    expect(bloodblade?.tier).toBeGreaterThanOrEqual(1);
  });

  it("shows the next threshold for traits below their first activation", () => {
    const tiles = createTileSet(["wan-4"]);

    const activeTraits = calculateActiveTraits(tiles);
    const mystic = activeTraits.find((trait) => trait.id === "mystic");

    expect(mystic?.count).toBe(1);
    expect(mystic?.threshold).toBe(2);
    expect(mystic?.tier).toBe(0);
  });

  it("gives mystic a first-refresh discount at 2 tiles and persistent discount at 4 tiles", () => {
    const baseMystic: ActiveTrait = {
      id: "mystic",
      name: "秘术师",
      count: 2,
      tier: 1,
      threshold: 4,
      description: "降低刷新费用。"
    };

    expect(getRefreshDiscount([baseMystic], true)).toBe(1);
    expect(getRefreshDiscount([baseMystic], false)).toBe(0);
    expect(getRefreshDiscount([{ ...baseMystic, count: 4, tier: 2 }], true)).toBe(1);
    expect(getRefreshDiscount([{ ...baseMystic, count: 4, tier: 2 }], false)).toBe(1);
  });
});
