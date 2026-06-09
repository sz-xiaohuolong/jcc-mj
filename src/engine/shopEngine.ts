import type { RandomSource, Suit, TileDefinition, TileInstance, TileWithDefinition } from "../types";
import { randomInt, shuffle } from "../utils/random";

const levelOdds: Record<number, Array<{ cost: TileDefinition["cost"]; chance: number }>> = {
  1: [{ cost: 1, chance: 1 }],
  2: [
    { cost: 1, chance: 0.8 },
    { cost: 2, chance: 0.2 }
  ],
  3: [
    { cost: 1, chance: 0.6 },
    { cost: 2, chance: 0.3 },
    { cost: 3, chance: 0.1 }
  ],
  4: [
    { cost: 1, chance: 0.45 },
    { cost: 2, chance: 0.35 },
    { cost: 3, chance: 0.2 }
  ],
  5: [
    { cost: 1, chance: 0.3 },
    { cost: 2, chance: 0.35 },
    { cost: 3, chance: 0.25 },
    { cost: 4, chance: 0.1 }
  ],
  6: [
    { cost: 1, chance: 0.2 },
    { cost: 2, chance: 0.3 },
    { cost: 3, chance: 0.3 },
    { cost: 4, chance: 0.15 },
    { cost: 5, chance: 0.05 }
  ]
};

export function createInitialTilePool(definitions: TileDefinition[]): TileWithDefinition[] {
  return definitions.flatMap((definition) =>
    Array.from({ length: definition.maxCopies }, (_, copyIndex) => ({
      instanceId: `${definition.id}#${copyIndex + 1}`,
      tileId: definition.id,
      definition
    }))
  );
}

function rollCost(level: number, rng: RandomSource, highCostBias = 0): TileDefinition["cost"] {
  const odds = levelOdds[Math.min(6, Math.max(1, level))];
  const roll = rng.next();
  let cumulative = 0;

  for (const entry of odds) {
    const adjusted = entry.cost >= 4 ? entry.chance + highCostBias : entry.chance;
    cumulative += adjusted;

    if (roll <= cumulative) {
      return entry.cost;
    }
  }

  return odds.at(-1)?.cost ?? 1;
}

export function refreshShop({
  pool,
  level,
  rng,
  highCostBias = 0,
  tripletBias = 0,
  suitBias
}: {
  pool: TileWithDefinition[];
  level: number;
  rng: RandomSource;
  highCostBias?: number;
  tripletBias?: number;
  suitBias?: { suit: Suit; chance: number };
}): { shop: TileWithDefinition[]; pool: TileWithDefinition[] } {
  const nextPool = [...pool];
  const shop: TileWithDefinition[] = [];

  for (let slot = 0; slot < 5 && nextPool.length > 0; slot += 1) {
    const desiredCost = rollCost(level, rng, highCostBias);
    let candidates = nextPool.filter((tile) => tile.definition.cost === desiredCost);

    if (tripletBias > 0 && rng.next() < tripletBias) {
      const bloodblade = candidates.filter((tile) => tile.definition.traits.includes("bloodblade"));
      candidates = bloodblade.length > 0 ? bloodblade : candidates;
    }

    if (suitBias && rng.next() < suitBias.chance) {
      const matchingSuit = candidates.filter((tile) => tile.definition.suit === suitBias.suit);
      candidates = matchingSuit.length > 0 ? matchingSuit : candidates;
    }

    if (candidates.length === 0) {
      candidates = nextPool;
    }

    const picked = candidates[randomInt(rng, candidates.length)];
    const poolIndex = nextPool.findIndex((tile) => tile.instanceId === picked.instanceId);
    shop.push(picked);
    nextPool.splice(poolIndex, 1);
  }

  return { shop, pool: nextPool };
}

export function drawTiles(pool: TileWithDefinition[], count: number, rng: RandomSource): {
  drawn: TileInstance[];
  pool: TileWithDefinition[];
} {
  const shuffled = shuffle(pool, rng);
  const drawn = shuffled.slice(0, count).map(({ instanceId, tileId }) => ({ instanceId, tileId }));
  const drawnIds = new Set(drawn.map((tile) => tile.instanceId));

  return {
    drawn,
    pool: pool.filter((tile) => !drawnIds.has(tile.instanceId))
  };
}

export function calculateInterest(gold: number, cap = 5): number {
  return Math.min(cap, Math.floor(gold / 10));
}
