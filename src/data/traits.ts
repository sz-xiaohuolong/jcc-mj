import type { TraitDefinition } from "../types";

export const traitDefinitions: TraitDefinition[] = [
  {
    id: "shieldwall",
    name: "圣盾城",
    thresholds: [2, 4, 6],
    description: "听牌或接近成型时减免失败扣血。"
  },
  {
    id: "bloodblade",
    name: "血刃军",
    thresholds: [2, 4, 6],
    description: "刻子越多，胡牌伤害越高。"
  },
  {
    id: "spritekin",
    name: "小灵族",
    thresholds: [2, 4, 6],
    description: "对子构筑获得额外金币收益。"
  },
  {
    id: "starvault",
    name: "星穹",
    thresholds: [2, 4, 6],
    description: "提高高费牌在商店出现的权重。"
  },
  {
    id: "mystic",
    name: "秘术师",
    thresholds: [2, 4],
    description: "2 张时每回合首次刷新 -1 金币，4 张时每次刷新 -1 金币。"
  },
  {
    id: "swiftblade",
    name: "迅刃",
    thresholds: [2, 4],
    description: "每回合第一次刷新获得折扣。"
  }
];
