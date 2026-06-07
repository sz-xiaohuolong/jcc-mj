import { ArrowLeft } from "lucide-react";
import { augmentDefinitions } from "../data/augments";
import { cityDefinitions } from "../data/cities";
import { traitDefinitions } from "../data/traits";
import { useGameStore } from "../store/gameStore";

export function RulePage() {
  const goHome = useGameStore((state) => state.goHome);

  return (
    <main className="rules-screen">
      <button className="ghost-button" type="button" onClick={goHome}>
        <ArrowLeft size={17} />
        返回
      </button>
      <header className="rules-header">
        <p className="eyebrow">规则说明</p>
        <h1>麻将胡牌 + 自走棋运营</h1>
      </header>
      <section className="rules-grid">
        <article className="rule-card">
          <h2>胡牌</h2>
          <p>14 张牌，满足 4 组面子 + 1 组雀头即可胡牌。面子包括同花色连续三张顺子，或三张相同刻子。</p>
          <p>第一版额外支持七对子、碰碰胡、清一色，并把这些类型转换为结算伤害加成。</p>
        </article>
        <article className="rule-card">
          <h2>经济</h2>
          <p>每回合基础收入 5 金币，每 10 金币获得 1 利息，默认利息上限 5。金币用于买牌和刷新商店。</p>
        </article>
        <article className="rule-card">
          <h2>羁绊</h2>
          <div className="space-y-2">
            {traitDefinitions.map((trait) => (
              <p key={trait.id}>
                <strong>{trait.name}</strong>：{trait.description}
              </p>
            ))}
          </div>
        </article>
        <article className="rule-card">
          <h2>海克斯</h2>
          <div className="rules-list">
            {augmentDefinitions.map((augment) => (
              <span key={augment.id}>{augment.name}</span>
            ))}
          </div>
        </article>
        <article className="rule-card rule-card--wide">
          <h2>城邦</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {cityDefinitions.map((city) => (
              <p key={city.id}>
                <strong>{city.name}</strong>：{city.description}
              </p>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
