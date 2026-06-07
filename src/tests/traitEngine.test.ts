import { describe, expect, it } from "vitest";
import { createTileSet } from "./testUtils";
import { calculateActiveTraits } from "../engine/traitEngine";

describe("traitEngine", () => {
  it("counts traits from hand and activates configured thresholds", () => {
    const tiles = createTileSet(["wan-1", "wan-2", "wan-3", "tong-1", "tong-2", "tiao-1"]);

    const activeTraits = calculateActiveTraits(tiles);
    const bloodblade = activeTraits.find((trait) => trait.id === "bloodblade");

    expect(bloodblade?.count).toBeGreaterThanOrEqual(2);
    expect(bloodblade?.tier).toBeGreaterThanOrEqual(1);
  });
});
