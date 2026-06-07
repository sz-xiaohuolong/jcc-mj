import { cityDefinitions } from "../data/cities";
import type { CityDefinition, RandomSource } from "../types";
import { pickOne } from "../utils/random";

export function chooseRandomCity(rng: RandomSource): CityDefinition {
  return pickOne(cityDefinitions, rng);
}
