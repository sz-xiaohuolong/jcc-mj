import type { RandomSource } from "../types";

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  return {
    next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    }
  };
}

export function randomInt(rng: RandomSource, maxExclusive: number): number {
  return Math.floor(rng.next() * maxExclusive);
}

export function pickOne<T>(items: T[], rng: RandomSource): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }

  return items[randomInt(rng, items.length)];
}

export function shuffle<T>(items: T[], rng: RandomSource): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}
