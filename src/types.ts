export type Suit = "wan" | "tong" | "tiao" | "wind" | "dragon";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type TraitId = "shieldwall" | "bloodblade" | "spritekin" | "starvault" | "mystic" | "swiftblade";

export interface TileDefinition {
  id: string;
  name: string;
  suit: Suit;
  rank?: number;
  cost: 1 | 2 | 3 | 4 | 5;
  traits: TraitId[];
  maxCopies: number;
  rarity: Rarity;
}

export interface TileInstance {
  instanceId: string;
  tileId: string;
}

export interface TileWithDefinition extends TileInstance {
  definition: TileDefinition;
}

export interface TraitDefinition {
  id: TraitId;
  name: string;
  description: string;
  thresholds: number[];
}

export interface ActiveTrait {
  id: TraitId;
  name: string;
  count: number;
  tier: number;
  threshold: number;
  description: string;
}

export type AugmentRarity = "silver" | "gold" | "prismatic";

export interface AugmentDefinition {
  id: string;
  name: string;
  rarity: AugmentRarity;
  description: string;
  tags: string[];
}

export interface CityDefinition {
  id: string;
  name: string;
  description: string;
  modifiers: {
    startingGold?: number;
    damageTakenMultiplier?: number;
    sequenceDamageBonus?: number;
    tripletShopBias?: number;
    highCostShopBias?: number;
    interestCapBonus?: number;
  };
}

export interface WinningPattern {
  id: "standard" | "seven-pairs" | "all-triplets" | "pure-suit";
  name: string;
  damageBonus: number;
}

export interface PlayerState {
  id: string;
  name: string;
  isAI: boolean;
  hp: number;
  gold: number;
  level: number;
  xp: number;
  handTiles: TileInstance[];
  benchTiles: TileInstance[];
  discardTiles: TileInstance[];
  augments: AugmentDefinition[];
  activeTraits: ActiveTrait[];
  isAlive: boolean;
  isWinning: boolean;
  lockedShop: boolean;
  hasRefreshedThisRound: boolean;
}

export interface GameLog {
  id: string;
  round: number;
  message: string;
  tone?: "info" | "good" | "warn" | "danger";
}

export interface SettlementEntry {
  playerId: string;
  playerName: string;
  hpBefore: number;
  hpAfter: number;
  damage: number;
  status: "winning" | "ready" | "close" | "unformed";
  patterns: WinningPattern[];
}

export type GamePhase =
  | "home"
  | "city_select"
  | "augment_select"
  | "preparation"
  | "shop"
  | "discard"
  | "settlement"
  | "game_over";

export interface GameState {
  phase: GamePhase;
  round: number;
  stage: number;
  players: PlayerState[];
  currentPlayerId: string;
  shop: TileInstance[];
  city: CityDefinition | null;
  tilePool: TileInstance[];
  logs: GameLog[];
  augmentChoices: AugmentDefinition[];
  lastSettlement: SettlementEntry[];
  winnerId: string | null;
}

export interface RandomSource {
  next(): number;
}
