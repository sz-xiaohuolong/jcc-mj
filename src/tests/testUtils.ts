import { tileDefinitions } from "../data/tiles";
import type { TileDefinition } from "../types";

export function createTileSet(ids: string[]): TileDefinition[] {
  return ids.map((id) => {
    const definition = tileDefinitions.find((tile) => tile.id === id);

    if (!definition) {
      throw new Error(`Missing tile definition: ${id}`);
    }

    return definition;
  });
}
