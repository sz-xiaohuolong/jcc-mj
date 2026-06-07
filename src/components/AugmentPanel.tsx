import { Gem } from "lucide-react";
import type { AugmentDefinition } from "../types";

export function AugmentPanel({ augments }: { augments: AugmentDefinition[] }) {
  return (
    <section className="side-panel">
      <div className="panel-title">
        <Gem size={17} />
        海克斯
      </div>
      <div className="space-y-2">
        {augments.map((augment) => (
          <div key={augment.id} className="augment-chip">
            <strong>{augment.name}</strong>
            <span>{augment.rarity}</span>
            <p>{augment.description}</p>
          </div>
        ))}
        {augments.length === 0 && <p className="text-sm text-slate-400">第 2 / 5 / 8 回合触发三选一。</p>}
      </div>
    </section>
  );
}
