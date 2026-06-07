import { Sparkles } from "lucide-react";
import type { ActiveTrait } from "../types";

export function TraitPanel({ traits }: { traits: ActiveTrait[] }) {
  return (
    <section className="side-panel">
      <div className="panel-title">
        <Sparkles size={17} />
        羁绊
      </div>
      <div className="space-y-2">
        {traits.map((trait) => (
          <div key={trait.id} className={`trait-chip ${trait.tier > 0 ? "trait-chip--active" : ""}`}>
            <div className="flex items-center justify-between">
              <strong>{trait.name}</strong>
              <span>
                {trait.count}/{trait.threshold || trait.count}
              </span>
            </div>
            <p>{trait.description}</p>
          </div>
        ))}
        {traits.length === 0 && <p className="text-sm text-slate-400">购买并整理手牌后会自动统计羁绊。</p>}
      </div>
    </section>
  );
}
