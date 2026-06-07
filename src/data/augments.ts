import type { AugmentDefinition } from "../types";

export const augmentDefinitions: AugmentDefinition[] = [
  { id: "flowing-sequence", name: "顺水推舟", rarity: "silver", tags: ["sequence", "gold"], description: "每拥有一组顺子候选，结算时额外获得 1 金币。" },
  { id: "triplet-urgency", name: "刻不容缓", rarity: "gold", tags: ["triplet", "damage"], description: "碰碰胡或含刻子的胡牌额外造成 5 点伤害。" },
  { id: "pair-master", name: "雀头大师", rarity: "gold", tags: ["pair"], description: "第一次结算时，如果只缺雀头，视为听牌并减免伤害。" },
  { id: "suit-focus", name: "花色专精", rarity: "silver", tags: ["suit", "shop"], description: "商店更容易出现当前手牌最多的数牌花色。" },
  { id: "last-stand", name: "锁血运营", rarity: "gold", tags: ["defense"], description: "生命值低于 35 时受到伤害降低 30%。" },
  { id: "golden-ticket", name: "黄金门票", rarity: "gold", tags: ["shop", "economy"], description: "刷新商店有 25% 概率返还刷新费用。" },
  { id: "fast-form", name: "快速成型", rarity: "silver", tags: ["opening"], description: "选择后立即获得 2 张同花色低费牌。" },
  { id: "trait-tracker", name: "羁绊追踪者", rarity: "silver", tags: ["trait", "economy"], description: "激活 3 个以上羁绊时，每回合额外获得 2 金币。" },
  { id: "roll-fever", name: "赌狗狂欢", rarity: "gold", tags: ["shop"], description: "刷新费用 -1，升级费用 +2。" },
  { id: "stable-econ", name: "稳健运营", rarity: "silver", tags: ["economy"], description: "利息上限提高 2。" },
  { id: "blessed-start", name: "天胡之姿", rarity: "prismatic", tags: ["opening"], description: "选择后立即获得 3 张高协同牌。" },
  { id: "final-ready", name: "终极听牌", rarity: "prismatic", tags: ["ready", "damage"], description: "听牌时下一次胡牌伤害提高 8 点。" }
];
