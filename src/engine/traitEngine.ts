import { traitDefinitions } from "../data/traits";
import type { ActiveTrait, TileDefinition } from "../types";

export function calculateActiveTraits(tiles: TileDefinition[]): ActiveTrait[] {
  const counts = new Map<string, number>();

  for (const tile of tiles) {
    for (const trait of tile.traits) {
      counts.set(trait, (counts.get(trait) ?? 0) + 1);
    }
  }

  return traitDefinitions
    .map((trait) => {
      const count = counts.get(trait.id) ?? 0;
      const matchedThresholds = trait.thresholds.filter((threshold) => count >= threshold);
      const nextThreshold = trait.thresholds.find((threshold) => count < threshold);
      const threshold = nextThreshold ?? matchedThresholds.at(-1) ?? trait.thresholds[0] ?? count;

      return {
        id: trait.id,
        name: trait.name,
        count,
        tier: matchedThresholds.length,
        threshold,
        description: trait.description
      };
    })
    .filter((trait) => trait.count > 0);
}

export function getRefreshDiscount(activeTraits: ActiveTrait[], isFirstRefresh: boolean): number {
  const mysticTier = activeTraits.find((trait) => trait.id === "mystic")?.tier ?? 0;
  const swiftTier = activeTraits.find((trait) => trait.id === "swiftblade")?.tier ?? 0;
  const mysticDiscount = mysticTier >= 2 || (mysticTier >= 1 && isFirstRefresh) ? 1 : 0;
  const swiftDiscount = isFirstRefresh && swiftTier > 0 ? 1 : 0;

  return mysticDiscount + swiftDiscount;
}
