import type { CityDefinition } from "../types";

export const cityDefinitions: CityDefinition[] = [
  {
    id: "golden-port",
    name: "黄金港口",
    description: "开局额外获得 8 金币，利息上限提高 1。",
    modifiers: { startingGold: 8, interestCapBonus: 1 }
  },
  {
    id: "sequence-city",
    name: "顺子之城",
    description: "含顺子结构的标准胡牌额外造成伤害。",
    modifiers: { sequenceDamageBonus: 4 }
  },
  {
    id: "triplet-mine",
    name: "刻子矿山",
    description: "商店更偏向血刃军和刻子构筑牌。",
    modifiers: { tripletShopBias: 0.18 }
  },
  {
    id: "quiet-valley",
    name: "静谧山谷",
    description: "所有失败扣血降低 20%。",
    modifiers: { damageTakenMultiplier: 0.8 }
  },
  {
    id: "star-market",
    name: "星界集市",
    description: "高费牌出现权重提高。",
    modifiers: { highCostShopBias: 0.15 }
  }
];
