import type { TileDefinition } from "../types";

const suitOrder: Record<TileDefinition["suit"], number> = {
  wan: 1,
  tong: 2,
  tiao: 3,
  wind: 4,
  dragon: 5
};

export function sortTiles<T extends TileDefinition>(tiles: T[]): T[] {
  return [...tiles].sort((left, right) => {
    const suitDelta = suitOrder[left.suit] - suitOrder[right.suit];

    if (suitDelta !== 0) {
      return suitDelta;
    }

    return (left.rank ?? 0) - (right.rank ?? 0) || left.id.localeCompare(right.id);
  });
}
