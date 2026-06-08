import type { TileDefinition, TraitId } from "../types";

const numberedTraitMap: Record<number, TraitId[]> = {
  1: [],
  2: ["spritekin"],
  3: ["bloodblade"],
  4: ["mystic"],
  5: ["starvault"],
  6: ["swiftblade"],
  7: ["swiftblade", "starvault"],
  8: ["starvault", "shieldwall"],
  9: ["bloodblade", "swiftblade"]
};

function costForRank(rank: number): 1 | 2 | 3 | 4 | 5 {
  if (rank <= 2) return 1;
  if (rank <= 4) return 2;
  if (rank <= 6) return 3;
  if (rank <= 8) return 4;
  return 5;
}

function rarityForCost(cost: TileDefinition["cost"]): TileDefinition["rarity"] {
  if (cost === 1) return "common";
  if (cost === 2) return "rare";
  if (cost === 3) return "epic";
  return "legendary";
}

function createNumberedSuit(suit: "wan" | "tong" | "tiao", label: string): TileDefinition[] {
  return Array.from({ length: 9 }, (_, index) => {
    const rank = index + 1;
    const cost = costForRank(rank);

    return {
      id: `${suit}-${rank}`,
      name: `${rank}${label}`,
      suit,
      rank,
      cost,
      traits: numberedTraitMap[rank],
      maxCopies: 4,
      rarity: rarityForCost(cost)
    };
  });
}

export const tileDefinitions: TileDefinition[] = [
  ...createNumberedSuit("wan", "万"),
  ...createNumberedSuit("tong", "筒"),
  ...createNumberedSuit("tiao", "条"),
  {
    id: "wind-east",
    name: "东风",
    suit: "wind",
    cost: 2,
    traits: ["shieldwall"],
    maxCopies: 4,
    rarity: "rare"
  },
  {
    id: "wind-south",
    name: "南风",
    suit: "wind",
    cost: 2,
    traits: ["swiftblade"],
    maxCopies: 4,
    rarity: "rare"
  },
  {
    id: "wind-west",
    name: "西风",
    suit: "wind",
    cost: 3,
    traits: ["shieldwall"],
    maxCopies: 4,
    rarity: "epic"
  },
  {
    id: "wind-north",
    name: "北风",
    suit: "wind",
    cost: 3,
    traits: ["starvault"],
    maxCopies: 4,
    rarity: "epic"
  },
  {
    id: "dragon-red",
    name: "赤令",
    suit: "dragon",
    cost: 4,
    traits: ["bloodblade", "swiftblade"],
    maxCopies: 4,
    rarity: "legendary"
  },
  {
    id: "dragon-green",
    name: "青令",
    suit: "dragon",
    cost: 4,
    traits: ["spritekin", "starvault"],
    maxCopies: 4,
    rarity: "legendary"
  },
  {
    id: "dragon-white",
    name: "白令",
    suit: "dragon",
    cost: 5,
    traits: ["mystic", "starvault"],
    maxCopies: 4,
    rarity: "legendary"
  }
];
